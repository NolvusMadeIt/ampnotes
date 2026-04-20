import keytar from 'keytar'
import { createHash } from 'node:crypto'

const SERVICE_NAME = 'ampnotes'

class KeychainService {
  private hashPin(pin: string): string {
    return createHash('sha256').update(pin).digest('hex')
  }

  async setGroqApiKey(profileId: string, apiKey: string): Promise<void> {
    await keytar.setPassword(SERVICE_NAME, `groq:${profileId}`, apiKey)
  }

  async getGroqApiKey(profileId: string): Promise<string | null> {
    return keytar.getPassword(SERVICE_NAME, `groq:${profileId}`)
  }

  async clearGroqApiKey(profileId: string): Promise<void> {
    await keytar.deletePassword(SERVICE_NAME, `groq:${profileId}`)
  }

  async setAdminPin(profileId: string, pin: string): Promise<void> {
    await keytar.setPassword(SERVICE_NAME, `admin-pin:${profileId}`, this.hashPin(pin))
  }

  async hasAdminPin(profileId: string): Promise<boolean> {
    const stored = await keytar.getPassword(SERVICE_NAME, `admin-pin:${profileId}`)
    return Boolean(stored)
  }

  async verifyAdminPin(profileId: string, pin: string): Promise<boolean> {
    const stored = await keytar.getPassword(SERVICE_NAME, `admin-pin:${profileId}`)
    if (!stored) {
      return false
    }
    return stored === this.hashPin(pin)
  }

  async clearAdminPin(profileId: string): Promise<void> {
    await keytar.deletePassword(SERVICE_NAME, `admin-pin:${profileId}`)
  }
}

export const keychainService = new KeychainService()
