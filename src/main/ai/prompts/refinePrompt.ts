import type { RefinementRequest } from '@shared/types'

export function buildRefinementPrompt(request: RefinementRequest): string {
  const goals = request.goals?.trim() || 'Improve clarity, structure, and output guidance.'
  const preserveIntent = request.preserveIntent !== false

  return [
    'You are a helpful prompt engineer who improves prompts to be clearer, more specific, and more effective.',
    'Make meaningful improvements: add structure, clarify output format, add relevant constraints, include examples if helpful.',
    preserveIntent
      ? 'Preserve the original intent, audience, and requested outcome while improving the wording and structure.'
      : 'You may reshape the prompt more substantially if it better satisfies the stated goals.',
    `Goals: ${goals}`,
    request.targetTool ? `Target AI tool: ${request.targetTool}` : '',
    '',
    'Return ONLY the improved prompt text without any extra commentary.',
    '',
    'Original prompt:',
    request.content
  ]
    .filter(Boolean)
    .join('\n')
}
