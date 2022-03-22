import {test, expect} from '@playwright/test'
import {delay} from './utils'

test.beforeEach(async ({page}) => {
  await page.goto('/')
})

test('init', async ({page}) => {
  await page.waitForSelector('[data-testid="initialized"]')
  await page.click('[data-testid="burger"]')
  expect(await page.textContent('[data-testid="last-modified"]')).toContain('Nothing yet')
  await page.type('.ProseMirror', 'foo', {delay})
  expect(await page.textContent('[data-testid="last-modified"]')).not.toContain('Nothing yet')

  await page.waitForTimeout(200)
  await page.reload()
  await page.waitForSelector('[data-testid="initialized"]')
  expect(await page.textContent('.ProseMirror p')).toBe('foo')
})
