import {expect, type Locator, type Page} from '@playwright/test'

export const delay = process.env.CI ? 30 : 80

export const assertEditorLineToEqual = (page: Page, nth: number, text: string) =>
  expect(page.locator(`.ProseMirror > *:nth-child(${nth})`)).toHaveText(text)

export const assertCodeLineToEqual = async (page: Page, nth: number, text: string) =>
  assertCodeLineToEqualByLocator(page.locator('[data-testid="code_scroll"]'), nth, text)

export const assertCodeLineToEqualByLocator = async (
  parentLocator: Locator,
  nth: number,
  text: string,
) => {
  await expect
    .poll(async () => {
      const locator = parentLocator.locator(`.cm-content > .cm-line:nth-child(${nth})`)
      const text = await locator.evaluate((node) => {
        node.querySelector('.cm-ySelectionCaret')?.remove()
        return node.textContent
      })

      return text
    })
    .toEqual(text)
}

export const move = async (page: Page, key: string, repeat = 1) => {
  for (let i = 0; i < repeat; i++) {
    await page.keyboard.press(key, {delay: 20})
  }
}

export const openBlockMenu = async (page: Page, nth: number) => {
  await page.locator(`.ProseMirror > *:nth-child(${nth})`).hover()
  await page.click('#block-handle')
}
