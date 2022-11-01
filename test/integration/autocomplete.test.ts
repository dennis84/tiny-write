import {test, expect} from '@playwright/test'
import {delay, lineTextEq} from './utils'

test.beforeEach(async ({page}) => {
  await page.goto('/')
  await page.waitForSelector('[data-testid="initialized"]')
})

test('autocomplete', async ({page}) => {
  await page.type('.ProseMirror', 'foobar foobaz', {delay})
  await page.waitForTimeout(500)

  await page.keyboard.press('Enter')
  await page.type('.ProseMirror', 'f', {delay})
  expect(await page.textContent('.autocomplete div:nth-child(1)')).toContain('foobar')
  expect(await page.textContent('.autocomplete div:nth-child(2)')).toContain('foobaz')
  await page.keyboard.press('Enter')
  await lineTextEq(page, 2, 'foobar')

  await page.keyboard.press('Enter')
  await page.type('.ProseMirror', 'f', {delay})
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('ArrowUp')
  await page.keyboard.press('Enter')
  await lineTextEq(page, 3, 'foobaz')
})
