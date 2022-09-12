import {Page} from '@playwright/test'

export const delay = process.env.CI ? 30 : 80

export const lineTextEq = async (page: Page, nth: number, text: string) =>
  page.waitForFunction(([nth, text]) => {
    const elem = document
      .querySelector(`.ProseMirror p:nth-of-type(${nth})`)
      .cloneNode(true) as HTMLElement
    elem.querySelectorAll('[contexteditable="false"]').forEach((x) => {
      x.parentNode.removeChild(x)
    })

    const textContent = elem.textContent.replace(/\xa0/g, ' ')
    return textContent === text
  }, [nth, text])

export const move = async (page: Page, key: string, repeat = 1) => {
  for (let i = 0; i < repeat; i ++) {
    await page.keyboard.down(key)
    await page.keyboard.up(key)
  }
}
