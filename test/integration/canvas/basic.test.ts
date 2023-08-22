import {test, expect} from '@playwright/test'

test.beforeEach(async ({page}) => {
  await page.goto('/')
  await page.waitForSelector('[data-testid="initialized"]')
})

test('add file', async ({page}) => {
  await page.click('[data-testid="burger"]')
  await page.click('[data-testid="canvases"]')
  await page.click('[data-testid="new-canvas"]')

  await page.isVisible('[data-testid="canvas-container"]')

  // Create file
  await page.click('[data-testid="back"]')
  await page.click('[data-testid="new-file"]')

  expect(await page.locator('[data-testid="canvas-editor"]')).toHaveCount(1)

  // Move mouse to left link handle
  const box = await page.locator('[data-testid="edge_left_link_handle"]').boundingBox()
  expect(box).toBeDefined()

  await page.mouse.move(box?.x + box?.width / 2, box?.y + box?.width / 2)
  await page.mouse.down()
  await page.mouse.move(box?.x - 100, box?.y)
  await page.mouse.up()

  // Create another file
  await page.click('[data-testid="link_end_new_file"]')

  expect(await page.locator('[data-testid="canvas-editor"]')).toHaveCount(2)
})
