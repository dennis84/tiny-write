import {test} from '@playwright/test'
import {delay} from '../utils'

test.beforeEach(async ({page}) => {
  await page.goto('/')
  await page.waitForSelector('[data-testid="initialized"]')
})

test('create image', async ({page}) => {
  const url = 'http://localhost:3000/screenshot-light.png'
  await page.type('.ProseMirror', `![](${url}) `, {delay})
  await page.waitForSelector(`.ProseMirror p .image-container img[src="${url}"]`)
})

test('image from url does not exist', async ({page}) => {
  const url = 'http://localhost:3000/123.png'
  await page.type('.ProseMirror', `![](${url}) `, {delay})
  await page.waitForSelector(`.ProseMirror p .image-container img[src="${url}"]`, {state: 'attached'})
})
