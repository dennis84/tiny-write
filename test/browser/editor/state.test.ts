import {expect, test} from '@playwright/test'
import {delay, lineTextEq} from '../utils'

test.beforeEach(async ({page}) => {
  await page.goto('/')
})

test('load state from db', async ({page}) => {
  await page.waitForSelector('[data-testid="initialized"]')
  await page.click('[data-testid="floating_navbar_menu_open"]')
  await lineTextEq(page, 1, 'Start typing ...')

  await page.locator('.ProseMirror').pressSequentially('foo', {delay})

  await page.waitForTimeout(200)
  await page.reload()

  await page.waitForSelector('[data-testid="initialized"]')
  await expect(page.locator('.ProseMirror p')).toHaveText('foo')
})

test('open file', async ({page}) => {
  await page.waitForSelector('[data-testid="initialized"]')
  await page.click('[data-testid="floating_navbar_menu_open"]')
  await expect(page.locator('[data-testid="tree_link"]')).toHaveCount(1)
  await expect(page.locator('[data-testid="tree_link"]')).toContainText('Untitled')

  await page.locator('.ProseMirror').pressSequentially('test1', {delay})
  await expect(page.locator('[data-testid="tree_link"]')).toHaveCount(1)
  await expect(page.locator('[data-testid="tree_link"]')).toContainText('test1')

  await page.click('[data-testid="new"]')
  await page.click('[data-testid="new_file"]')
  await expect(page.locator('[data-testid="tree_link"]')).toHaveCount(2)
  await lineTextEq(page, 1, 'Start typing ...')
  await page.locator('.ProseMirror').pressSequentially('test2', {delay})
  await expect(page.locator('[data-testid="tree_link"]')).toHaveCount(2)
  await expect(page.locator('[data-testid="tree_link"]').nth(1)).toContainText('test2')

  await page.click('[data-testid="new"]')
  await page.click('[data-testid="new_file"]')
  await expect(page.locator('[data-testid="tree_link"]')).toHaveCount(3)
  await lineTextEq(page, 1, 'Start typing ...')

  await expect(page.locator('[data-testid="tree_link"]').nth(0)).toContainText('test1')
  await expect(page.locator('[data-testid="tree_link"]').nth(1)).toContainText('test2')
  await expect(page.locator('[data-testid="tree_link"]').nth(2)).toContainText('Untitled')
  await page.locator('[data-testid="tree_link_title"]').nth(0).click()
  await page.waitForTimeout(100)
  await lineTextEq(page, 1, 'test1')
  await expect(page.locator('[data-testid="tree_link"]')).toHaveCount(3)

  // Unmodified files are currently not saved
  await page.reload()
  await page.click('[data-testid="floating_navbar_menu_open"]')
  await lineTextEq(page, 1, 'test1')
  await expect(page.locator('[data-testid="tree_link"]')).toHaveCount(2)
})
