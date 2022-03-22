import {Page} from '@playwright/test'

export const delay = 10

export const lineTextEq = async (page: Page, nth: number, text: string) =>
  (await page.$(`.ProseMirror p:nth-of-type(${nth})`)).evaluate((elem, t) => {
    const textContent = elem.textContent.replace(/\xa0/g, ' ')
    if (textContent !== t) throw Error(`${t} != ${textContent}`)
  }, text)

export const move = async (page: Page, key: string, repeat = 1) => {
  for (let i = 0; i < repeat; i ++) {
    await page.keyboard.down(key)
    await page.keyboard.up(key)
  }
}
