import {fetch} from '@/remote/http'
import {info} from '@/remote/log'
import type {AiProvider, Model} from '@/types'

// Known open-weight model family keywords used to derive a human-readable
// vendor name from a model or family identifier (case-insensitive substring match).
const KNOWN_MODEL_FAMILIES = ['qwen', 'gemma']

export class AiUtil {
  static async getModels(
    url: string,
    provider: AiProvider,
    getFamily: (item: any) => string,
  ): Promise<Model[]> {
    info(`Get chat models (provider=${provider}, url=${url})`)
    try {
      const response = await fetch(url)
      const json = await response.json()

      const models: Model[] = []
      for (const item of json.models) {
        if (item.capabilities.includes('completion')) {
          const name = AiUtil.parseName(item.name)
          models.push({
            id: item.name,
            name,
            vendor: AiUtil.parseFamily(getFamily(item)),
            streaming: true,
            maxOutputTokens: 40_000,
            maxPromptTokens: 40_000,
            provider,
          })
        }
      }

      return models
    } catch {
      return []
    }
  }

  static parseName(input: string): string {
    const parts = input.split('/')
    if (parts.length === 0) return input
    return parts[parts.length - 1]
  }

  static parseFamily(input: string): string {
    const lower = input.toLowerCase()
    for (const family of KNOWN_MODEL_FAMILIES) {
      if (lower.includes(family)) {
        return family.charAt(0).toUpperCase() + family.slice(1)
      }
    }

    return input
  }
}
