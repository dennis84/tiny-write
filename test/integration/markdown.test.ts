import {delay, lineTextEq} from './utils'

beforeAll(async () => {
  await page.goto('http://localhost:3000')
  await page.waitForSelector('[data-testid="initialized"]')
  await page.waitForTimeout(10)
})

it('html to markdown and back', async () => {
  await page.type('.ProseMirror', '# title', {delay})
  await page.keyboard.press('Enter')
  await page.type('.ProseMirror', '> blockquote', {delay})

  expect(await page.textContent('.ProseMirror h1')).toBe('title')
  expect(await page.textContent('.ProseMirror blockquote')).toBe('blockquote')

  await page.click('[data-testid="burger"]')
  await page.click('[data-testid="markdown"]')

  await lineTextEq(1, '# title')
  await lineTextEq(2, '')
  await lineTextEq(3, '> blockquote')

  await page.click('[data-testid="markdown"]')
  expect(await page.textContent('.ProseMirror h1')).toBe('title')
  expect(await page.textContent('.ProseMirror blockquote')).toBe('blockquote')
})

it('toggle markdown when open file', async () => {
  await page.click('[data-testid="new"]')
  await page.click('[data-testid="markdown"]')

  await page.type('.ProseMirror', '# markdown', {delay})
  await lineTextEq(1, '# markdown')

  await page.click('[data-testid="open"]')
  expect(await page.textContent('.ProseMirror h1')).toBe('title')
  expect(await page.textContent('.ProseMirror blockquote')).toBe('blockquote')

  await page.click('[data-testid="open"]')
  await lineTextEq(1, '# markdown')
})
