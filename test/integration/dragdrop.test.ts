import {test, expect} from '@playwright/test'
import {delay, lineTextEq} from './utils'

test.beforeEach(async ({page}) => {
  await page.goto('/')
  await page.waitForSelector('[data-testid="initialized"]')
})

test('drag drop', async ({page}) => {
  await page.type('.ProseMirror', 'Line 1', {delay})
  await page.keyboard.press('Enter')
  await page.type('.ProseMirror', 'Line 2', {delay})
  await page.keyboard.press('Enter')
  await page.type('.ProseMirror', 'Line 3', {delay})
  expect(await lineTextEq(page, 1, 'Line 1'))
  expect(await lineTextEq(page, 2, 'Line 2'))
  expect(await lineTextEq(page, 3, 'Line 3'))

  const box = await page.locator('.ProseMirror p:nth-of-type(1) .handle').boundingBox()
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + 100, box.y + 500)
  await page.mouse.up()

  expect(await lineTextEq(page, 1, 'Line 2'))
  expect(await lineTextEq(page, 2, 'Line 3'))
  expect(await lineTextEq(page, 3, 'Line 1'))
})
