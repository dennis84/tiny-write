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
  await page.getByTestId('initialized').waitFor()
})

test('model select', async ({page}) => {
  await page.getByTestId('navbar_assistant_open').click()
  await page.mouse.move(0, 0) // move away from tooltip

  await expect(page.getByText('Ask AI')).toBeVisible()

  await page.getByTestId('model_select').click()

  const tooltip = page.getByTestId('tooltip')

  await expect(tooltip.getByText('GPT-4o')).toBeVisible()
  await expect(tooltip.getByText('Claude 3.5 Sonnet')).toBeVisible()
})
