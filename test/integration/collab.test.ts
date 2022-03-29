import {expect, test} from '@playwright/test'
import {delay, lineTextEq} from './utils'

const room = 'test123'

test('create room', async ({page, browser}) => {
  await page.goto('/')
  const url = page.url()
  await page.waitForSelector('[data-testid="initialized"]')
  await page.click('[data-testid="burger"]')
  await page.click('[data-testid="collab"]')
  expect(url).not.toBe(page.url())
  await page.type('.ProseMirror', 'Hello', {delay})

  const page2 = await browser.newPage()
  await page2.goto(page.url())
  await lineTextEq(page2, 1, 'Hello')
})

test('create room - existing content file', async ({page, browser}) => {
  await page.goto('/')
  await page.waitForSelector('[data-testid="initialized"]')
  await page.type('.ProseMirror', 'Hello', {delay})
  await page.click('[data-testid="burger"]')
  await page.click('[data-testid="collab"]')
  await lineTextEq(page, 1, 'Hello')

  const page2 = await browser.newPage()
  await page2.goto(page.url())
  await lineTextEq(page2, 1, 'Hello')
})

test('existing room', async ({page, browser}) => {
  await page.goto(`/${room}`)
  await page.waitForSelector('[data-testid="initialized"]')
  await page.type('.ProseMirror', 'Hello', {delay})

  const page2 = await browser.newPage()
  await page2.goto(`/${room}`)
  await lineTextEq(page2, 1, 'Hello')
  await page2.type('.ProseMirror', ' World', {delay})

  await lineTextEq(page, 1, 'Hello World')
})
