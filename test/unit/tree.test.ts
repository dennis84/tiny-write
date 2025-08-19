import {testEffect} from '@solidjs/testing-library'
import {createEffect} from 'solid-js'
import {expect, test} from 'vitest'
import {createTreeStore} from '@/tree'
import {expectTree} from './testutil/tree'

test('createTreeStore - flat', () => {
  const tree = createTreeStore({
    items: [
      {id: 'file_1', leftId: 'file_2'},
      {id: 'file_2', leftId: 'file_3'},
      {id: 'file_3'}, // first
    ],
  })

  expectTree(
    tree,
    `
    └ file_3 (parentId=, leftId=)
    └ file_2 (parentId=, leftId=file_3)
    └ file_1 (parentId=, leftId=file_2)
    `,
  )
})

test('createTreeStore - nested', () => {
  const tree = createTreeStore({
    items: [
      {id: 'file_1'},
      {id: 'file_2', parentId: 'file_1'},
      {id: 'file_4', parentId: 'file_1', leftId: 'file_3'},
      {id: 'file_3', parentId: 'file_1', leftId: 'file_2'},
    ],
  })

  expectTree(
    tree,
    `
    └ file_1 (parentId=, leftId=)
      └ file_2 (parentId=file_1, leftId=)
      └ file_3 (parentId=file_1, leftId=file_2)
      └ file_4 (parentId=file_1, leftId=file_3)
    `,
  )
})

test('createTreeStore - broken', () => {
  const tree = createTreeStore({
    items: [
      {id: 'file_2', parentId: 'file_1'},
      {id: 'file_1'},
      {id: 'file_3', leftId: 'file_2'},
      {id: 'file_4', parentId: 'file_5'},
    ],
  })

  expectTree(
    tree,
    `
    └ file_1 (parentId=, leftId=)
      └ file_2 (parentId=file_1, leftId=)
    └ file_3 (parentId=, leftId=file_2)
    └ file_4 (parentId=, leftId=)
    `,
  )
})

test('add', async () => {
  const tree = createTreeStore({
    items: [
      {id: 'file_1'}, // 1
      {id: 'file_2'},
    ],
  })

  return testEffect((done) => {
    return createEffect((run: number = 0) => {
      if (run === 0) {
        const ids = tree.add({id: 'file_3'})
        expect(ids).toEqual(['file_3'])
      } else if (run === 1) {
        expectTree(
          tree,
          `
          └ file_1 (parentId=, leftId=)
          └ file_2 (parentId=, leftId=)
          └ file_3 (parentId=, leftId=file_2)
          `,
        )

        done()
      }

      return run + 1
    })
  })
})

test('remove', async () => {
  const tree = createTreeStore({
    items: [
      {id: 'file_1'},
      {id: 'file_2', parentId: 'file_1'},
      {id: 'file_3', parentId: 'file_2'},
      {id: 'file_4', parentId: 'file_2', leftId: 'file_3'},
    ],
  })

  return testEffect((done) => {
    return createEffect((run: number = 0) => {
      if (run === 0) {
        const ids = tree.remove('file_3')
        expect(ids).toEqual(['file_3', 'file_4'])
      } else if (run === 1) {
        expectTree(
          tree,
          `
          └ file_1 (parentId=, leftId=)
            └ file_2 (parentId=file_1, leftId=)
              └ file_4 (parentId=file_2, leftId=)
          `,
        )

        const ids = tree.remove('file_2')
        expect(ids).toEqual(['file_4', 'file_2'])
      } else if (run === 2) {
        expectTree(
          tree,
          `
          └ file_1 (parentId=, leftId=)
          `,
        )

        done()
      }

      return run + 1
    })
  })
})

test('move', async () => {
  const tree = createTreeStore({
    items: [{id: 'file_1'}, {id: 'file_2'}, {id: 'file_3'}, {id: 'file_4'}],
  })

  expectTree(
    tree,
    `
    └ file_1 (parentId=, leftId=)
    └ file_2 (parentId=, leftId=)
    └ file_3 (parentId=, leftId=)
    └ file_4 (parentId=, leftId=)
    `,
  )

  return testEffect((done) => {
    return createEffect((run: number = 0) => {
      if (run === 0) {
        const ids = tree.move('file_2', 'file_1')
        expect(ids).toEqual(['file_2'])
      } else if (run === 1) {
        expectTree(
          tree,
          `
          └ file_1 (parentId=, leftId=)
            └ file_2 (parentId=file_1, leftId=)
          └ file_3 (parentId=, leftId=)
          └ file_4 (parentId=, leftId=)
          `,
        )

        const ids = tree.move('file_3', 'file_1')
        expect(ids).toEqual(['file_3'])
      } else if (run === 2) {
        expectTree(
          tree,
          `
          └ file_1 (parentId=, leftId=)
            └ file_2 (parentId=file_1, leftId=)
            └ file_3 (parentId=file_1, leftId=file_2)
          └ file_4 (parentId=, leftId=)
          `,
        )

        done()
      }

      return run + 1
    })
  })
})

