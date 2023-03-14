import {Page, test, expect} from '@playwright/test'
import {delay, move} from './utils'

const code = "const foo='bar'"

const cmContent = '.cm-container > .cm-editor > .cm-scroller > .cm-content'

test.beforeEach(async ({page}) => {
  await page.goto('/')
  await page.waitForSelector('[data-testid="initialized"]')
})

const openBlockMenu = async (page: Page, nth: number) => {
  const box = (await page.locator(`.ProseMirror *:nth-child(${nth}) .block-handle`).boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.up()
}

test('code block', async ({page}) => {
  await page.type('.ProseMirror', '```javascript ', {delay})
  await page.waitForSelector('.cm-container')
  await page.type(cmContent, code, {delay})
  expect(await page.$eval('.cm-container .lang-toggle img', (node) => node.getAttribute('title'))).toBe('javascript')

  // prettify
  await openBlockMenu(page, 1)
  await page.click('[data-testid="prettify"]')
  expect(await page.textContent(cmContent)).toBe("const foo = 'bar'")

  // change lang
  await page.click('.cm-container .lang-toggle')
  await page.type('.cm-container .lang-input', 'typescript', {delay})
  await page.keyboard.press('Enter')
  expect(await page.$eval('.cm-container .lang-toggle img', (node) => node.getAttribute('title'))).toBe('typescript')

  // change lang via block menu
  await openBlockMenu(page, 1)
  await page.click('[data-testid="change-lang"]')
  await page.type('.cm-container .lang-input', 'js', {delay})
  await page.keyboard.press('Enter')
  expect(await page.$eval('.cm-container .lang-toggle img', (node) => node.getAttribute('title'))).toBe('js')

  // create line above
  await move(page, 'ArrowUp')
  await page.type('.ProseMirror', 'above', {delay})
  expect(await page.textContent('.ProseMirror p:nth-of-type(1)')).toBe('above')

  // create line below
  await move(page, 'ArrowDown', 2)
  await page.keyboard.press('Control+Enter')
  await page.type('.ProseMirror', 'below', {delay})
  expect(await page.textContent('.ProseMirror p:nth-of-type(2)')).toBe('below')
})

test('mermaid', async ({page}) => {
  const line1 = 'flowchart'
  await page.type('.ProseMirror', '```mermaid ', {delay})
  await page.waitForSelector('.cm-container')
  await page.type(cmContent, line1, {delay})
  await page.keyboard.press('Enter')
  await page.type(cmContent, '  A --', {delay})
  await page.waitForTimeout(100)

  expect(await page.textContent('.mermaid')).toContain('Parse error')
  await page.type(cmContent, '> B', {delay})
  await page.waitForSelector('.mermaid svg')
})
