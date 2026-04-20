import type { ListingItem } from './types'

export const APP_RELEASE_URL = 'https://github.com/NolvusMadeIt/ampnotes/releases/latest'

export function buildAmpInstallLink(listing: ListingItem, baseUrl: string): string {
  const manifestPath = `/api/manifests/${listing.kind}/${encodeURIComponent(listing.manifestId)}`
  const manifestUrl = new URL(manifestPath, baseUrl).toString()
  const params = new URLSearchParams({
    kind: listing.kind,
    id: listing.manifestId,
    manifest: manifestUrl,
    title: listing.title
  })
  return `ampnotes://install?${params.toString()}`
}
