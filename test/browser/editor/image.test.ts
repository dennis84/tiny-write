import {type Page, expect, test} from '@playwright/test'
import {delay, openBlockMenu} from '../utils'

test.beforeEach(async ({page}) => {
  await page.goto('/')
  await page.waitForSelector('[data-testid="initialized"]')
})

const getHandlePoint = async (page: Page) => {
  const box = await page.locator(`.ProseMirror p .image-container img`).boundingBox()
  return [(box?.x ?? 0) + (box?.width ?? 0), (box?.y ?? 0) + (box?.height ?? 0)]
}

test('create image', async ({page}) => {
  const url = 'http://localhost:3000/screenshot-light.png'
  await page.locator('.ProseMirror').pressSequentially(`![](${url}) `, {delay})
  await page.waitForSelector(`.ProseMirror p .image-container img[src="${url}"]`)

  // resize
  const [x, y] = await getHandlePoint(page)
  await page.mouse.move(x - 10, y - 10)
  await page.mouse.down()
  await page.mouse.move(x - 100, y)
  await page.mouse.up()

  const [newX] = await getHandlePoint(page)
  expect(newX).toBe(x - 90)

  // align
  await expect(page.locator(`.ProseMirror p .image-container`)).toHaveClass(/float-left/)
  await page.click(`.ProseMirror p .image-container`)
  await openBlockMenu(page, 1)
  await page.getByTestId('align_float_right').click()
  await expect(page.locator(`.ProseMirror p .image-container`)).toHaveClass(/float-right/)
  await openBlockMenu(page, 1)
  await page.getByTestId('align_center').click()
  await expect(page.locator(`.ProseMirror p .image-container`)).toHaveClass(/center/)
})

test('image from url does not exist', async ({page}) => {
  const url = 'http://localhost:3000/123.png'
  await page.locator('.ProseMirror').pressSequentially(`![](${url}) `, {delay})
  await page.waitForSelector(`.ProseMirror p .image-container img[src="${url}"]`, {
    state: 'attached',
  })
})
