import {createStore, reconcile, SetStoreFunction, unwrap} from 'solid-js/store'

export type TreeMap<T> = Record<string, TreeItem<T>>

type TreeItemInput<T> = T & {
  id: string
  parentId?: string
  leftId?: string
}

export interface TreeItem<T> {
  id: string
  parentId?: string
  leftId?: string
  childrenIds: string[]
  value: T
}

export interface TreeState<T> {
  items: TreeMap<T>
}

interface Options<T> {
  items?: TreeItemInput<T>[]
}

const ROOT_ID = 'root'

export class Tree<T> {
  private state!: TreeState<T>
  private setState!: SetStoreFunction<TreeState<T>>

  get rootItemIds() {
    return this.state.items[ROOT_ID].childrenIds
  }

  get items(): TreeItem<T>[] {
    return Object.values(this.state.items).filter((i) => i.id !== ROOT_ID)
  }

  constructor(options: Options<T>) {
    const items = this.generateMap(options.items ?? [])
    const [getter, setter] = createStore<TreeState<T>>({items})
    this.state = getter
    this.setState = setter
  }

  updateAll(input: TreeItemInput<T>[]) {
    const items = this.generateMap(input)
    this.setState('items', reconcile(items))
  }

  updateValue(input: TreeItemInput<T>) {
    if (!this.state.items[input.id]) {
      this.add(input)
    } else {
      this.setState('items', input.id, 'value', input)
    }
  }

  add(item: TreeItemInput<T>): string[] {
    this.setState('items', item.id, {
      id: item.id,
      parentId: item.parentId,
      leftId: item.leftId,
      value: item,
      childrenIds: [],
    })

    return this.move(item.id, item.parentId)
  }

  remove(id: string): string[] {
    const item = this.getItem(id)!
    const parentId = item.parentId ?? ROOT_ID
    const parent = this.getItem(parentId)!
    const index = parent.childrenIds.indexOf(id)
    const rightId = parent.childrenIds[index + 1]
    const changes = new Set<string>()

    if (rightId) {
      this.before(rightId, id).forEach((i) => changes.add(i))
    }

    const newState = {
      items: {...this.state.items},
    }

    item.childrenIds.forEach((i) => {
      delete newState.items[i]
      changes.add(i)
    })

    const newIndex = newState.items[parentId].childrenIds.indexOf(item.id)
    if (newIndex !== -1) {
      const newParentChildrenIds = [...newState.items[parentId].childrenIds]
      newParentChildrenIds.splice(newIndex, 1)
      newState.items[parentId] = {
        ...newState.items[parentId],
        childrenIds: newParentChildrenIds,
      }
    }

    this.setState(newState)
    changes.add(item.id)

    return [...changes]
  }

  move(id: string, toId: string = ROOT_ID): string[] {
    //   ! Remove B from root childrenIds
    // A
    // B < Add B to C
    // C ! Add B to C childrenIds
    //   ! Update C leftId to A
    //   D
    //   E
    //     < Add here
    //     ! Update B parentId to C
    //     ! Update B leftId to E
    let changes: string[] = []
    const state = this.state

    const newState = {
      items: {...state.items},
    }

    const item = state.items[id]
    const to = state.items[toId]
    const parentId = item.parentId ?? ROOT_ID
    const oldIndex = state.items[parentId].childrenIds.indexOf(id)

    // Remove item from its current parent's childrenIds
    const parentChildrenIds = [...state.items[parentId].childrenIds]
    if (oldIndex !== -1) parentChildrenIds.splice(oldIndex, 1)
    newState.items[parentId] = {
      ...newState.items[parentId],
      childrenIds: parentChildrenIds,
    }

    // Set new parentId and leftId for the item being moved
    const newParentId = to.id ?? ROOT_ID

    newState.items[id] = {
      ...newState.items[id],
      parentId: newParentId === ROOT_ID ? undefined : newParentId,
      leftId: to.childrenIds[to.childrenIds.length - 1],
    }

    // Insert the item at the end in the new parent's childrenIds
    const newParentChildrenIds = [...newState.items[newParentId].childrenIds]
    newParentChildrenIds.push(id)
    newState.items[newParentId] = {
      ...newState.items[newParentId],
      childrenIds: newParentChildrenIds,
    }

    changes.push(id)
    this.setState(newState)
    return changes
  }

