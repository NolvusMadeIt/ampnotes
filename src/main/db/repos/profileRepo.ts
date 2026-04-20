import { v4 as uuidv4 } from 'uuid'
import type { SqliteDatabase } from '../client'
import type { ProfileDTO, SessionDTO, ThemeMode } from '@shared/types'

interface ProfileRow {
  id: string
  display_name: string
  avatar_seed: string
  preferred_theme: ThemeMode
  created_at: string
  updated_at: string
  last_signed_in_at: string | null
}

interface SessionRow {
  id: string
  profile_id: string
  active: number
  signed_in_at: string
  signed_out_at: string | null
}

const SESSION_TTL_MS = 48 * 60 * 60 * 1000

function toProfileDTO(row: ProfileRow): ProfileDTO {
  return {
    id: row.id,
    displayName: row.display_name,
    avatarSeed: row.avatar_seed,
    preferredTheme: row.preferred_theme,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastSignedInAt: row.last_signed_in_at
  }
}

function toSessionDTO(row: SessionRow): SessionDTO {
  return {
    id: row.id,
    profileId: row.profile_id,
    active: row.active === 1,
    signedInAt: row.signed_in_at,
    signedOutAt: row.signed_out_at
  }
}

export class ProfileRepo {
  constructor(private readonly db: SqliteDatabase) {}

  listProfiles(): ProfileDTO[] {
    const rows = this.db
      .prepare('SELECT * FROM profiles ORDER BY last_signed_in_at DESC, created_at ASC')
      .all() as ProfileRow[]
    return rows.map(toProfileDTO)
  }

  getProfileById(profileId: string): ProfileDTO | null {
    const row = this.db.prepare('SELECT * FROM profiles WHERE id = ?').get(profileId) as
      | ProfileRow
      | undefined
    return row ? toProfileDTO(row) : null
  }

  createProfile(displayName: string): ProfileDTO {
    const now = new Date().toISOString()
    const id = uuidv4()
    const avatarSeed = displayName.slice(0, 1).toUpperCase() || 'A'

    this.db
      .prepare(
        `INSERT INTO profiles (id, display_name, avatar_seed, preferred_theme, created_at, updated_at)
         VALUES (?, ?, ?, 'system', ?, ?)`
      )
      .run(id, displayName.trim(), avatarSeed, now, now)

    const created = this.getProfileById(id)
    if (!created) {
      throw new Error('Failed to create profile')
    }

    return created
  }

  signIn(profileId: string): { profile: ProfileDTO; session: SessionDTO } {
    const profile = this.getProfileById(profileId)
    if (!profile) {
      throw new Error('Profile not found')
    }

    const now = new Date().toISOString()
    this.db.prepare('UPDATE sessions SET active = 0, signed_out_at = ? WHERE active = 1').run(now)

    const sessionId = uuidv4()
    this.db
      .prepare(
        `INSERT INTO sessions (id, profile_id, active, signed_in_at, signed_out_at)
         VALUES (?, ?, 1, ?, NULL)`
      )
      .run(sessionId, profileId, now)

    this.db
      .prepare('UPDATE profiles SET last_signed_in_at = ?, updated_at = ? WHERE id = ?')
      .run(now, now, profileId)

    const active = this.getActiveSession()
    if (!active) {
      throw new Error('Failed to create session')
    }

    return { profile: this.getProfileById(profileId)!, session: active }
  }

  signOut(): void {
    const now = new Date().toISOString()
    this.db.prepare('UPDATE sessions SET active = 0, signed_out_at = ? WHERE active = 1').run(now)
  }

  getActiveSession(): SessionDTO | null {
    const row = this.db
      .prepare(
        'SELECT * FROM sessions WHERE active = 1 ORDER BY signed_in_at DESC LIMIT 1'
      )
      .get() as SessionRow | undefined
    if (!row) {
      return null
    }

    const signedInAtMs = Date.parse(row.signed_in_at)
    const isExpired =
      !Number.isFinite(signedInAtMs) || Date.now() - signedInAtMs > SESSION_TTL_MS

    if (isExpired) {
      const now = new Date().toISOString()
      this.db
        .prepare(
          `UPDATE sessions
           SET active = 0,
               signed_out_at = COALESCE(signed_out_at, ?)
           WHERE id = ?`
        )
        .run(now, row.id)
      return null
    }

    return toSessionDTO(row)
  }

  updateTheme(profileId: string, theme: ThemeMode): ProfileDTO {
    const now = new Date().toISOString()
    this.db
      .prepare('UPDATE profiles SET preferred_theme = ?, updated_at = ? WHERE id = ?')
      .run(theme, now, profileId)

    const profile = this.getProfileById(profileId)
    if (!profile) {
      throw new Error('Profile not found')
    }

    return profile
  }
}
