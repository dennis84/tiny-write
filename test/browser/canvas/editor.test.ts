import {expect, test} from '@playwright/test'

test.beforeEach(async ({page}) => {
  await page.goto('/canvas')
  await page.waitForSelector('[data-testid="new_canvas_page"]')
})

test('add editor file', async ({page}) => {
  await page.click('[data-testid="new_canvas"]')

  expect(page.locator('[data-testid="canvas_container"]')).toBeVisible()

  // Create file
  await page.locator('[data-testid="canvas_container"]').click({button: 'right'})
  await page.click('[data-testid="context_menu_new_file"]')
  await expect(page.locator('[data-testid="canvas_editor"]')).toHaveCount(1)

  // Move mouse to left link handle
  const box = await page.locator('[data-testid="edge_left_link_handle"]').boundingBox()
  expect(box).toBeDefined()
  if (!box) return

  await page.mouse.move(box.x + box.width / 2, box.y + box.width / 2)
  await page.mouse.down()
  await page.mouse.move(box.x - 100, box.y)
  await page.mouse.up()

  // Create another file
  await page.click('[data-testid="context_menu_new_file"]')

  await expect(page.locator('[data-testid="canvas_editor"]')).toHaveCount(2)

  // Clear canvas
  await page.click('[data-testid="navbar_menu_open"]')
  await page.click('[data-testid="clear_canvas"]')
  await page.click('[data-testid="confirm"]')

  await expect(page.locator('[data-testid="canvas_editor"]')).toHaveCount(0)
})
