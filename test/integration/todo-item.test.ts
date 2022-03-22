import {test, expect} from '@playwright/test'
import {delay} from './utils'

test.beforeEach(async ({page}) => {
  await page.goto('/')
  await page.waitForSelector('[data-testid="initialized"]')
  await page.waitForTimeout(10)
})

test('create todos', async ({page}) => {
  await page.type('.ProseMirror', '[ ] task1', {delay})
  await page.keyboard.press('Enter')
  await page.type('.ProseMirror', 'task2', {delay})
  await page.keyboard.press('Enter')
  await page.keyboard.press('Enter')
  await page.type('.ProseMirror', '...', {delay})
  await page.keyboard.press('Enter')
  await page.type('.ProseMirror', '[x] task3')
  expect(await page.textContent('.ProseMirror .todo-item:nth-of-type(1)')).toBe('task1')
  expect(await page.textContent('.ProseMirror .todo-item:nth-of-type(2)')).toBe('task2')
  expect(await page.textContent('.ProseMirror .todo-item:nth-of-type(3)')).toBe('task3')

  expect(await page.$eval(
    '.ProseMirror .todo-item:nth-of-type(3) label input',
    (node: HTMLInputElement) => node.checked
  )).toBe(true)

  const inputSel = '.ProseMirror .todo-item:nth-of-type(1) label input'
  await page.click(inputSel)
  expect(await page.$eval(inputSel, (node: HTMLInputElement) => node.checked)).toBe(true)
})
