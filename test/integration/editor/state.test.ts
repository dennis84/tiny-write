import {test, expect} from '@playwright/test'
import {delay, lineTextEq} from '../utils'

test.beforeEach(async ({page}) => {
  await page.goto('/')
})

test('load state from db', async ({page}) => {
  await page.waitForSelector('[data-testid="initialized"]')
  await page.click('[data-testid="burger"]')
  await expect(page.locator('[data-testid="last_modified"]')).toContainText('Nothing yet')

  await page.locator('.ProseMirror').pressSequentially('foo', {delay})
  await expect(page.locator('[data-testid="last_modified"]')).not.toContainText('Nothing yet')

  await page.waitForTimeout(200)
  await page.reload()
  await page.waitForSelector('[data-testid="initialized"]')
  await expect(page.locator('.ProseMirror p')).toHaveText('foo')
})

test('open file', async ({page}) => {
  await page.waitForSelector('[data-testid="initialized"]')
  await page.click('[data-testid="burger"]')
  await page.click('[data-testid="files"]')
  await expect(page.locator('[data-testid="file_list"] > div')).toHaveCount(0)

  await page.locator('.ProseMirror').pressSequentially('test1', {delay})
  await expect(page.locator('[data-testid="file_list"] > div')).toHaveCount(1)

  await page.click('[data-testid="new_doc"]')
  await expect(page.locator('[data-testid="file_list"] > div')).toHaveCount(1)
  await lineTextEq(page, 1, 'Start typing ...')
  await page.locator('.ProseMirror').pressSequentially('test2', {delay})
  await expect(page.locator('[data-testid="file_list"] > div')).toHaveCount(2)

  await page.click('[data-testid="new_doc"]')
  await expect(page.locator('[data-testid="file_list"] > div')).toHaveCount(2)
  await lineTextEq(page, 1, 'Start typing ...')

  await expect(page.locator('[data-testid="file_list"] > div:nth-child(1)')).toContainText('test2')
  await expect(page.locator('[data-testid="file_list"] > div:nth-child(2)')).toContainText('test1')
  await page.click('[data-testid="file_list"] > div:nth-child(2) > div')

  await page.waitForTimeout(100)
  await lineTextEq(page, 1, 'test1')
  await expect(page.locator('[data-testid="file_list"] > div')).toHaveCount(2)

  await page.reload()

  await page.click('[data-testid="burger"]')
  await page.click('[data-testid="files"]')
  await lineTextEq(page, 1, 'test1')
  await expect(page.locator('[data-testid="file_list"] > div')).toHaveCount(2)
})
