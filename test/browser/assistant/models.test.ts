import {test, expect} from '@playwright/test'
import {mockCopilotApiToken, mockCopilotModels, setupDB} from './mock'

test.beforeEach(async ({page}) => {
  await setupDB(page, {
    ai: {
      main: {copilot: {user: 'johndoe', accessToken: 'AT-123'}},
    },
  })
  await page.goto('/')
  await page.waitForSelector('[data-testid="initialized"]')
})

test('model select', async ({page}) => {
  await mockCopilotApiToken(page)
  await mockCopilotModels(page)

  await page.click('[data-testid="floating_navbar_assistant_open"]')
  await page.mouse.move(0, 0) // move away from tooltip

  expect(page.getByText('Ask Copilot')).toBeVisible()

  await page.click('[data-testid="model_select"]')

  expect(page.getByText('GPT-4o')).toBeVisible()
  expect(page.getByText('Claude 3.5 Sonnet')).toBeVisible()
})
