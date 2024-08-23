import {Page, expect} from '@playwright/test'

export const delay = process.env.CI ? 30 : 80

export const lineTextEq = (page: Page, nth: number, text: string) =>
  expect(page.locator(`.ProseMirror > *:nth-child(${nth})`)).toHaveText(text)

export const lineCodeEq = async (page: Page, nth: number, text: string) => {
  await expect.poll(async () => {
    const locator = page.locator(`.cm-content > .cm-line:nth-child(${nth}) > span:not(.cm-ySelectionCaret)`)
    const texts = await locator.allTextContents()
    return texts.join('')
  }).toBe(text)
}

export const move = async (page: Page, key: string, repeat = 1) => {
  for (let i = 0; i < repeat; i ++) {
    await page.keyboard.down(key)
    await page.keyboard.up(key)
  }
}

export const openBlockMenu = async (page: Page, nth: number) => {
  await page.locator(`.ProseMirror > *:nth-child(${nth})`).hover()
  await page.click('#block-handle')
}
