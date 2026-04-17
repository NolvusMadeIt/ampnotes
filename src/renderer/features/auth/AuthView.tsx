import { useState } from 'react'
import type { ProfileDTO } from '@shared/types'
import { Button } from '@renderer/components/ui/Button'

interface AuthViewProps {
  profiles: ProfileDTO[]
  onCreateAndSignIn: (displayName: string) => Promise<void>
  onSignIn: (profileId: string) => Promise<void>
}

export function AuthView({ profiles, onCreateAndSignIn, onSignIn }: AuthViewProps) {
  const [displayName, setDisplayName] = useState('')
  const [busy, setBusy] = useState(false)

  return (
    <main className="grid h-full place-items-center px-6">
      <div className="w-full max-w-2xl rounded-2xl border border-line/20 bg-surface p-8 shadow-panel">
        <p className="mono-meta mb-2 text-xs uppercase tracking-[0.24em] text-muted">AMP</p>
        <h1 className="editorial-heading mb-2 text-5xl font-semibold">Adaptive Markdown Prompts</h1>
        <p className="mb-8 max-w-xl text-muted">
          Save, organize, and refine prompts in one desktop-first workspace.
        </p>

        <div className="mb-8 space-y-3">
          <label className="block text-sm font-medium text-text" htmlFor="profile-name">
            Create local profile
          </label>
          <div className="flex gap-3">
            <input
              id="profile-name"
              className="h-11 flex-1 rounded-lg border border-line/20 bg-surface2 px-3 outline-none focus:border-accent/10"
              placeholder="Display name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
            />
            <Button
              variant="primary"
              disabled={busy || !displayName.trim()}
              onClick={async () => {
                setBusy(true)
                try {
                  await onCreateAndSignIn(displayName)
                  setDisplayName('')
                } finally {
                  setBusy(false)
                }
              }}
            >
              Create & Sign In
            </Button>
          </div>
        </div>

        <div>
          <p className="mb-3 text-sm font-medium text-text">Or continue with an existing local profile</p>
          {profiles.length === 0 ? (
            <div className="rounded-lg border border-dashed border-line/20 bg-surface2 p-4 text-sm text-muted">
              No profiles yet. Create one above.
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {profiles.map((profile) => (
                <button
                  key={profile.id}
                  className="flex items-center justify-between rounded-lg border border-line/20 bg-surface2 px-4 py-3 text-left transition-colors hover:border-accent/10"
                  onClick={async () => {
                    setBusy(true)
                    try {
                      await onSignIn(profile.id)
                    } finally {
                      setBusy(false)
                    }
                  }}
                >
                  <span className="text-sm font-medium">{profile.displayName}</span>
                  <span className="mono-meta text-xs text-muted">{profile.avatarSeed}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
