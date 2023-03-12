import {test, expect} from '@playwright/test'
import {delay, lineTextEq} from './utils'

test.beforeEach(async ({page}) => {
  await page.goto('/')
  await page.waitForSelector('[data-testid="initialized"]')
})

test('html to markdown and back', async ({page}) => {
  await page.type('.ProseMirror', '# title', {delay})
  await page.keyboard.press('Enter')
  await page.type('.ProseMirror', '> blockquote', {delay})

  expect(await page.textContent('.ProseMirror h1')).toBe('title')
  expect(await page.textContent('.ProseMirror blockquote')).toBe('blockquote')

  await page.click('[data-testid="burger"]')
  await page.click('[data-testid="markdown"]')

  await lineTextEq(page, 1, '# title')
  await lineTextEq(page, 2, '')
  await lineTextEq(page, 3, '> blockquote')

  await page.click('[data-testid="markdown"]')
  expect(await page.textContent('.ProseMirror h1')).toBe('title')
  expect(await page.textContent('.ProseMirror blockquote')).toBe('blockquote')

  // toggle markdown when open file
  await page.click('[data-testid="new"]')
  await page.click('[data-testid="markdown"]')

  await page.type('.ProseMirror', '# markdown', {delay})
  await lineTextEq(page, 2, '# markdown')

  await page.click('[data-testid="files"]')
  expect(await page.locator('[data-testid="file-list"] > div').count()).toBe(2)
  expect(await page.textContent('[data-testid="file-list"] > div:nth-child(1)')).toContain('markdown')
  expect(await page.textContent('[data-testid="file-list"] > div:nth-child(2)')).toContain('title')
  await page.click('[data-testid="file-list"] > div:nth-child(2) > div')

  expect(await page.textContent('.ProseMirror h1')).toBe('title')
  expect(await page.textContent('.ProseMirror blockquote')).toBe('blockquote')

  await page.click('[data-testid="file-list"] > div:nth-child(1) > div')
  await lineTextEq(page, 2, '# markdown')
})
