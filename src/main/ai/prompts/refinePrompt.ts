import type { RefinementRequest } from '@shared/types'

export function buildRefinementPrompt(request: RefinementRequest): string {
  const goals = request.goals?.trim() || 'Improve clarity, structure, and output guidance.'
  const preserveIntent = request.preserveIntent !== false

  return [
    'You are an expert prompt engineer.',
    'Refine the user prompt while preserving core intent and scope.',
    `Goals: ${goals}`,
    `Preserve intent strictly: ${preserveIntent ? 'yes' : 'no'}`,
    request.targetTool ? `Target AI tool: ${request.targetTool}` : '',
    '',
    'Return only the improved prompt text without commentary.',
    '',
    'Original prompt:',
    request.content
  ]
    .filter(Boolean)
    .join('\n')
}
