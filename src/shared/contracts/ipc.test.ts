import { describe, expect, it } from 'vitest'
import {
  appearanceSchema,
  createProfileSchema,
  createPromptSchema,
  refineRequestSchema,
  shareImportSchema,
  updatePromptSchema
} from './ipc'

describe('IPC contract schemas', () => {
  it('accepts valid prompt creation payload', () => {
    const parsed = createPromptSchema.parse({
      title: 'Prompt',
      content: 'Do something helpful',
      tags: ['a', 'b']
    })

    expect(parsed.title).toBe('Prompt')
  })

  it('rejects invalid update payload without id', () => {
    expect(() =>
      updatePromptSchema.parse({ title: 'Missing id', content: 'x' })
    ).toThrowError()
  })

  it('validates refinement requests and share imports', () => {
    const refine = refineRequestSchema.parse({
      profileId: 'd3899a7b-2af5-4a00-8f1a-34dc80d75f17',
      content: 'Improve this prompt',
      preserveIntent: true
    })
    expect(refine.content).toContain('Improve')

    const shareImport = shareImportSchema.parse({
      profileId: 'd3899a7b-2af5-4a00-8f1a-34dc80d75f17',
      encoded: 'longencodedpayload'
    })
    expect(shareImport.strategy).toBe('import_copy')

    const profile = createProfileSchema.parse({ displayName: 'Liam' })
    expect(profile.displayName).toBe('Liam')

    const appearance = appearanceSchema.parse({
      fontFamily: 'merriweather',
      fontScale: 104,
      themePreset: 'midnight',
      defaultPromptView: 'read'
    })
    expect(appearance.fontScale).toBe(104)
  })
})
