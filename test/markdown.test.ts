import {lineText} from './utils'

beforeAll(async () => {
  await page.goto('http://localhost:3000')
})

it('html to markdown and back', async () => {
  await page.type('.ProseMirror', '# title')
  await page.keyboard.press('Enter')
  await page.type('.ProseMirror', '> blockquote')

  expect(await page.textContent('.ProseMirror h1')).toBe('title')
  expect(await page.textContent('.ProseMirror blockquote')).toBe('blockquote')

  await page.click('[data-testid="burger"]')
  await page.click('[data-testid="markdown"]')

  expect(await lineText(1)).toBe('# title')
  expect(await lineText(2)).toBe('')
  expect(await lineText(3)).toBe('> blockquote')

  await page.click('[data-testid="markdown"]')
  expect(await page.textContent('.ProseMirror h1')).toBe('title')
  expect(await page.textContent('.ProseMirror blockquote')).toBe('blockquote')
})

it('toggle markdown when open file', async () => {
  await page.click('[data-testid="new"]')
  await page.click('[data-testid="markdown"]')

  await page.type('.ProseMirror', '# markdown')
  expect(await lineText(1)).toBe('# markdown')

  await page.click('[data-testid="open"]')
  expect(await page.textContent('.ProseMirror h1')).toBe('title')
  expect(await page.textContent('.ProseMirror blockquote')).toBe('blockquote')

  await page.click('[data-testid="open"]')
  expect(await lineText(1)).toBe('# markdown')
})
