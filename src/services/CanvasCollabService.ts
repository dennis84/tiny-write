import {Store, unwrap} from 'solid-js/store'
import * as Y from 'yjs'
import {debounce} from 'ts-debounce'
import {State} from '@/state'
import {CanvasService} from './CanvasService'

type Elements = Y.Map<Y.Map<any>>

interface CollabElement {
  [key: string]: any;
  id: string;
}

const PREFIX = 'el-'

export class CanvasCollabService {
  updateElementThrottled = debounce((el) => this.updateElement(el), 10, {maxWait: 10})

  constructor(
    private canvasService: CanvasService,
    private store: Store<State>,
  ) {}

  get ydoc(): Y.Doc | undefined {
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
      const el = new Y.Map(Object.entries(this.getProps(unwrap(element))))
      this.elements?.set(PREFIX + element.id, el)
    })

    this.store.collab?.undoManager?.addToScope(this.elements!)

    this.elements?.observeDeep((events, tr) => {
      if (this.ydoc?.clientID === tr.origin) return

      for (const event of events) {
        for (const [key, action] of event.changes.keys) {
          if (action.action === 'delete') {
            if (event.path.length === 0) {
              this.canvasService.removeElement(key)
            } else {
              const elementId = event.path[0].toString().substring(PREFIX.length)
              this.canvasService.updateCanvasElement(elementId, {
                type: event.target.get('type'),
                [key]: undefined
              })
            }
          } else if (action.action === 'update') {
            const elementId = event.path[0].toString().substring(PREFIX.length)
            this.canvasService.updateCanvasElement(elementId, {
              type: event.target.get('type'),
              [key]: event.target.get(key)
            })
          } else if (action.action === 'add') {
            const element = event.target.get(key).toJSON()
            this.canvasService.updateCanvas(currentCanvas.id, {
              elements: [...currentCanvas.elements, element]
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
    const el = new Y.Map(Object.entries(this.getProps(element)))
    this.ydoc?.transact(() => {
      this.elements?.set(PREFIX + element.id, el)
    }, this.ydoc.clientID)
  }

  addElements(elements: CollabElement[]) {
    this.ydoc?.transact(() => {
      elements.forEach((el) => {
        const element = new Y.Map(Object.entries(this.getProps(el)))
        this.elements?.set(PREFIX + el.id, element)
      })
    }, this.ydoc.clientID)
  }

  updateElement(element: CollabElement) {
    const elem = this.elements?.get(PREFIX + element.id)
    if (!elem) return

    const props = this.getProps(element)
    for (const [k, v] of Object.entries(props)) {
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

  private getProps(element: any) {
    delete element.editorView
    return element
  }
}
