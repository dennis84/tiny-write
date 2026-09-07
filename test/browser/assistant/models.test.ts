import {expect, test} from '@playwright/test'
import {setupDB} from '../utils'
import {mockCopilotApiToken, mockCopilotModels} from './mock'

test.beforeEach(async ({page}) => {
  await setupDB(page, {
    ai: {
      main: {
        provider: 'copilot',
        copilot: {user: 'johndoe', accessToken: 'AT-123'},
      },
    },
  })

  await mockCopilotApiToken(page)
  await mockCopilotModels(page)

  await page.goto('/')
  await page.waitForSelector('[data-testid="initialized"]')
})

test('model select', async ({page}) => {
  await page.click('[data-testid="navbar_assistant_open"]')
  await page.mouse.move(0, 0) // move away from tooltip

  expect(page.getByText('Ask Copilot')).toBeVisible()

  await page.click('[data-testid="model_select"]')

  const tooltip = page.locator('[data-testid="tooltip"]')

  await expect(tooltip.getByText('GPT-4o')).toBeVisible()
  await expect(tooltip.getByText('Claude 3.5 Sonnet')).toBeVisible()
})
