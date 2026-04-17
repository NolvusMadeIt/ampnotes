import keytar from 'keytar'

const SERVICE_NAME = 'ampnotes'

class KeychainService {
  async setGroqApiKey(profileId: string, apiKey: string): Promise<void> {
    await keytar.setPassword(SERVICE_NAME, `groq:${profileId}`, apiKey)
  }

  async getGroqApiKey(profileId: string): Promise<string | null> {
    return keytar.getPassword(SERVICE_NAME, `groq:${profileId}`)
  }

  async clearGroqApiKey(profileId: string): Promise<void> {
    await keytar.deletePassword(SERVICE_NAME, `groq:${profileId}`)
  }
}

export const keychainService = new KeychainService()
