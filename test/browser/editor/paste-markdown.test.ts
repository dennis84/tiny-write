import {expect, test} from '@playwright/test'
import {assertEditorLineToEqual} from '../utils'

test.beforeEach(async ({page, context}) => {
  await context.grantPermissions(['clipboard-write', 'clipboard-read'])
  await page.goto('/')
})

const markdownContent = `
# Heading
> blockquote
`

test('paste markdown', async ({page}) => {
  await page.evaluate(async (text) => {
    await navigator.clipboard.writeText(text)
  }, markdownContent)

  await page.waitForSelector('[data-testid="initialized"]')
  await page.click('[data-testid="navbar_menu_open"]')
  await assertEditorLineToEqual(page, 1, 'Start typing ...')

  await page.locator('.ProseMirror').focus()
  await page.keyboard.press('ControlOrMeta+KeyV')

  await expect(page.locator('.ProseMirror h1')).toHaveText('Heading')
  await expect(page.locator('.ProseMirror blockquote')).toHaveText('blockquote')
})
