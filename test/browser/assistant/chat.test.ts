import {test, expect} from '@playwright/test'
import {delay} from '../utils'
import {mockCopilotApiToken, mockCopilotCompletion, setupDB} from './mock'

test.beforeEach(async ({page}) => {
  await setupDB(page, {
    ai: {
      main: {copilot: {user: 'johndoe', accessToken: 'AT-123'}},
    },
  })
  await page.goto('/')
  await page.waitForSelector('[data-testid="initialized"]')
})

test('chat', async ({page}) => {
  await mockCopilotApiToken(page)
  await mockCopilotCompletion(page, ['Test', '123'], 'Test Call')

  await page.click('[data-testid="ai_assistant_button"]')
  expect(page.getByText('Ask Copilot')).toBeVisible()

  await page.locator('[data-testid="chat_input"] .cm-content').pressSequentially('Hello', {delay})
  await page.click('[data-testid="send"]')

  await expect(page.locator('[data-testid="question_bubble"]')).toHaveText('Hello')
  await expect(page.locator('[data-testid="answer_bubble"]')).toContainText('Test123')

  await mockCopilotCompletion(page, ['Aaa', 'bbb'])

  await page.locator('[data-testid="chat_input"] .cm-content').pressSequentially('Zzz', {delay})
  await page.click('[data-testid="send"]')

  await expect(page.locator('[data-testid="question_bubble"]').locator('nth=0')).toHaveText('Hello')
  await expect(page.locator('[data-testid="answer_bubble"]').locator('nth=0')).toContainText('Test123')
  await expect(page.locator('[data-testid="question_bubble"]').locator('nth=1')).toHaveText('Zzz')
  await expect(page.locator('[data-testid="answer_bubble"]').locator('nth=1')).toContainText('Aaabbb')
})
