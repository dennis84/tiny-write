import {Page} from '@playwright/test'

type ArrayData = unknown[]
type ObjectData = Record<string, unknown>
type Data = Record<string, ArrayData | ObjectData>

export const setupDB = async (page: Page, data: Data) => {
  await page.goto('/')
  await page.evaluate((d) => {
    const indexedDB = window.indexedDB
    const request = indexedDB.open('tiny_write', 3)

    request.onsuccess = (event: any) => {
      const db = event.target.result
      const transaction = db.transaction(Object.keys(d), 'readwrite')

      Object.entries(d).forEach(([name, storeData]) => {
        const objectStore = transaction.objectStore(name)
        if (Array.isArray(storeData)) {
          storeData.forEach((value) => objectStore.add(value))
        } else {
          Object.entries(storeData).forEach(([key, value]) => objectStore.put(value, key))
        }
      })
    }
  }, data)
}

export const mockCopilotLogin = async (page: Page) => {
  await page.route('*/**/?url=https://github.com/login/device/code', async (route) => {
    await route.fulfill({
      json: {
        user_code: 'USER-CODE-123',
        device_code: 'DEVICE-CODE-123',
        verification_uri: 'https://example.com/copilot/verify',
      },
    })
  })
}

export const mockCopilotUser = async (page: Page) => {
  await page.route('*/**/?url=https://github.com/login/oauth/access_token', async (route) => {
    await route.fulfill({json: {access_token: 'ACCESS-TOKEN-123'}})
  })

  await page.route('*/**/?url=https://api.github.com/user', async (route) => {
    await route.fulfill({json: {login: 'johndoe'}})
  })
}

export const mockCopilotApiToken = async (page: Page) => {
  await page.route('*/**/?url=https://api.github.com/copilot_internal/v2/token', async (route) => {
    await route.fulfill({
      json: {
        token: 'API-TOKEN-123',
        expires_at: 0,
        endpoints: {
          api: 'https://example.com/github/api',
        },
      },
    })
  })
}

export const mockCopilotModels = async (page: Page) => {
  await page.route('*/**/?url=https://example.com/github/api/models', async (route) => {
    await route.fulfill({
      json: {
        data: [
          {
            id: 'gpt-4o',
            name: 'GPT-4o',
            model_picker_enabled: true,
            capabilities: {supports: {streaming: true}},
          },
          {
            id: 'claude-3.5-sonnet',
            name: 'Claude 3.5 Sonnet',
            model_picker_enabled: true,
            capabilities: {supports: {streaming: true}},
          },
        ],
      },
    })
  })
}

const streamingBody = (chunks: unknown[]) =>
  chunks.map((c: unknown) => 'data: ' + JSON.stringify(c)).join('\n\n') + '\n\ndata: [DONE]'

export const mockCopilotCompletion = async (page: Page, textChunks: string[], title?: string) => {
  await page.route('*/**/?url=https://example.com/github/api/chat/completions', async (route) => {
    if (title && !route.request().postDataJSON().stream) {
      await route.fulfill({
        json: {choices: [{message: {content: title}}]},
      })
    } else {
      await route.fulfill({
        body: streamingBody(textChunks.map((content) => ({choices: [{message: {content}}]}))),
      })
    }
  })
}
