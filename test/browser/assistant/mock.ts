import type {Page} from '@playwright/test'
import {CopilotMock} from '@/utils/CopilotMock'
import {pause} from '@/utils/promise'

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

interface CompletionResponse {
  chunks?: string[]
  text?: string
  delayMs?: number
}

export const mockCopilotCompletion = async (page: Page, resp: CompletionResponse) => {
  await page.route('*/**/?url=https://example.com/github/api/chat/completions', async (route) => {
    if (resp.delayMs) {
      await pause(resp.delayMs)
    }

    const stream = route.request().postDataJSON().stream === true
    if (stream && resp.chunks) {
      await route.fulfill({body: CopilotMock.completionsStream(resp.chunks)})
    } else if (!stream && resp.text) {
      await route.fulfill({json: CopilotMock.toChoicesMessage(resp.text)})
    } else {
      throw new Error(
        `Invalid completion response mock data (stream=${stream}, resp=${JSON.stringify(resp)})`,
      )
    }
  })
}
