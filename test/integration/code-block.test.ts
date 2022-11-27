import {test, expect} from '@playwright/test'
import {delay, move} from './utils'

const code = "const foo='bar'"

const cmContent = '.cm-container > .cm-editor > .cm-scroller > .cm-content'

test.beforeEach(async ({page}) => {
  await page.goto('/')
  await page.waitForSelector('[data-testid="initialized"]')
})

test('code block', async ({page}) => {
  await page.type('.ProseMirror', '```javascript ', {delay})
  await page.waitForSelector('.cm-container')
  await page.type(cmContent, code, {delay})
  expect(await page.$eval('.cm-container .lang-toggle img', (node) => node.getAttribute('title'))).toBe('javascript')

  // prettify
  await page.click('.prettify')
  expect(await page.textContent(cmContent)).toBe("const foo = 'bar'")

  // change lang
  await page.click('.cm-container .lang-toggle')
  await page.type('.cm-container .lang-input', 'typescript', {delay})
  await page.keyboard.press('Enter')
  expect(await page.$eval('.cm-container .lang-toggle img', (node) => node.getAttribute('title'))).toBe('typescript')

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
  const line1 = 'flowchart LR'
  const line2 = '  A --> B'
  await page.type('.ProseMirror', '```mermaid ', {delay})
  await page.waitForSelector('.cm-container')
  await page.type(cmContent, line1, {delay})
  await page.waitForTimeout(100)
  expect(await page.textContent('.mermaid')).toContain('Parse error')
  await page.keyboard.press('Enter')
  await page.type(cmContent, line2, {delay})
  await page.waitForSelector('.mermaid svg')
})
