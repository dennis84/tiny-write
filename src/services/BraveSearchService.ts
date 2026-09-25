import {tool} from 'ai'
import {z} from 'zod'

export class BraveSearchService {
  static getTool() {
    return tool({
      description:
        'Search the web using Brave Search. Use this to find up-to-date information, news, or facts not in your training data.',
      inputSchema: z.object({
        query: z.string().describe('The web-search query'),
        count: z.number().int().min(1).max(20).default(5),
      }),
      execute: async ({query, count}) => {
        const params = new URLSearchParams({q: query, count: String(count)})
        const searchUrl = `https://brave-search-proxy.ddietr.workers.dev/search?${params}`
        const response = await fetch(searchUrl)

        if (!response.ok) {
          throw new Error(`Brave Search request failed: ${response.status} ${response.statusText}`)
        }

        const data = await response.json()

        return (data.web?.results ?? []).map(
          (result: {title: string; url: string; description?: string}) => ({
            title: result.title,
            url: result.url,
            description: result.description ?? '',
          }),
        )
      },
    })
  }
}
