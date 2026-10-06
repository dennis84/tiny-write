import {expect, test} from '@playwright/test'

test.beforeEach(async ({page}) => {
  await page.goto('/canvas')
  await page.getByTestId('new_canvas_page').waitFor()
})

test('add editor file', async ({page}) => {
  await page.getByTestId('new_canvas').click()

  await expect(page.getByTestId('canvas_container')).toBeVisible()

  // Create file
  await page.getByTestId('canvas_container').click({button: 'right'})
  await page.getByTestId('context_menu_new_file').click()
  await expect(page.getByTestId('canvas_editor')).toHaveCount(1)

  // Move mouse to left link handle
  const box = await page.getByTestId('edge_left_link_handle').boundingBox()
  expect(box).toBeDefined()
  if (!box) return

  await page.mouse.move(box.x + box.width / 2, box.y + box.width / 2)
  await page.mouse.down()
  await page.mouse.move(box.x - 100, box.y)
  await page.mouse.up()

  // Create another file
  await page.getByTestId('context_menu_new_file').click()

  await expect(page.getByTestId('canvas_editor')).toHaveCount(2)

  // Clear canvas
  await page.getByTestId('current_item_button').click()
  await page.getByTestId('clear_canvas').click()
  await page.getByTestId('confirm').click()

  await expect(page.getByTestId('canvas_editor')).toHaveCount(0)
})
