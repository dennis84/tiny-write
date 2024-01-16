import {expect, test} from '@playwright/test'
import {delay, lineTextEq} from '../utils'

test('create room', async ({page, browser}) => {
  await page.goto('/')
  const url = page.url()
  await page.waitForSelector('[data-testid="initialized"]')
  await page.click('[data-testid="burger"]')
  await page.click('[data-testid="collab"]')
  expect(url).not.toBe(page.url())
  await page.locator('.ProseMirror').pressSequentially('Hello', {delay})

  const page2 = await browser.newPage()
  await page2.goto(page.url())
  await lineTextEq(page2, 1, 'Hello')
})

test('create room - existing content file', async ({page, browser}) => {
  await page.goto('/')
  await page.waitForSelector('[data-testid="initialized"]')
  await page.locator('.ProseMirror').pressSequentially('Hello', {delay})
  await page.click('[data-testid="burger"]')
  await page.click('[data-testid="collab"]')
  await lineTextEq(page, 1, 'Hello')

  const page2 = await browser.newPage()
  await page2.goto(page.url())
  await lineTextEq(page2, 1, 'Hello')
})

test('existing room', async ({page, browser}) => {
  const room = 'test-1'
  await page.goto(`/${room}`)
  await page.waitForSelector('[data-testid="initialized"]')
  await page.locator('.ProseMirror').pressSequentially('Hello', {delay})

  const page2 = await browser.newPage()
  await page2.goto(`/${room}`)
  await lineTextEq(page2, 1, 'Hello')
  await page2.locator('.ProseMirror').pressSequentially(' World', {delay})

  await lineTextEq(page, 1, 'Hello World')
})

test('existing room - backup', async ({page}) => {
  const room = 'test-2'
  await page.goto('/')
  await page.locator('.ProseMirror').pressSequentially('123', {delay})

  await page.goto(`/${room}`)
  await page.waitForSelector('[data-testid="initialized"]')
  await page.locator('.ProseMirror').pressSequentially('Hello', {delay})
  await lineTextEq(page, 1, 'Hello')

  await page.click('[data-testid="burger"]')
  await expect(page.locator('[data-testid="tree_link"]')).toHaveCount(2)
  await expect(page.locator('[data-testid="tree_link"]:nth-child(1)')).toContainText('123')
  await expect(page.locator('[data-testid="tree_link"]:nth-child(2)')).toContainText('Hello')

  await page.click('[data-testid="tree_link"]:nth-child(1)')
  await lineTextEq(page, 1, '123')

  await expect(page.locator('[data-testid="tree_link"]')).toHaveCount(2)
})
