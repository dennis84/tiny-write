import {test, expect} from '@playwright/test'
import {delay, move} from './utils'

const code = `const foo='bar'`

test.beforeEach(async ({page}) => {
  await page.goto('/')
  await page.waitForSelector('[data-testid="initialized"]')
})

test('code block', async ({page}) => {
  await page.type('.ProseMirror', '```js ', {delay})
  await page.waitForSelector('.codemirror-outer')
  await page.type('.codemirror-inner > .cm-editor .cm-content', code, {delay})
  expect(await page.$eval('.codemirror-outer .lang-toggle img', (node) => node.getAttribute('title'))).toBe('javascript')

  // prettify
  await page.click('.prettify')
  expect(await page.textContent('.codemirror-inner > .cm-editor .cm-content')).toBe(`const foo = 'bar'`)

  // change lang
  await page.click('.codemirror-outer .lang-toggle')
  await page.type('.codemirror-outer .lang-input', 'ts', {delay})
  await page.keyboard.press('Enter')
  expect(await page.$eval('.codemirror-outer .lang-toggle img', (node) => node.getAttribute('title'))).toBe('typescript')

  // create line above
  await move(page, 'ArrowUp')
  await page.type('.ProseMirror p', 'above', {delay})
  expect(await page.textContent('.ProseMirror p:nth-of-type(1)')).toBe('above')

  // create line below
  await move(page, 'ArrowDown', 2)
  await page.keyboard.press('Control+Enter')
  await page.type('.ProseMirror p', 'below', {delay})
  expect(await page.textContent('.ProseMirror p:nth-of-type(2)')).toBe('below')
})

test('mermaid', async ({page}) => {
  const line1 = 'flowchart LR'
  const line2 = "  A --> B"
  await page.type('.ProseMirror', '```mermaid ', {delay})
  await page.waitForSelector('.codemirror-outer')
  await page.type('.codemirror-inner > .cm-editor .cm-content', line1, {delay})
  expect(await page.textContent('.mermaid')).toContain('Parse error')
  await page.keyboard.press('Enter')
  await page.type('.codemirror-inner > .cm-editor .cm-content', line2, {delay})
  await page.waitForSelector('.mermaid svg')
})
