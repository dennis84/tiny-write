import {expect, test} from '@playwright/test'
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

  await page.click('[data-testid="floating_navbar_assistant_open"]')
  expect(page.getByText('Ask Copilot')).toBeVisible()

  await page.locator('[data-testid="chat_input"] .cm-content').pressSequentially('Hello', {delay})
  await page.click('[data-testid="send"]')

  await expect(page.locator('[data-testid="question_bubble"]')).toHaveText('Hello')
  await expect(page.locator('[data-testid="answer_bubble"]')).toContainText('Test123')

  await mockCopilotCompletion(page, ['Aaa', 'bbb'])

  await page.locator('[data-testid="chat_input"] .cm-content').pressSequentially('Zzz', {delay})
  await page.click('[data-testid="send"]')

  await expect(page.locator('[data-testid="question_bubble"]').locator('nth=0')).toHaveText('Hello')
  await expect(page.locator('[data-testid="answer_bubble"]').locator('nth=0')).toContainText(
    'Test123',
  )
  await expect(page.locator('[data-testid="question_bubble"]').locator('nth=1')).toHaveText('Zzz')
  await expect(page.locator('[data-testid="answer_bubble"]').locator('nth=1')).toContainText(
    'Aaabbb',
  )
})

test('edit question', async ({page}) => {
  // Setup
  await mockCopilotApiToken(page)
  await mockCopilotCompletion(page, ['SetupAnswer'], 'Test Call')

  await page.click('[data-testid="floating_navbar_assistant_open"]')
  expect(page.getByText('Ask Copilot')).toBeVisible()

  await page
    .getByTestId('chat_input')
    .locator('.cm-content')
    .pressSequentially('SetupQuestion', {delay})
  await page.click('[data-testid="send"]')

  await expect(page.getByTestId('question_bubble')).toHaveText('SetupQuestion')
  await expect(page.getByTestId('answer_bubble')).toContainText('SetupAnswer')

  // Test case 1: Edit question
  await mockCopilotCompletion(page, ['Answer1'], 'Test Call')
  await page.getByTestId('edit_message').click()
  await page.getByTestId('message_input').locator('.cm-content').clear()
  await page
    .getByTestId('message_input')
    .locator('.cm-content')
    .pressSequentially('Question1', {delay})
  await page.getByTestId('update_message').click()

  await expect(page.getByTestId('question_bubble')).toHaveText('Question1')
  await expect(page.getByTestId('answer_bubble')).toContainText('Answer1')
  await expect(page.getByTestId('pagination').nth(0)).toHaveText('2/2')

  // Test case 2: Regenerate answer
  await mockCopilotCompletion(page, ['Answer2'], 'Test Call')
  await page.getByTestId('regenerate').click()

  await expect(page.getByTestId('pagination').nth(1)).toHaveText('2/2')
  await expect(page.getByTestId('answer_bubble')).toContainText('Answer2')

  // Test case 3: Add question on answer
  await page.getByTestId('pagination').getByTestId('prev').nth(1).click()
  await expect(page.getByTestId('pagination').nth(1)).toHaveText('1/2')

  await mockCopilotCompletion(page, ['Answer3'], 'Test Call')
  await page
    .getByTestId('chat_input')
    .locator('.cm-content')
    .pressSequentially('Question3', {delay})
  await page.click('[data-testid="send"]')

  await expect(page.getByTestId('answer_bubble').nth(1)).toContainText('Answer3')
})
