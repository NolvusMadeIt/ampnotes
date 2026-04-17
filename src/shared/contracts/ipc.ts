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

export const pluginManifestSchema = z.object({
  id: manifestIdSchema,
  name: z.string().trim().min(2).max(80),
  version: semverLikeSchema,
  description: z.string().trim().max(280).optional(),
  author: z.string().trim().max(80).optional(),
  entry: safeEntrySchema.optional(),
  homepage: httpsUrlSchema.optional(),
  permissions: z.array(permissionSchema).max(32).optional()
})

export const themeTokenMapSchema = z.object({
  light: z.record(z.string().max(60), z.string().max(120)).optional(),
  dark: z.record(z.string().max(60), z.string().max(120)).optional()
})

export const themeManifestSchema = z.object({
  id: manifestIdSchema,
  name: z.string().trim().min(2).max(80),
  version: semverLikeSchema,
  description: z.string().trim().max(280).optional(),
  author: z.string().trim().max(80).optional(),
  homepage: httpsUrlSchema.optional(),
  tokens: themeTokenMapSchema
})

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
