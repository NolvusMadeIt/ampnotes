import type {
  PromptValidationResult,
  RefinementRequest,
  RefinementResult
} from '@shared/types'

export interface PromptValidationRequest {
  profileId: string
  title: string
  content: string
  category?: string
  useCase?: string
  aiTarget?: string
}

export interface AIProvider {
  readonly id: string
  isConfigured(profileId: string): Promise<boolean>
  refinePrompt(request: RefinementRequest): Promise<RefinementResult>
  validatePrompt(request: PromptValidationRequest): Promise<PromptValidationResult>
}

export class AIProviderRegistry {
  private providers = new Map<string, AIProvider>()

  register(provider: AIProvider): void {
    this.providers.set(provider.id, provider)
  }

  get(providerId: string): AIProvider {
    const provider = this.providers.get(providerId)
    if (!provider) {
      throw new Error(`AI provider '${providerId}' is not registered`)
    }

    return provider
  }

  list(): string[] {
    return [...this.providers.keys()]
  }
}
