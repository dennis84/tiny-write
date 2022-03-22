import {test, expect} from '@playwright/test'
import {delay, lineTextEq} from './utils'

test.beforeEach(async ({page}) => {
  await page.goto('/')
  await page.waitForSelector('[data-testid="initialized"]')
  await page.waitForTimeout(10)
})

test('inline code', async ({page}) => {
  await page.type('.ProseMirror', 'foo `code` bar', {delay})
  expect(await page.textContent('.ProseMirror p code')).toBe('code')
})

test('code around marks', async ({page}) => {
  await page.type('.ProseMirror', 'foo `inline [link](url) code` bar', {delay})
  await lineTextEq(page, 1, 'foo `inline link code` bar')
  expect(await page.textContent('.ProseMirror a')).toBe('link')
})