  before(id: string, toId: string): string[] {
    //   ! Remove B from root childrenIds
    // A
    // B < Move B before E
    // C ! Update leftId from B to A
    //   ! Add B to C childrenIds
    //   D
    //     < Move here
    //     ! Update B leftId to D
    //     ! Update B parentId to C
    //   E ! Update E leftId to B

    let changes: string[] = []
    const state = this.state

    const newState = {
      items: {...state.items},
    }

    const item = state.items[id]
    const to = state.items[toId]
    const parentId = item.parentId ?? ROOT_ID
    const oldIndex = state.items[parentId].childrenIds.indexOf(id)

    // Remove item from its current parent's childrenIds
    const parentChildrenIds = [...state.items[parentId].childrenIds]
    if (oldIndex !== -1) parentChildrenIds.splice(oldIndex, 1)
    newState.items[parentId] = {
      ...newState.items[parentId],
      childrenIds: parentChildrenIds,
    }

    // Update leftId of the item that was to the right of the removed item
    const rightItem = state.items[parentId].childrenIds[oldIndex + 1]
    if (rightItem) {
      newState.items[rightItem] = {
        ...newState.items[rightItem],
        leftId: item.leftId,
      }

      changes.push(rightItem)
    }

    // Set new parentId and leftId for the item being moved
    const newParentId = to.parentId ?? ROOT_ID
    const toIndex = newState.items[newParentId].childrenIds.indexOf(toId)
    const newLeftId = newState.items[newParentId].childrenIds[toIndex - 1]

    newState.items[id] = {
      ...newState.items[id],
      parentId: newParentId === ROOT_ID ? undefined : newParentId,
      leftId: newLeftId,
    }

    // Insert the item before the target item in the new parent's childrenIds
    const newParentChildrenIds = [...newState.items[newParentId].childrenIds]
    newParentChildrenIds.splice(toIndex, 0, id)
    newState.items[newParentId] = {
      ...newState.items[newParentId],
      childrenIds: newParentChildrenIds,
    }

    // Update leftId of the target item
    newState.items[toId] = {
      ...newState.items[toId],
      leftId: id,
    }

    changes.push(toId)
    changes.push(id)

    this.setState(newState)
    return changes
  }

  after(id: string, toId: string): string[] {
    //   ! Remove B from root childrenIds
    // A
    // B < Move B after D
    // C ! Update leftId from B to A
    //   ! Add B to C childrenIds
    //   D
    //     < Move here
    //     ! Update B leftId to D
    //     ! Update B parentId to C
    //   E ! Update E leftId to B

    let changes: string[] = []
    const state = this.state

    const newState = {
      items: {...state.items},
    }

    const item = state.items[id]
    const to = state.items[toId]
    const parentId = item.parentId ?? ROOT_ID
    const oldIndex = state.items[parentId].childrenIds.indexOf(id)

    // Remove item from its current parent's childrenIds
    const parentChildrenIds = [...state.items[parentId].childrenIds]
    if (oldIndex !== -1) parentChildrenIds.splice(oldIndex, 1)
    newState.items[parentId] = {
      ...newState.items[parentId],
      childrenIds: parentChildrenIds,
    }

    // Update leftId of the item that was to the right of the removed item
    const rightItem = state.items[parentId].childrenIds[oldIndex + 1]
    if (rightItem) {
      newState.items[rightItem] = {
        ...newState.items[rightItem],
        leftId: item.leftId,
      }

      changes.push(rightItem)
    }

    // Set new parentId and leftId for the item being moved
    const newParentId = to.parentId ?? ROOT_ID
    const toIndex = newState.items[newParentId].childrenIds.indexOf(toId)

    newState.items[id] = {
      ...newState.items[id],
      parentId: newParentId === ROOT_ID ? undefined : newParentId,
      leftId: toId,
    }

    // Insert the item after the target item in the new parent's childrenIds
    const newParentChildrenIds = [...newState.items[newParentId].childrenIds]
    newParentChildrenIds.splice(toIndex + 1, 0, id)
    newState.items[newParentId] = {
      ...newState.items[newParentId],
      childrenIds: newParentChildrenIds,
    }

    // Update leftId of the item that was originally to the right of the target item
    const newRightItem = newState.items[newParentId].childrenIds[toIndex + 2]
    if (newRightItem) {
      newState.items[newRightItem] = {
        ...newState.items[newRightItem],
        leftId: id,
      }

      changes.push(newRightItem)
    }

    changes.push(id)

    this.setState(newState)
    return changes
  }

