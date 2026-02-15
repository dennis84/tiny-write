import test, {expect} from '@playwright/test'
import {mockCopilotApiToken, mockCopilotCompletion, setupDB} from '../assistant/mock'
import {assertEditorLineToEqual, delay, openBlockMenu} from '../utils'

const cmContent = '.cm-editor > .cm-scroller > .cm-content'

test.beforeEach(async ({page}) => {
  await setupDB(page, {
    ai: {
      main: {copilot: {user: 'johndoe', accessToken: 'AT-123'}},
    },
  })

  await page.goto('/')
  await page.waitForTimeout(1000)
  await page.click('[data-testid="new_editor"]')
  await page.getByTestId('initialized').waitFor()

  await page.locator('.ProseMirror').pressSequentially('# Title', {delay})
  await assertEditorLineToEqual(page, 1, 'Title')
  await page.keyboard.press('Enter')

  await page.locator('.ProseMirror').pressSequentially('text', {delay})
  await assertEditorLineToEqual(page, 2, 'text')
  await page.keyboard.press('Enter')

  await page.locator('.ProseMirror').pressSequentially('``` ', {delay})
  await page.waitForSelector('.cm-container')
  await page.locator(cmContent).pressSequentially('code', {delay})
  await expect(page.locator(cmContent)).toHaveText('code')
})

test('ask copilot', async ({page}) => {
  await mockCopilotApiToken(page)
  await mockCopilotCompletion(page, {text: 'Hello World'})

  // Replace h1
  await openBlockMenu(page, 1)
  await page.getByTestId('copilot_ask_inline').click()
  await page
    .locator(`[data-testid=input_line] > ${cmContent}`)
    .pressSequentially('my question', {delay})
  await page.keyboard.press('Enter')
  await assertEditorLineToEqual(page, 1, 'Hello World')

  // Replace paragraph
  await openBlockMenu(page, 2)
  await page.getByTestId('copilot_ask_inline').click()
  await page
    .locator(`[data-testid=input_line] > ${cmContent}`)
    .pressSequentially('my question', {delay})
  await page.keyboard.press('Enter')
  await assertEditorLineToEqual(page, 1, 'Hello World')

  // Replace code block
  await openBlockMenu(page, 3)
  await page.getByTestId('copilot_ask_inline').click()
  await page
    .locator(`[data-testid=input_line] > ${cmContent}`)
    .pressSequentially('my question', {delay})
  await page.keyboard.press('Enter')
  await expect(page.locator(cmContent)).toHaveText('Hello World')
})
