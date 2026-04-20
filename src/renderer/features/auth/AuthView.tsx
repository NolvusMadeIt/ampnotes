import { useMemo, useState } from 'react'
import type { ProfileDTO } from '@shared/types'
import { UserRound } from 'lucide-react'
import ampLogoUrl from '@renderer/assets/imgs/amp_logo.png'
import ampyUrl from '@renderer/assets/imgs/ampy.png'

interface AuthViewProps {
  profiles: ProfileDTO[]
  onCreateAndSignIn: (displayName: string) => Promise<void>
  onSignIn: (profileId: string) => Promise<void>
}

const AUTH_BACKGROUND_STORAGE_KEY = 'ampnotes.auth.background.v1'

const AUTH_BACKGROUNDS = [
  {
    url: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=2200&q=80',
    alt: 'Notebook and pen on a writing desk'
  },
  {
    url: 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?auto=format&fit=crop&w=2200&q=80',
    alt: 'Planner and notes for idea drafting'
  },
  {
    url: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=2200&q=80',
    alt: 'Journaling notebook and pen on a clean table'
  },
  {
    url: 'https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=2200&q=80',
    alt: 'Creative writing and planning workspace'
  },
  {
    url: 'https://images.unsplash.com/photo-1472289065668-ce650ac443d2?auto=format&fit=crop&w=2200&q=80',
    alt: 'Paper notes and highlighter for prompt drafts'
  }
]

function readBackgroundIndex(): number {
  if (typeof window === 'undefined' || typeof window.localStorage?.getItem !== 'function') {
    return 0
  }
  const raw = window.localStorage.getItem(AUTH_BACKGROUND_STORAGE_KEY)
  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) {
    return 0
  }
  const safe = Math.floor(Math.abs(parsed))
  return safe % AUTH_BACKGROUNDS.length
}

function writeBackgroundIndex(value: number): void {
  if (typeof window === 'undefined' || typeof window.localStorage?.setItem !== 'function') {
    return
  }
  window.localStorage.setItem(AUTH_BACKGROUND_STORAGE_KEY, String(value))
}

export function AuthView({ profiles, onCreateAndSignIn, onSignIn }: AuthViewProps) {
  const [displayName, setDisplayName] = useState('')
  const [busy, setBusy] = useState(false)
  const [backgroundIndex] = useState(() => readBackgroundIndex())

  const background = useMemo(
    () => AUTH_BACKGROUNDS[backgroundIndex % AUTH_BACKGROUNDS.length],
    [backgroundIndex]
  )

  const prepareNextBackground = () => {
    const nextIndex = (backgroundIndex + 1) % AUTH_BACKGROUNDS.length
    writeBackgroundIndex(nextIndex)
  }

  return (
    <main className="relative h-full overflow-hidden bg-[#07090f] text-white">
      <img src={ampLogoUrl} alt="AMP Logo" className="absolute left-5 top-5 z-20 w-24" />

      <div className="absolute inset-0">
        <img src={background.url} alt={background.alt} className="h-full w-full object-cover object-center" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_24%_22%,rgba(105,132,255,0.16),transparent_36%),linear-gradient(90deg,rgba(5,8,16,0.58)_0%,rgba(5,8,16,0.44)_45%,rgba(5,8,16,0.72)_100%)]" />
      </div>

      <div className="relative z-10 grid h-full grid-cols-1 lg:grid-cols-[minmax(0,1.4fr)_minmax(420px,520px)]">
        <section className="hidden items-end p-10 lg:flex">
          <div className="max-w-lg">
            <p className="mono-meta mb-2 text-xs uppercase tracking-[0.22em] text-white/72">AMP</p>
            <h1 className="editorial-heading text-5xl font-semibold leading-[1.08] text-white">
              All My Prompts
            </h1>
            <p className="mt-4 text-base text-white/84">
              Write, test, organize, and ship better prompts from one desktop workspace.
            </p>
            <p className="mt-2 text-sm text-white/70">
              NolvusMadeIt, write, validate, package, and ship reusable prompts from one workspace.
            </p>
          </div>
        </section>

        <section className="flex items-center justify-center px-5 py-8 sm:px-8">
          <div className="w-full max-w-md rounded-xl border border-white/12 bg-[#0f121acc]/90 p-6 shadow-[0_24px_72px_rgba(0,0,0,0.46)] backdrop-blur-xl">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-lg border border-white/18 bg-white/6">
                <UserRound size={19} className="text-white/92" />
              </div>
              <h2 className="editorial-heading text-3xl font-semibold leading-tight text-white">Welcome to AMP</h2>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-white/90" htmlFor="profile-name">
                Display name
              </label>
              <input
                id="profile-name"
                autoComplete="name"
                className="h-11 w-full rounded-lg border border-white/16 bg-white/[0.03] px-3 text-white outline-none transition focus:border-[#7a95ff] focus:bg-[#161d2f]/65"
                placeholder="Your display name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
              />
              <button
                className="showcase-action-primary h-11 w-full rounded-lg border px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                disabled={busy || !displayName.trim()}
                onClick={async () => {
                  setBusy(true)
                  try {
                    await onCreateAndSignIn(displayName)
                    setDisplayName('')
                    prepareNextBackground()
                  } finally {
                    setBusy(false)
                  }
                }}
              >
                Continue
              </button>
            </div>

            <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-[0.18em] text-white/45">
              <span className="h-px flex-1 bg-white/12" />
              <span>or</span>
              <span className="h-px flex-1 bg-white/12" />
            </div>

            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.16em] text-white/56">Continue with existing profile</p>
              {profiles.length === 0 ? (
                <div className="rounded-lg border border-dashed border-white/14 bg-white/[0.03] p-3 text-sm text-white/66">
                  No profiles yet. Create one above.
                </div>
              ) : (
                <div className="grid gap-2">
                  {profiles.map((profile) => (
                    <button
                      key={profile.id}
                      className="showcase-action-secondary flex h-11 items-center justify-between rounded-lg px-3 text-left text-sm font-medium"
                      onClick={async () => {
                        setBusy(true)
                        try {
                          await onSignIn(profile.id)
                          prepareNextBackground()
                        } finally {
                          setBusy(false)
                        }
                      }}
                    >
                      <span className="truncate">{profile.displayName}</span>
                      <span className="mono-meta ml-3 text-xs text-white/72">{profile.avatarSeed}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 flex justify-center">
              <img src={ampyUrl} alt="Ampy" className="w-16 opacity-80" />
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
