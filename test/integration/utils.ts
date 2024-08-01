import {Page, expect} from '@playwright/test'

export const delay = process.env.CI ? 30 : 80

export const lineTextEq = (page: Page, nth: number, text: string) =>
  expect(page.locator(`.ProseMirror > *:nth-child(${nth})`)).toHaveText(text)

export const lineCodeEq = async (page: Page, nth: number, text: string) => {
  const locator = page.locator(`.cm-content > .cm-line:nth-child(${nth}) > span:not(.cm-ySelectionCaret)`)
  const texts = await locator.allTextContents()
  expect(texts.join('')).toBe(text)
}

export const move = async (page: Page, key: string, repeat = 1) => {
  for (let i = 0; i < repeat; i ++) {
    await page.keyboard.down(key)
    await page.keyboard.up(key)
  }
}

export const openBlockMenu = async (page: Page, nth: number) => {
  const loc = page.locator(`.ProseMirror *:nth-child(${nth}) .block-handle`)
  const box = await loc.boundingBox()
  if (!box) return
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.up()
}
