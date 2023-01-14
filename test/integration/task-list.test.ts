import {test, expect} from '@playwright/test'
import {delay, lineTextEq} from './utils'

const getItem = (listN: number, taskN: number) =>
  `.ProseMirror .task-list:nth-of-type(${listN}) .task-list-item:nth-of-type(${taskN})`

test.beforeEach(async ({page}) => {
  await page.goto('/')
  await page.waitForSelector('[data-testid="initialized"]')
})

test('create tasks', async ({page}) => {
  await page.type('.ProseMirror', '[ ] task1', {delay})
  await page.keyboard.press('Enter')
  await page.type('.ProseMirror', 'task2', {delay})
  await page.keyboard.press('Enter')
  await page.keyboard.press('Enter')
  await page.type('.ProseMirror', '...', {delay})
  await page.keyboard.press('Enter')
  await page.type('.ProseMirror', '[x] task3')
  expect(await page.textContent(getItem(1, 1))).toBe('task1')
  expect(await page.textContent(getItem(1, 2))).toBe('task2')
  expect(await page.textContent(getItem(2, 1))).toBe('task3')

  expect(await page.$eval(
    `${getItem(2, 1)} input`,
    (node: HTMLInputElement) => node.checked
  )).toBe(true)

  await page.click(`${getItem(1, 1)} input`)
  expect(await page.$eval(
    `${getItem(1, 1)} input`,
    (node: HTMLInputElement) => node.checked)
  ).toBe(true)
})

test('from/to markdown', async ({page}) => {
  await page.type('.ProseMirror', '[ ] task1', {delay})
  await page.keyboard.press('Enter')
  await page.type('.ProseMirror', 'task2', {delay})
  await page.keyboard.press('Enter')
  await page.type('.ProseMirror', 'task3')
  await page.click(`${getItem(1, 3)} input`)

  await page.click('[data-testid="burger"]')
  await page.click('[data-testid="markdown"]')

  await lineTextEq(page, 1, '- [ ] task1')
  await lineTextEq(page, 2, '- [ ] task2')
  await lineTextEq(page, 3, '- [x] task3')

  await page.click('[data-testid="markdown"]')

  expect(await page.textContent(getItem(1, 1))).toBe('task1')
  expect(await page.textContent(getItem(1, 2))).toBe('task2')
  expect(await page.textContent(getItem(1, 3))).toBe('task3')
})
