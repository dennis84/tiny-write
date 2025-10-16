import {expect, type Page, test} from '@playwright/test'
import {assertCodeLineToEqualByLocator, delay} from '../utils'

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

test('add code file', async ({page}) => {
  await page.click('[data-testid="floating_navbar_menu_open"]')
  await clickTreeMenu(page, 1, 'add_canvas')

  expect(page.locator('[data-testid="canvas_container"]')).toBeVisible()
  await page.click('[data-testid="menu_navbar_close"]')

  // Create file
  await page.locator('[data-testid="canvas_container"]').click({button: 'right'})
  await page.click('[data-testid="context_menu_new_code_file"]')
  await expect(page.locator('[data-testid="canvas_code_editor"]')).toHaveCount(1)

  // Activate file and type
  await page.dblclick('[data-testid="bounds"]')
  await page.locator('.cm-content').pressSequentially('const foo=1', {delay})

  await assertCodeLineToEqualByLocator(
    page.locator('[data-testid="canvas_code_editor"]'),
    1,
    'const foo=1',
  )

  // change lang
  await page.click('[data-testid="toolbar_change_language"]')
  await page.keyboard.type('typescript', {delay})
  await page.keyboard.press('Enter')

  // prettify
  await page.click('[data-testid="toolbar_prettify"]')
  await assertCodeLineToEqualByLocator(
    page.locator('[data-testid="canvas_code_editor"]'),
    1,
    'const foo = 1',
  )
})
