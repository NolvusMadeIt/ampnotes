import { mkdirSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import Database from 'better-sqlite3'
import { app } from 'electron'
import { APP_DB_NAME, MIGRATION_TABLE, TEMPLATE_SEED_VERSION } from './schema'
import { seedSystemTemplates } from './repos/templateRepo'

export type SqliteDatabase = Database.Database

let dbInstance: SqliteDatabase | null = null

function getDataDirectory(): string {
  if (process.env.AMP_DB_PATH) {
    return dirname(process.env.AMP_DB_PATH)
  }

  try {
    if (app?.isReady()) {
      return app.getPath('userData')
    }
  } catch {
    // Ignore app path resolution failures in tests.
  }

  return resolve(process.cwd(), '.ampnotes-data')
}

function getDatabasePath(): string {
  if (process.env.AMP_DB_PATH) {
    return process.env.AMP_DB_PATH
  }

  return join(getDataDirectory(), APP_DB_NAME)
}

function runMigrations(db: SqliteDatabase): void {
  db.exec(
    `CREATE TABLE IF NOT EXISTS ${MIGRATION_TABLE} (id TEXT PRIMARY KEY, applied_at TEXT NOT NULL)`
  )

  const appliedStmt = db.prepare(`SELECT id FROM ${MIGRATION_TABLE} WHERE id = ?`)
  const insertStmt = db.prepare(`INSERT INTO ${MIGRATION_TABLE} (id, applied_at) VALUES (?, ?)`)

  const migrationsDir = resolve(process.cwd(), 'src/main/db/migrations')
  const files = readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b))

  for (const file of files) {
    const alreadyApplied = appliedStmt.get(file)
    if (alreadyApplied) {
      continue
    }

    const sql = readFileSync(join(migrationsDir, file), 'utf8')
    db.exec(sql)
    insertStmt.run(file, new Date().toISOString())
  }
}

function ensureTemplateSeed(db: SqliteDatabase): void {
  const now = new Date().toISOString()
  db.prepare(
    `INSERT OR IGNORE INTO profiles
      (id, display_name, avatar_seed, preferred_theme, created_at, updated_at, last_signed_in_at)
     VALUES ('__system__', 'System', 'S', 'system', ?, ?, NULL)`
  ).run(now, now)

  const existing = db
    .prepare('SELECT value_json FROM settings WHERE profile_id = ? AND key = ?')
    .get('__system__', TEMPLATE_SEED_VERSION) as { value_json: string } | undefined

  if (existing) {
    return
  }

  seedSystemTemplates(db)

  db.prepare(
    'INSERT OR REPLACE INTO settings (profile_id, key, value_json, updated_at) VALUES (?, ?, ?, ?)'
  ).run('__system__', TEMPLATE_SEED_VERSION, JSON.stringify({ seeded: true }), now)
}

export function getDb(): SqliteDatabase {
  if (dbInstance) {
    return dbInstance
  }

  const dbPath = getDatabasePath()
  const dir = dirname(dbPath)
  mkdirSync(dir, { recursive: true })

  const db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  runMigrations(db)
  ensureTemplateSeed(db)

  dbInstance = db
  return db
}

export function closeDb(): void {
  if (dbInstance) {
    dbInstance.close()
    dbInstance = null
  }
}
