import {expect, test} from '@playwright/test'
import {v4 as uuidv4} from 'uuid'
import {delay, setupDB} from '../utils'

test('share', async ({page, browser}) => {
  const id = uuidv4()
  await setupDB(page, {
    canvases: [
      {
        id,
        camera: {point: [0, 0], zoom: 1},
        elements: [],
        lastModified: new Date(),
      },
    ],
  })

  await page.goto(`/canvas/${id}`)

  await expect(page.getByTestId('canvas_container')).toBeVisible()

  await page.getByTestId('navbar_menu_open').click()
  await page.getByTestId('collab').click()
  await page.getByTestId('navbar_menu_open').click()

  await page.getByTestId('canvas_container').click({button: 'right', position: {x: 1, y: 1}})
  await page.getByTestId('context_menu_new_file').click()

  await expect(page.getByTestId('canvas_editor')).toHaveCount(1)

  const page2 = await browser.newPage()
  await page2.goto(`/canvas?join=${id}`)
  await page2.getByTestId('join_canvas').click()

  await expect(page2.getByTestId('canvas_editor')).toHaveCount(1)
  await page2.getByTestId('canvas_container').click({button: 'right', position: {x: 400, y: 100}})
  await page2.getByTestId('context_menu_new_file').click()

  await expect(page2.getByTestId('canvas_editor')).toHaveCount(2)
  await expect(page.getByTestId('canvas_editor')).toHaveCount(2)

  await page2.getByTestId('canvas_container').dblclick({position: {x: 410, y: 100}})

  await page.locator('.ProseMirror').nth(1).pressSequentially('Hello', {delay})

  await expect(page.locator('.ProseMirror').nth(1)).toHaveText('Hello')

  await expect(page2.locator('.ProseMirror').nth(1)).toHaveText('Hello')
})
