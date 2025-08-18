import {expect, test} from '@playwright/test'
import {delay, lineTextEq} from '../utils'

test.beforeEach(async ({page}) => {
  await page.goto('/')
  await page.waitForSelector('[data-testid="initialized"]')
})

test('inline code', async ({page}) => {
  await page.locator('.ProseMirror').pressSequentially('foo `code`', {delay})
  await page.keyboard.down('ArrowRight')
  await page.locator('.ProseMirror').pressSequentially('bar', {delay})
  await expect(page.locator('.ProseMirror p code')).toHaveText('code')
})

test('code around marks', async ({page}) => {
  await page.locator('.ProseMirror').pressSequentially('foo `inline [link](url) code` bar', {delay})
  await lineTextEq(page, 1, 'foo `inline link code` bar')
  await expect(page.locator('.ProseMirror a')).toHaveText('link')
})
