import {expect, test} from '@playwright/test'
import {assertCodeLineToEqualByLocator, delay} from '../utils'

test.beforeEach(async ({page}) => {
  await page.goto('/canvas')
  await page.waitForSelector('[data-testid="new_canvas_page"]')
})

test('add code file', async ({page}) => {
  await page.click('[data-testid="new_canvas"]')

  expect(page.locator('[data-testid="canvas_container"]')).toBeVisible()

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
