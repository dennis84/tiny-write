import {test, expect} from '@playwright/test'
import {v4 as uuidv4} from 'uuid'

test('share', async ({page, browser}) => {
  const id = uuidv4()
  await page.goto(`/canvas/${id}`)

  await page.isVisible('[data-testid="canvas_container"]')

  await page.click('[data-testid="burger"]')
  await page.click('[data-testid="collab"]')

  await page.click('[data-testid="new_file"]')
  await expect(page.locator('[data-testid="canvas_editor"]')).toHaveCount(1)

  const page2 = await browser.newPage()
  await page2.goto(page.url())

  await expect(page2.locator('[data-testid="canvas_editor"]')).toHaveCount(1)

  await page2.click('[data-testid="burger"]')
  await page2.click('[data-testid="new_file"]')
  await expect(page.locator('[data-testid="canvas_editor"]')).toHaveCount(2)
  await expect(page.locator('[data-testid="canvas_editor"]')).toHaveCount(2)
})
