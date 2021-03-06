import {clearText, lineText} from './utils'

beforeAll(async () => {
  await page.goto('http://localhost:3000')
})

it('create image', async () => {
  await page.type('.ProseMirror', '![](http://localhost:3000/screenshot-light.png) ')
  await page.waitForSelector('.ProseMirror p .image-container img')
})

it('image from url does not exist', async () => {
  await page.type('.ProseMirror', '![](http://localhost:3000/123.png) ')
  await page.waitForSelector('.ProseMirror p .image-container img')
})

it('do nothing if image path does not exist', async () => {
  const input = '![](/foo/bar/test.txt) can continue to write'
  await clearText()
  await page.type('.ProseMirror', input)
  expect(await lineText()).toBe(input)
})
