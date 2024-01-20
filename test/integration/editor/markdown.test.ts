import {test, expect} from '@playwright/test'
import {delay, lineTextEq} from '../utils'

test.beforeEach(async ({page}) => {
  await page.goto('/')
  await page.waitForSelector('[data-testid="initialized"]')
})

test('html to markdown and back', async ({page}) => {
  await page.locator('.ProseMirror').pressSequentially('# title', {delay})
  await page.keyboard.press('Enter')
  await page.locator('.ProseMirror').pressSequentially('> blockquote', {delay})

  await expect(page.locator('.ProseMirror h1')).toHaveText('title')
  await expect(page.locator('.ProseMirror blockquote')).toHaveText('blockquote')

  await page.click('[data-testid="burger"]')
  await page.click('[data-testid="markdown"]')

  await lineTextEq(page, 1, '# title')
  await lineTextEq(page, 2, '')
  await lineTextEq(page, 3, '> blockquote')

  await page.click('[data-testid="markdown"]')
  await expect(page.locator('.ProseMirror h1')).toHaveText('title')
  await expect(page.locator('.ProseMirror blockquote')).toHaveText('blockquote')

  // toggle markdown when open file
  await page.click('[data-testid="new_file"]')
  await page.click('[data-testid="markdown"]')
  await page.keyboard.press('Backspace') // markdown mode adds an extra newline

  await page.locator('.ProseMirror').pressSequentially('# markdown', {delay})
  await lineTextEq(page, 1, '# markdown')

  await expect(page.locator('[data-testid="tree_link"]')).toHaveCount(2)
  await expect(page.locator('[data-testid="tree_link"]:nth-child(1)')).toContainText('title')
  await expect(page.locator('[data-testid="tree_link"]:nth-child(2)')).toContainText('markdown')
  await page.click('[data-testid="tree_link"]:nth-child(1) span')

  await expect(page.locator('.ProseMirror h1')).toHaveText('title')
  await expect(page.locator('.ProseMirror blockquote')).toHaveText('blockquote')

  await page.click('[data-testid="tree_link"]:nth-child(2) span')
  await lineTextEq(page, 1, '# markdown')
})
