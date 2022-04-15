import {test} from '@playwright/test'
import {delay, lineTextEq} from './utils'

test.beforeEach(async ({page}) => {
  await page.goto('/')
  await page.waitForSelector('[data-testid="initialized"]')
})

test('create image', async ({page}) => {
  const url = 'http://localhost:3000/screenshot-light.jpg'
  await page.type('.ProseMirror', `![](${url}) `, {delay})
  await page.waitForSelector(`.ProseMirror p .image-container img[src="${url}"]`)
})

test('image from url does not exist', async ({page}) => {
  const url = 'http://localhost:3000/123.png'
  await page.type('.ProseMirror', `![](${url}) `, {delay})
  await page.waitForSelector(`.ProseMirror p .image-container img[src="${url}"]`, {state: 'attached'})
})

test('do nothing if image path does not exist', async ({page}) => {
  const input = '![](/foo/bar/test.txt) can continue to write'
  await page.type('.ProseMirror', input, {delay})
  await lineTextEq(page, 1, input)
})
