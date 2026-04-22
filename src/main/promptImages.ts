import { app, net, protocol } from 'electron'
import { join, normalize } from 'node:path'
import { pathToFileURL } from 'node:url'

export const PROMPT_IMAGE_PROTOCOL = 'amp-prompt-image'

function safePathSegment(value: string): string {
  return value.replace(/[^a-z0-9._-]/gi, '_').slice(0, 80) || 'image'
}

export function createPromptImageUrl(profileId: string, promptId: string, fileName: string): string {
  return `${PROMPT_IMAGE_PROTOCOL}://image/${encodeURIComponent(safePathSegment(profileId))}/${encodeURIComponent(
    safePathSegment(promptId)
  )}/${encodeURIComponent(fileName)}`
}

export function registerPromptImageProtocol(): void {
  if (protocol.isProtocolHandled(PROMPT_IMAGE_PROTOCOL)) {
    return
  }

  protocol.handle(PROMPT_IMAGE_PROTOCOL, (request) => {
    const url = new URL(request.url)
    const parts = url.pathname.split('/').filter(Boolean).map(decodeURIComponent)
    if (url.hostname !== 'image' || parts.length !== 3) {
      return new Response('Not found', { status: 404 })
    }

    const [profileId, promptId, fileName] = parts.map(safePathSegment)
    const root = join(app.getPath('userData'), 'prompt-images')
    const imagePath = normalize(join(root, profileId, promptId, fileName))
    const normalizedRoot = normalize(root)
    if (!imagePath.startsWith(normalizedRoot)) {
      return new Response('Forbidden', { status: 403 })
    }

    return net.fetch(pathToFileURL(imagePath).toString())
  })
}
