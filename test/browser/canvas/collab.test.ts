import {test, expect} from '@playwright/test'
import {v4 as uuidv4} from 'uuid'
import {delay} from '../utils'

test('share', async ({page, browser}) => {
  const id = uuidv4()
  await page.goto(`/canvas/${id}`)

  await page.isVisible('[data-testid="canvas_container"]')

  await page.click('[data-testid="menu_button"]')
  await page.click('[data-testid="collab"]')

  await page
    .locator('[data-testid="canvas_container"]')
    .click({button: 'right', position: {x: 1, y: 1}})
  await page.click('[data-testid="context_menu_new_file"]')

  await expect(page.locator('[data-testid="canvas_editor"]')).toHaveCount(1)

  const page2 = await browser.newPage()
  await page2.goto(page.url())

  await expect(page2.locator('[data-testid="canvas_editor"]')).toHaveCount(1)
  await page2
    .locator('[data-testid="canvas_container"]')
    .click({button: 'right', position: {x: 400, y: 1}})
  await page2.click('[data-testid="context_menu_new_file"]')

  await expect(page2.locator('[data-testid="canvas_editor"]')).toHaveCount(2)
  await expect(page.locator('[data-testid="canvas_editor"]')).toHaveCount(2)

  await page2.locator('[data-testid="canvas_container"]').dblclick({position: {x: 410, y: 10}})

  await page.locator('.ProseMirror').nth(1).pressSequentially('Hello', {delay})

  expect(page.locator('.ProseMirror').nth(1)).toHaveText('Hello')

  expect(page2.locator('.ProseMirror').nth(1)).toHaveText('Hello')
})
