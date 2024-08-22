import {Store, unwrap} from 'solid-js/store'
import * as Y from 'yjs'
import {throttle} from 'throttle-debounce'
import {State} from '@/state'
import {CanvasService} from './CanvasService'
import {CollabService} from './CollabService'

type Elements = Y.Map<Y.Map<any>>

interface CollabElement {
  [key: string]: any
  id: string
}

const PREFIX = 'el-'

export class CanvasCollabService {
  updateElementThrottled = throttle(20, (el) => this.updateElement(el))

  constructor(
    private collabService: CollabService,
    private canvasService: CanvasService,
    private store: Store<State>,
  ) {}

  private get ydoc(): Y.Doc | undefined {
    return this.store.collab?.ydoc
  }

  get elements(): Elements | undefined {
    const currentCanvas = this.canvasService.currentCanvas
    if (!currentCanvas) return
    return this.ydoc?.getMap(PREFIX + currentCanvas.id)
  }

  init() {
    const currentCanvas = this.canvasService.currentCanvas
    if (!currentCanvas) return

    currentCanvas.elements.forEach((element) => {
      const el = new Y.Map(this.getProps(unwrap(element)))
      this.elements?.set(PREFIX + element.id, el)
    })

    this.collabService.undoManager?.addToScope(this.elements!)

    this.elements?.observeDeep(async (events, tr) => {
      if (this.ydoc?.clientID === tr.origin) return

      for (const event of events) {
        for (const [key, action] of event.changes.keys) {
          if (action.action === 'delete') {
            if (event.path.length === 0) {
              const elementId = key.substring(PREFIX.length)
              await this.canvasService.removeElements([elementId])
            } else {
              const elementId = event.path[0].toString().substring(PREFIX.length)
              this.canvasService.updateCanvasElement(elementId, {[key]: undefined})
            }
          } else if (action.action === 'update') {
            if (event.path.length > 0) {
              const elementId = event.path[0].toString().substring(PREFIX.length)
              this.canvasService.updateCanvasElement(elementId, {[key]: event.target.get(key)})
            } else {
              const elementId = key.substring(PREFIX.length)
              const data = event.target.get(key).toJSON()
              this.canvasService.updateCanvasElement(elementId, data)
            }
          } else if (action.action === 'add') {
            const element = event.target.get(key).toJSON()
            this.canvasService.updateCanvas(currentCanvas.id, {
              elements: [...currentCanvas.elements, element],
            })
          }
        }
      }
    })
  }

  hasElement(id: string): boolean {
    return this.elements?.has(PREFIX + id) === true
  }

  addElement(element: CollabElement) {
    const el = new Y.Map(this.getProps(element))
    this.ydoc?.transact(() => {
      this.elements?.set(PREFIX + element.id, el)
    }, this.ydoc.clientID)
  }

  addElements(elements: CollabElement[]) {
    this.ydoc?.transact(() => {
      elements.forEach((el) => {
        const element = new Y.Map(this.getProps(el))
        this.elements?.set(PREFIX + el.id, element)
      })
    }, this.ydoc.clientID)
  }

  updateElement(element: CollabElement) {
    const elem = this.elements?.get(PREFIX + element.id)
    if (!elem) return

    const props = this.getProps(element)
    for (const [k, v] of props) {
      this.ydoc?.transact(() => {
        elem.set(k, v)
      }, this.ydoc.clientID)
    }
  }

  removeElement(id: string) {
    this.ydoc?.transact(() => {
      this.elements?.delete(PREFIX + id)
    }, this.ydoc.clientID)
  }

  removeAll() {
    this.ydoc?.transact(() => {
      this.elements?.clear()
    }, this.ydoc.clientID)
  }

  removeMany(ids: string[]) {
    this.ydoc?.transact(() => {
      ids.forEach((id) => this.elements?.delete(PREFIX + id))
    }, this.ydoc.clientID)
  }

  private getProps(element: object): Iterable<readonly [string, any]> {
    const obj = {...element, editorView: undefined}
    return Object.entries(obj).filter(([, v]) => v !== undefined)
  }
}
