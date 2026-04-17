import type { CreatePromptInput, PromptDTO, UpdatePromptInput } from '@shared/types'

export type PromptValidationField = 'title' | 'content' | 'category' | 'useCase' | 'aiTarget'

export interface PromptValidationIssue {
  field: PromptValidationField
  message: string
}

type PromptShape = Partial<Pick<PromptDTO, 'title' | 'content' | 'category' | 'useCase' | 'aiTarget'>> &
  Partial<Pick<CreatePromptInput, 'title' | 'content' | 'category' | 'useCase' | 'aiTarget'>> &
  Partial<Pick<UpdatePromptInput, 'title' | 'content' | 'category' | 'useCase' | 'aiTarget'>>

const TITLE_MIN = 3
const CONTENT_MIN = 12

function trimOrEmpty(value: string | undefined): string {
  return (value ?? '').trim()
}

export function validatePromptForSave(input: PromptShape): PromptValidationIssue[] {
  const issues: PromptValidationIssue[] = []
  const title = trimOrEmpty(input.title)
  const content = trimOrEmpty(input.content)

  if (title.length < TITLE_MIN) {
    issues.push({
      field: 'title',
      message: `Title must be at least ${TITLE_MIN} characters.`
    })
  }

  if (content.length < CONTENT_MIN) {
    issues.push({
      field: 'content',
      message: `Prompt content must be at least ${CONTENT_MIN} characters.`
    })
  }

  return issues
}

export function validatePromptForShare(input: PromptShape): PromptValidationIssue[] {
  const issues = validatePromptForSave(input)
  const category = trimOrEmpty(input.category)
  const useCase = trimOrEmpty(input.useCase)
  const aiTarget = trimOrEmpty(input.aiTarget)

  if (!category) {
    issues.push({
      field: 'category',
      message: 'Category is required before sharing or exporting.'
    })
  }

  if (!useCase) {
    issues.push({
      field: 'useCase',
      message: 'Use case is required before sharing or exporting.'
    })
  }

  if (!aiTarget) {
    issues.push({
      field: 'aiTarget',
      message: 'AI target is required before sharing or exporting.'
    })
  }

  return issues
}

export function formatPromptValidationIssues(issues: PromptValidationIssue[]): string {
  return issues.map((issue) => issue.message).join(' ')
}
