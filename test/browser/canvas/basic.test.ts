import {test, expect, Page} from '@playwright/test'

test.beforeEach(async ({page}) => {
  await page.goto('/')
  await page.waitForSelector('[data-testid="initialized"]')
})

const clickTreeMenu = async (page: Page, nth: number, buttonId: string) => {
  const box = await page.locator(`[data-testid="tree_link"]:nth-child(${nth})`).boundingBox()
  await page.mouse.move(box?.x ?? 0, box?.y ?? 0)
  await page.click('[data-testid="tree_link_menu"]')
  await page.click(`[data-testid="${buttonId}"]`)
}

test('add file', async ({page}) => {
  await page.click('[data-testid="menu_button"]')
  await clickTreeMenu(page, 1, 'add_canvas')

  await page.isVisible('[data-testid="canvas_container"]')

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
})
