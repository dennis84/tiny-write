import {clearText, delay, lineTextEq} from './utils'

beforeAll(async () => {
  await page.goto('http://localhost:3000')
  await page.waitForSelector('[data-testid="initialized"]')
  await page.waitForTimeout(10)
})

it('create image', async () => {
  await page.type('.ProseMirror', '![](http://localhost:3000/screenshot-light.jpg) ', {delay})
  await page.waitForSelector('.ProseMirror p .image-container img')
})

it('image from url does not exist', async () => {
  await page.type('.ProseMirror', '![](http://localhost:3000/123.jpg) ', {delay})
  await page.waitForSelector('.ProseMirror p .image-container img')
})

it('do nothing if image path does not exist', async () => {
  const input = '![](/foo/bar/test.txt) can continue to write'
  await clearText()
  await page.type('.ProseMirror', input, {delay})
  await lineTextEq(1, input)
})
