import {test, expect} from '@playwright/test'
import {delay, move, openBlockMenu} from '../utils'

const code = "const foo='bar'"

const cmContent = '.cm-container > .cm-editor > .cm-scroller > .cm-content'

test.beforeEach(async ({page}) => {
  await page.goto('/')
  await page.getByTestId('initialized').waitFor()
})

test('code block', async ({page}) => {
  await page.locator('.ProseMirror').pressSequentially('```javascript ', {delay})
  await page.waitForSelector('.cm-container')
  await page.locator(cmContent).pressSequentially(code, {delay})
  await expect(page.locator('.cm-container .lang-toggle img')).toHaveAttribute('title', 'javascript')

  // prettify
  await openBlockMenu(page, 1)
  await page.getByTestId('prettify').click()
  await expect(page.locator(cmContent)).toHaveText("const foo = 'bar'")

  // change lang
  await page.click('.cm-container .lang-toggle')
  await page.locator('.cm-container .lang-input').pressSequentially('typescript', {delay})
  await page.keyboard.press('Enter')
  await expect(page.locator('.cm-container .lang-toggle img')).toHaveAttribute('title', 'typescript')

  // change lang via block menu
  await openBlockMenu(page, 1)
  await page.getByTestId('change_lang').click()
  await page.locator('.cm-container .lang-input').pressSequentially('js', {delay})
  await page.keyboard.press('Enter')
  await expect(page.locator('.cm-container .lang-toggle img')).toHaveAttribute('title', 'js')

  // create line above
  await move(page, 'ArrowUp')
  await page.locator('.ProseMirror').pressSequentially('above', {delay})
  await expect(page.locator('.ProseMirror p:nth-of-type(1)')).toHaveText('above')

  // create line below
  await move(page, 'ArrowDown', 2)
  await page.keyboard.press('Control+Enter')
  await page.locator('.ProseMirror').pressSequentially('below', {delay})
  await expect(page.locator('.ProseMirror p:nth-of-type(2)')).toHaveText('below')
})

test('mermaid', async ({page}) => {
  const line1 = 'flowchart'
  await page.locator('.ProseMirror').pressSequentially('```mermaid ', {delay})
  await page.waitForSelector('.cm-container')
  await page.locator(cmContent).pressSequentially(line1, {delay})
  await expect(page.locator(cmContent)).toContainText(line1)
  await page.keyboard.press('Enter')
  await page.locator(cmContent).pressSequentially('  A --', {delay})
  await expect(page.locator(cmContent)).toContainText('  A --')

  await expect(page.locator('.mermaid code')).toContainText('Parse error')
  await page.locator(cmContent).pressSequentially('> B', {delay})
  await page.waitForSelector('.mermaid svg')
})
