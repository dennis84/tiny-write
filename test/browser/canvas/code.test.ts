import {expect, test} from '@playwright/test'
import {assertCodeLineToEqualByLocator, delay} from '../utils'

test.beforeEach(async ({page}) => {
  await page.goto('/canvas')
  await page.getByTestId('new_canvas_page').waitFor()
})

test('add code file', async ({page}) => {
  await page.getByTestId('new_canvas').click()

  await expect(page.getByTestId('canvas_container')).toBeVisible()

  // Create file
  await page.getByTestId('canvas_container').click({button: 'right'})
  await page.getByTestId('context_menu_new_code_file').click()
  await expect(page.getByTestId('canvas_code_editor')).toHaveCount(1)

  // Activate file and type
  await page.getByTestId('bounds').dblclick()
  await page.locator('.cm-content').pressSequentially('const foo=1', {delay})

  await assertCodeLineToEqualByLocator(page.getByTestId('canvas_code_editor'), 1, 'const foo=1')

  // change lang
  await page.getByTestId('toolbar_change_language').click()
  await page.keyboard.type('typescript', {delay})
  await page.keyboard.press('Enter')

  // prettify
  await page.getByTestId('toolbar_prettify').click()
  await assertCodeLineToEqualByLocator(page.getByTestId('canvas_code_editor'), 1, 'const foo = 1')
})
