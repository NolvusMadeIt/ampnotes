import { z } from 'zod'

export const createProfileSchema = z.object({
  displayName: z.string().min(1).max(40)
})

export const signInSchema = z.object({
  profileId: z.string().uuid()
})

export const createPromptSchema = z.object({
  title: z.string().trim().min(3).max(140),
  content: z.string().trim().min(12),
  category: z.string().trim().max(80).optional(),
  tags: z.array(z.string().min(1).max(32)).max(20).optional(),
  useCase: z.string().trim().max(240).optional(),
  aiTarget: z.string().trim().max(64).optional(),
  favorite: z.boolean().optional(),
  pinned: z.boolean().optional()
})

export const updatePromptSchema = createPromptSchema.extend({
  id: z.string().uuid()
})

export const createTemplateSchema = z.object({
  title: z.string().trim().min(3).max(140),
  content: z.string().trim().min(12),
  category: z.string().trim().max(80).optional(),
  tags: z.array(z.string().min(1).max(32)).max(20).optional()
})

export const updateTemplateSchema = createTemplateSchema.extend({
  id: z.string().uuid()
})

const manifestIdSchema = z
  .string()
  .trim()
  .min(3)
  .max(80)
  .regex(/^[a-z0-9._-]+$/i, 'Manifest id can only include letters, numbers, dot, underscore, and hyphen')

const semverLikeSchema = z
  .string()
  .trim()
  .min(1)
  .max(32)

const httpsUrlSchema = z
  .string()
  .trim()
  .url()
  .max(200)
  .refine((value) => value.startsWith('https://'), 'Only HTTPS URLs are allowed')

const safeEntrySchema = z
  .string()
  .trim()
  .max(200)
  .regex(/^[a-z0-9_./-]+$/i, 'Entry path may include letters, numbers, slash, dot, underscore, and hyphen')
  .refine((value) => !value.includes('..'), 'Entry path cannot contain parent traversal')

const permissionSchema = z.enum([
  'prompt.read',
  'prompt.write',
  'template.read',
  'template.write',
  'share.export',
  'share.import',
  'theme.apply',
  'settings.read'
])

const socialLinksSchema = z
  .object({
    github: httpsUrlSchema.optional(),
    x: httpsUrlSchema.optional(),
    website: httpsUrlSchema.optional()
  })
  .partial()

const exportCreditsSchema = z.object({
  name: z.string().trim().min(1).max(80),
  socials: socialLinksSchema.optional()
})

const colorTokenNames = new Set([
  '--bg',
  '--surface',
  '--surface-2',
  '--text',
  '--text-muted',
  '--icon',
  '--icon-muted',
  '--border',
  '--popover',
  '--popover-foreground',
  '--input',
  '--ring',
  '--accent',
  '--accent-contrast',
  '--success',
  '--warning',
  '--danger',
  '--ambient-a',
  '--ambient-b',
  '--ambient-overlay',
  '--toast-bg',
  '--toast-text',
  '--toast-muted',
  '--toast-border'
])

const lengthTokenNames = new Set([
  '--radius-sm',
  '--radius-md',
  '--radius-lg',
  '--radius-xl',
  '--font-size-base',
  '--letter-spacing-heading',
  '--letter-spacing-meta',
  '--control-height-sm',
  '--control-height-md',
  '--control-padding-x',
  '--panel-padding',
  '--panel-gap',
  '--sidebar-width',
  '--scrollbar-size',
  '--focus-outline-width'
])

const numberTokenNames = new Set(['--line-height-body', '--line-height-tight'])
const fontWeightTokenNames = new Set(['--font-weight-regular', '--font-weight-medium', '--font-weight-semibold'])
const fontFamilyTokenNames = new Set(['--font-sans', '--font-serif', '--font-mono'])
const shadowTokenNames = new Set(['--shadow-panel'])
const allowedThemeTokenNames = new Set([
  ...colorTokenNames,
  ...lengthTokenNames,
  ...numberTokenNames,
  ...fontWeightTokenNames,
  ...fontFamilyTokenNames,
  ...shadowTokenNames
])

