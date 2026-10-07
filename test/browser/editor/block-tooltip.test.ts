import test, {expect} from '@playwright/test'
import {mockCopilotApiToken, mockCopilotCompletion, mockCopilotModels} from '../assistant/mock'
import {assertEditorLineToEqual, delay, openBlockMenu, setupDB} from '../utils'

const cmContent = '.cm-editor > .cm-scroller > .cm-content'

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
  await page.waitForTimeout(1000)
  await page.getByTestId('new_editor').click()
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
  await mockCopilotCompletion(page, {text: 'Hello World'})

  // Replace h1
  await openBlockMenu(page, 1)
  await page.getByTestId('ai_rephrasing').click()
  await page
    .getByTestId('input_line')
    .locator(`> ${cmContent}`)
    .pressSequentially('my question', {delay})
  await page.keyboard.press('Enter')
  await assertEditorLineToEqual(page, 1, 'Hello World')

  // Replace paragraph
  await openBlockMenu(page, 2)
  await page.getByTestId('ai_rephrasing').click()
  await page
    .getByTestId('input_line')
    .locator(`> ${cmContent}`)
    .pressSequentially('my question', {delay})
  await page.keyboard.press('Enter')
  await assertEditorLineToEqual(page, 1, 'Hello World')

  // Replace code block
  await openBlockMenu(page, 3)
  await page.getByTestId('ai_rephrasing').click()
  await page
    .getByTestId('input_line')
    .locator(`> ${cmContent}`)
    .pressSequentially('my question', {delay})
  await page.keyboard.press('Enter')
  await expect(page.locator(cmContent)).toHaveText('Hello World')
})
