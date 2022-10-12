import {Page, expect} from '@playwright/test'

export const delay = process.env.CI ? 30 : 80

export const lineTextEq = (page: Page, nth: number, text: string) =>
  expect(page.locator(`.ProseMirror > *:nth-child(${nth})`)).toHaveText(text)

export const move = async (page: Page, key: string, repeat = 1) => {
  for (let i = 0; i < repeat; i ++) {
    await page.keyboard.down(key)
    await page.keyboard.up(key)
  }
}