const safeCssValueSchema = z
  .string()
  .trim()
  .min(1)
  .max(240)
  .refine((value) => !/[;{}<>]/.test(value), 'Theme token values cannot contain CSS blocks or HTML')
  .refine((value) => !/url\s*\(|expression\s*\(|@import/i.test(value), 'Theme token values cannot load external resources')

function isColorValue(value: string): boolean {
  return /^(#[0-9a-f]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\)|color-mix\([^)]+\)|transparent|currentcolor|[a-z]+)$/i.test(
    value
  )
}

function isLengthValue(value: string): boolean {
  return /^(0|-?\d+(\.\d+)?(px|rem|em|%|vw|vh))$/.test(value)
}

function isNumberValue(value: string): boolean {
  return /^\d+(\.\d+)?$/.test(value)
}

function isFontWeightValue(value: string): boolean {
  return /^(100|200|300|400|500|600|700|800|900)$/.test(value)
}

function isFontFamilyValue(value: string): boolean {
  return /^[a-z0-9\s"',.-]+$/i.test(value)
}

function isShadowValue(value: string): boolean {
  return value === 'none' || /^[a-z0-9\s#(),.%+-]+$/i.test(value)
}

function isValidThemeTokenValue(token: string, value: string): boolean {
  if (colorTokenNames.has(token)) return isColorValue(value)
  if (lengthTokenNames.has(token)) return isLengthValue(value)
  if (numberTokenNames.has(token)) return isNumberValue(value)
  if (fontWeightTokenNames.has(token)) return isFontWeightValue(value)
  if (fontFamilyTokenNames.has(token)) return isFontFamilyValue(value)
  if (shadowTokenNames.has(token)) return isShadowValue(value)
  return false
}

const themeTokensSchema = z.record(z.string().max(60), safeCssValueSchema).superRefine((tokens, context) => {
  for (const [token, value] of Object.entries(tokens)) {
    if (!allowedThemeTokenNames.has(token)) {
      context.addIssue({
        code: 'custom',
        path: [token],
        message: 'Unsupported theme token'
      })
      continue
    }
    if (!isValidThemeTokenValue(token, value)) {
      context.addIssue({
        code: 'custom',
        path: [token],
        message: 'Invalid value for this theme token'
      })
    }
  }
})

export const pluginManifestSchema = z.object({
  id: manifestIdSchema,
  name: z.string().trim().min(2).max(80),
  version: semverLikeSchema,
  description: z.string().trim().max(280).optional(),
  author: z.string().trim().max(80).optional(),
  entry: safeEntrySchema,
  homepage: httpsUrlSchema.optional(),
  socials: socialLinksSchema.optional(),
  credits: exportCreditsSchema.optional(),
  permissions: z.array(permissionSchema).max(32).optional()
})

export const themeTokenMapSchema = z
  .object({
    light: themeTokensSchema.optional(),
    dark: themeTokensSchema.optional()
  })
  .refine((tokens) => Boolean(tokens.light || tokens.dark), 'A theme must include light or dark tokens')

export const themeManifestSchema = z.object({
  id: manifestIdSchema,
  name: z.string().trim().min(2).max(80),
  version: semverLikeSchema,
  description: z.string().trim().max(280).optional(),
  author: z.string().trim().max(80).optional(),
  homepage: httpsUrlSchema.optional(),
  socials: socialLinksSchema.optional(),
  credits: exportCreditsSchema.optional(),
  tokens: themeTokenMapSchema
})

export const adminProfileSocialsSchema = socialLinksSchema

export const adminProfileSchema = z.object({
  displayName: z.string().trim().min(1).max(80),
  avatarUrl: httpsUrlSchema.optional(),
  socials: adminProfileSocialsSchema.optional(),
  windowsDevicePinHintEnabled: z.boolean().optional()
})

export const adminPinSchema = z
  .string()
  .trim()
  .min(4)
  .max(32)
  .regex(/^[0-9]+$/, 'PIN can contain numbers only')

export const promptListFiltersSchema = z.object({
  search: z.string().max(240).optional(),
  favorite: z.boolean().optional(),
  pinned: z.boolean().optional(),
  category: z.string().max(80).optional(),
  tag: z.string().max(32).optional(),
  limit: z.number().int().min(1).max(200).optional(),
  offset: z.number().int().min(0).optional()
})

export const refineRequestSchema = z.object({
  profileId: z.string().uuid(),
  promptId: z.string().uuid().optional(),
  content: z.string().min(1),
  goals: z.string().max(500).optional(),
  preserveIntent: z.boolean().optional(),
  targetTool: z.string().max(64).optional()
})

export const saveApiKeySchema = z.object({
  profileId: z.string().uuid(),
  apiKey: z.string().min(10)
})

export const shareImportSchema = z.object({
  profileId: z.string().uuid(),
  encoded: z.string().min(10),
  strategy: z.enum(['import_copy', 'skip', 'merge_metadata']).default('import_copy')
})

export const promptValidationRequestSchema = z.object({
  profileId: z.string().uuid(),
  promptId: z.string().uuid()
})

export const promptReorderSchema = z.object({
  profileId: z.string().uuid(),
  promptIds: z.array(z.string().uuid()).min(1).max(300)
})

export const shareSelectedExportSchema = z.object({
  profileId: z.string().uuid(),
  promptIds: z.array(z.string().uuid()).max(300).default([]),
  templateIds: z.array(z.string().uuid()).max(300).default([])
})

export const themeSchema = z.enum(['light', 'dark', 'system'])
export const fontFamilySchema = z.enum(['merriweather', 'sourceSerif', 'lora', 'ibmPlexSans', 'publicSans'])
export const themePresetSchema = z.enum(['midnight', 'ocean', 'graphite', 'forest', 'sand'])
export const appearanceSchema = z.object({
  fontFamily: fontFamilySchema,
  fontScale: z.number().int().min(90).max(125),
  themePreset: themePresetSchema
})

export const updateThemeSchema = z.object({
  profileId: z.string().uuid(),
  theme: themeSchema
})

export const updateAppearanceSchema = z.object({
  profileId: z.string().uuid(),
  appearance: appearanceSchema
})
