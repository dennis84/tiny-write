import {expect, type Locator, type Page} from '@playwright/test'

export const delay = process.env.CI ? 30 : 80

type LineText = string | RegExp

export const assertEditorLineToEqual = (page: Page, nth: number, text: LineText) =>
  expect(page.locator(`.ProseMirror > *:nth-child(${nth})`)).toHaveText(text)

export const assertCodeLineToEqual = async (
  page: Page,
  nth: number,
  text: LineText,
): Promise<void> =>
  assertCodeLineToEqualByLocator(page.locator('[data-testid="code_scroll"]'), nth, text)

export const assertCodeLineToEqualByLocator = async (
  parentLocator: Locator,
  nth: number,
  text: unknown,
): Promise<void> => {
  await expect
    .poll(async () => {
      const locator = parentLocator.locator(`.cm-content > .cm-line:nth-child(${nth})`)
      const text = await locator.evaluate((node) => {
        node.querySelectorAll('.cm-ySelectionCaret').forEach((it) => {
          it.remove()
        })

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

type ArrayData = unknown[]
type ObjectData = Record<string, unknown>
type Data = Record<string, ArrayData | ObjectData>

export const setupDB = async (page: Page, data: Data) => {
  console.debug(`Setup IndexedDB with data: ${JSON.stringify(data)}`)

  await page.goto('/editor')
  await page.evaluate((d) => {
    const indexedDB = window.indexedDB
    const request = indexedDB.open('tiny_write', 5)

    request.onsuccess = (event: any) => {
      const db = event.target.result
      const transaction = db.transaction(Object.keys(d), 'readwrite')

      Object.entries(d).forEach(([name, storeData]) => {
        const objectStore = transaction.objectStore(name)
        if (Array.isArray(storeData)) {
          storeData.forEach((value) => {
            objectStore.add(value)
          })
        } else {
          Object.entries(storeData).forEach(([key, value]) => {
            objectStore.put(value, key)
          })
        }
      })
    }
  }, data)

  console.debug('Setup IndexedDB done')
}