test('before', async () => {
  const tree = createTreeStore({
    items: [
      {id: 'file_1'},
      {id: 'file_2'},
      {id: 'file_3', parentId: 'file_2'},
      {id: 'file_4', parentId: 'file_2'},
    ],
  })

  return testEffect((done) => {
    return createEffect((run: number = 0) => {
      if (run === 0) {
        const ids = tree.before('file_1', 'file_4')
        expect(ids).toEqual(['file_2', 'file_4', 'file_1'])
      } else if (run === 1) {
        expectTree(
          tree,
          `
          └ file_2 (parentId=, leftId=)
            └ file_3 (parentId=file_2, leftId=)
            └ file_1 (parentId=file_2, leftId=file_3)
            └ file_4 (parentId=file_2, leftId=file_1)
          `,
        )

        const ids = tree.before('file_4', 'file_3')
        expect(ids).toEqual(['file_3', 'file_4'])
      } else if (run === 2) {
        expectTree(
          tree,
          `
          └ file_2 (parentId=, leftId=)
            └ file_4 (parentId=file_2, leftId=)
            └ file_3 (parentId=file_2, leftId=file_4)
            └ file_1 (parentId=file_2, leftId=file_3)
          `,
        )

        const ids = tree.before('file_1', 'file_2')
        expect(ids).toEqual(['file_2', 'file_1'])
      } else if (run === 3) {
        expectTree(
          tree,
          `
          └ file_1 (parentId=, leftId=)
          └ file_2 (parentId=, leftId=file_1)
            └ file_4 (parentId=file_2, leftId=)
            └ file_3 (parentId=file_2, leftId=file_4)
          `,
        )

        const ids = tree.before('file_4', 'file_2')
        expect(ids).toEqual(['file_3', 'file_2', 'file_4'])
      } else if (run === 4) {
        expectTree(
          tree,
          `
          └ file_1 (parentId=, leftId=)
          └ file_4 (parentId=, leftId=file_1)
          └ file_2 (parentId=, leftId=file_4)
            └ file_3 (parentId=file_2, leftId=)
          `,
        )

        done()
      }

      return run + 1
    })
  })
})

test('after', async () => {
  const tree = createTreeStore({
    items: [
      {id: 'file_1'},
      {id: 'file_2'},
      {id: 'file_3', parentId: 'file_2'},
      {id: 'file_4', parentId: 'file_2'},
    ],
  })

  return testEffect((done) => {
    return createEffect((run: number = 0) => {
      if (run === 0) {
        const ids = tree.after('file_1', 'file_3')
        expect(ids).toEqual(['file_2', 'file_4', 'file_1'])
      } else if (run === 1) {
        expectTree(
          tree,
          `
          └ file_2 (parentId=, leftId=)
            └ file_3 (parentId=file_2, leftId=)
            └ file_1 (parentId=file_2, leftId=file_3)
            └ file_4 (parentId=file_2, leftId=file_1)
          `,
        )

        const ids = tree.after('file_3', 'file_2')
        expect(ids).toEqual(['file_1', 'file_3'])
      } else if (run === 2) {
        expectTree(
          tree,
          `
          └ file_2 (parentId=, leftId=)
            └ file_1 (parentId=file_2, leftId=)
            └ file_4 (parentId=file_2, leftId=file_1)
          └ file_3 (parentId=, leftId=file_2)
          `,
        )

        const ids = tree.after('file_1', 'file_2')
        expect(ids).toEqual(['file_4', 'file_3', 'file_1'])
      } else if (run === 3) {
        expectTree(
          tree,
          `
          └ file_2 (parentId=, leftId=)
            └ file_4 (parentId=file_2, leftId=)
          └ file_1 (parentId=, leftId=file_2)
          └ file_3 (parentId=, leftId=file_1)
          `,
        )

        done()
      }

      return run + 1
    })
  })
})
