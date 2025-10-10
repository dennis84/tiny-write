import type {Page} from '@playwright/test'
import {CopilotMock} from '@/utils/CopilotMock'

type ArrayData = unknown[]
type ObjectData = Record<string, unknown>
type Data = Record<string, ArrayData | ObjectData>

export const setupDB = async (page: Page, data: Data) => {
  console.info(`Setup IndexedDB with data: ${JSON.stringify(data)}`)

  await page.goto('/editor')
  await page.evaluate((d) => {
    const indexedDB = window.indexedDB
    const request = indexedDB.open('tiny_write', 4)

    request.onsuccess = (event: any) => {
      const db = event.target.result
      const transaction = db.transaction(Object.keys(d), 'readwrite')

      Object.entries(d).forEach(([name, storeData]) => {
        const objectStore = transaction.objectStore(name)
        if (Array.isArray(storeData)) {
          storeData.forEach((value) => {
            objectStore.add(value)
          })
        } else {
          Object.entries(storeData).forEach(([key, value]) => {
            objectStore.put(value, key)
          })
        }
      })
    }
  }, data)

  console.info('Setup IndexedDB done')
}

export const mockCopilotLogin = async (page: Page) => {
  await page.route('*/**/?url=https://github.com/login/device/code', async (route) => {
    await route.fulfill({json: CopilotMock.login()})
  })
}

export const mockCopilotUser = async (page: Page) => {
  await page.route('*/**/?url=https://github.com/login/oauth/access_token', async (route) => {
    await route.fulfill({json: CopilotMock.accessToken()})
  })

  await page.route('*/**/?url=https://api.github.com/user', async (route) => {
    await route.fulfill({json: CopilotMock.user()})
  })
}

export const mockCopilotApiToken = async (page: Page) => {
  await page.route('*/**/?url=https://api.github.com/copilot_internal/v2/token', async (route) => {
    await route.fulfill({json: CopilotMock.apiToken()})
  })
}

export const mockCopilotModels = async (page: Page) => {
  await page.route('*/**/?url=https://example.com/github/api/models', async (route) => {
    await route.fulfill({json: CopilotMock.models()})
  })
}

export const mockCopilotCompletion = async (page: Page, textChunks: string[], title?: string) => {
  await page.route('*/**/?url=https://example.com/github/api/chat/completions', async (route) => {
    if (title && !route.request().postDataJSON().stream) {
      await route.fulfill({json: CopilotMock.completions(title)})
    } else {
      await route.fulfill({body: CopilotMock.completionsStream(textChunks)})
    }
  })
}
