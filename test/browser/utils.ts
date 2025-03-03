import {Page, expect} from '@playwright/test'

export const delay = process.env.CI ? 30 : 80

export const lineTextEq = (page: Page, nth: number, text: string) =>
  expect(page.locator(`.ProseMirror > *:nth-child(${nth})`)).toHaveText(text)

export const lineCodeEq = async (page: Page, nth: number, text: string) => {
  await expect
    .poll(async () => {
      const locator = page.locator(`[data-testid="code_scroll"] .cm-content > .cm-line:nth-child(${nth})`)
      const text = await locator.evaluate((node) => {
        node.querySelector('.cm-ySelectionCaret')?.remove()
        return node.textContent
      })

      return text
    })
    .toBe(text)
}

export const move = async (page: Page, key: string, repeat = 1) => {
  for (let i = 0; i < repeat; i++) {
    await page.keyboard.down(key)
    await page.keyboard.up(key)
  }
}

export const openBlockMenu = async (page: Page, nth: number) => {
  await page.locator(`.ProseMirror > *:nth-child(${nth})`).hover()
  await page.click('#block-handle')
}
