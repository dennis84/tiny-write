import {test, expect} from '@playwright/test'
import {delay} from '../utils'

test.beforeEach(async ({page}) => {
  await page.goto('/')
  await page.waitForSelector('[data-testid="initialized"]')
})

test('type text', async ({page}) => {
  await page.locator('.ProseMirror').pressSequentially('text', {delay})
  await expect(page.locator('.ProseMirror')).toHaveText('text')
  await page.keyboard.press('Enter')

  await page.locator('.ProseMirror').pressSequentially('# hl1', {delay})
  await expect(page.locator('.ProseMirror h1')).toHaveText('hl1')
  await page.keyboard.press('Enter')

  await page.locator('.ProseMirror').pressSequentially('## hl2', {delay})
  await expect(page.locator('.ProseMirror h2')).toHaveText('hl2')
  await page.keyboard.press('Enter')

  await page.locator('.ProseMirror').pressSequentially('### hl3', {delay})
  await expect(page.locator('.ProseMirror h3')).toHaveText('hl3')
  await page.keyboard.press('Enter')

  await page.locator('.ProseMirror').pressSequentially('> blockquote', {delay})
  await expect(page.locator('.ProseMirror blockquote')).toHaveText('blockquote')
  await page.keyboard.press('Enter')
  await page.keyboard.press('Enter')

  await page.locator('.ProseMirror').pressSequentially('- item1', {delay})
  await page.keyboard.press('Enter')
  await page.locator('.ProseMirror').pressSequentially('item2', {delay})
  await expect(page.locator('.ProseMirror ul li:nth-of-type(1)')).toHaveText('item1')
  await expect(page.locator('.ProseMirror ul li:nth-of-type(2)')).toHaveText('item2')
  await page.keyboard.press('Enter')
  await page.keyboard.press('Enter')
})