  isDescendant(id: string, parentId = ROOT_ID): boolean {
    let result = false
    this.descendants((item) => {
      if (item.id === id) result = true
    }, parentId)
    return result
  }

  descendants(fn: (n: TreeItem<any>) => void, parentId = ROOT_ID) {
    const childrenIds = this.state.items[parentId].childrenIds
    for (const id of childrenIds) {
      const item = this.state.items[id]
      fn(item)
      this.descendants(fn, item.id)
    }
  }

  getItem(id: string): TreeItem<T> | undefined {
    return unwrap(this.state.items[id])
  }

  private generateMap(input: TreeItemInput<T>[]): TreeMap<T> {
    const items: TreeMap<T> = {
      root: {
        id: ROOT_ID,
        childrenIds: [],
        value: null as T,
      },
    }

    const waitingForLeftId: Record<string, string[]> = {}
    const upcomingItems: TreeMap<T> = {}

    for (const item of input) {
      let childrenIds: string[] = []
      if (upcomingItems[item.id]) {
        childrenIds = upcomingItems[item.id].childrenIds
        delete upcomingItems[item.id]
      }

      items[item.id] = {
        id: item.id,
        parentId: item.parentId,
        leftId: item.leftId,
        value: item,
        childrenIds,
      }

      let parent = items[item.parentId ?? ROOT_ID]
      if (parent) {
        if (item.leftId) {
          const index = parent.childrenIds.indexOf(item.leftId)
          if (index !== -1) {
            parent.childrenIds.splice(index + 1, 0, item.id)
          } else {
            waitingForLeftId[item.leftId] = [...(waitingForLeftId[item.leftId] ?? []), item.id]
          }
        } else {
          parent.childrenIds.push(item.id)
        }
      } else if (item.parentId) {
        upcomingItems[item.parentId] = {
          id: item.id,
          childrenIds: [item.id],
          value: null,
        } as TreeItem<T>
        parent = items[item.parentId]
      }

      if (waitingForLeftId[item.id]) {
        const index = parent.childrenIds.indexOf(item.id)
        if (index !== -1) {
          waitingForLeftId[item.id].forEach((id, i) => {
            parent.childrenIds.splice(index + i + 1, 0, id)
          })

          delete waitingForLeftId[item.id]
        }
      }
    }

    for (const ids of Object.values(waitingForLeftId)) {
      for (const id of ids) {
        const item = items[id]
        items[item.parentId ?? ROOT_ID].childrenIds.push(id)
      }
    }

    for (const item of Object.values(upcomingItems)) {
      item.childrenIds.forEach((id) => {
        items[ROOT_ID].childrenIds.push(id)
        items[id].parentId = undefined
      })
    }

    return items
  }
}

export const createTreeStore = <T>(options: Options<T> = {}) => {
  return new Tree(options)
}
