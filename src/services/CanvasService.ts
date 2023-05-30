import {SetStoreFunction, Store, unwrap} from 'solid-js/store'
import {EditorState, Plugin, Transaction} from 'prosemirror-state'
import {EditorView} from 'prosemirror-view'
import {ySyncPluginKey} from 'y-prosemirror'
import {v4 as uuidv4} from 'uuid'
import {debounce} from 'ts-debounce'
import {Vec2d} from '@tldraw/primitives'
import {
  Camera,
  Canvas,
  CanvasEditorElement,
  CanvasElement,
  CanvasLinkElement,
  EdgeType,
  ElementType,
  File,
  Mode,
  State,
  isEditorElement,
  isLinkElement,
} from '@/state'
import * as db from '@/db'
import * as remote from '@/remote'
import {createEmptyText, createExtensions, createNodeViews, createSchema} from '@/prosemirror-setup'
import {Ctrl} from '.'
import {ElementBox, ElementMap} from './ElementMap'

interface UpdateCanvas {
  camera?: Camera;
  elements?: CanvasElement[];
  lastModified?: Date;
}

type UpdateElement = UpdateEditorElement | UpdateLinkElement | UpdateSelection

interface UpdateSelection {
  selected?: boolean;
  active?: boolean;
}

interface UpdateEditorElement {
  type: ElementType.Editor;
  editorView?: EditorView;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  selected?: boolean;
  active?: boolean;
}

interface UpdateLinkElement {
  type: ElementType.Link;
  from?: string;
  fromEdge?: EdgeType;
  toX?: number;
  toY?: number;
  to?: string;
  toEdge?: EdgeType;
  selected?: boolean;
}

export class CanvasService {
  private saveUpdatedCamera = debounce(() => this.saveCanvas(), 100)
  private elementMap: ElementMap | undefined

  constructor(
    private ctrl: Ctrl,
    private store: Store<State>,
    private setState: SetStoreFunction<State>,
  ) {}

  get currentCanvas() {
    return this.store.canvases?.find((c) => c.active)
  }

  updateCanvas(id: string, update: UpdateCanvas) {
    const index = this.store.canvases.findIndex((canvas) => canvas.id === id)
    if (index === -1) return
    const hasOwn = (prop: string) => Object.hasOwn(update, prop)

    this.setState('canvases', index, (prev) => ({
      camera: hasOwn('camera') ? update.camera : prev?.camera,
      elements: hasOwn('elements') ? update.elements : prev?.elements,
      lastModified: hasOwn('lastModified') ? update.lastModified : prev?.lastModified,
    }))
  }

  updateCanvasElement(id: string, elementIndex: number, update: UpdateElement) {
    const index = this.store.canvases.findIndex((canvas) => canvas.id === id)
    if (index === -1) return
    const hasOwn = (prop: string) => Object.hasOwn(update, prop)

    this.setState('canvases', index, 'elements', elementIndex, (prev: CanvasElement) => {
      if (isEditorElement(prev) && isEditorUpdate(update)) {
        return {
          editorView: hasOwn('editorView') ? update.editorView : prev?.editorView,
          x: hasOwn('x') ? update.x : prev?.x,
          y: hasOwn('y') ? update.y : prev?.y,
          width: hasOwn('width') ? update.width : prev?.width,
          height: hasOwn('height') ? update.height : prev?.height,
          selected: hasOwn('selected') ? update.selected : prev?.selected,
          active: hasOwn('active') ? update.active : prev?.active,
        }
      } else if (isLinkElement(prev) && isLinkUpdate(update)) {
        return {
          from: hasOwn('from') ? update.from : prev?.from,
          fromEdge: hasOwn('fromEdge') ? update.fromEdge : prev?.fromEdge,
          toX: hasOwn('toX') ? update.toX : prev?.toX,
          toY: hasOwn('toY') ? update.toY : prev?.toY,
          to: hasOwn('to') ? update.to : prev?.to,
          toEdge: hasOwn('toEdge') ? update.toEdge : prev?.toEdge,
          selected: hasOwn('selected') ? update.selected : prev?.selected,
        }
      } else if (isSelectionUpdate(update) && isEditorElement(prev)) {
        return {
          ...prev,
          selected: update.selected,
          active: update.active,
        }
      } else if (isSelectionUpdate(update) && isLinkElement(prev)) {
        return {
          ...prev,
          selected: update.selected,
        }
      } else {
        console.error('No element update', prev)
        return prev
      }
    })
  }

  backToContent() {
    const currentCanvas = this.currentCanvas
    if (!currentCanvas) return
    this.generateElementMap()
    const center = this.elementMap?.center()
    const zoom = 0.5
    if (center) {
      const vp = new Vec2d(window.innerWidth / 2, window.innerHeight / 2).div(zoom)
      const [x, y] = center.sub(vp).toArray()
      this.updateCanvas(currentCanvas.id, {camera: {zoom, point: [-x, -y]}})
      this.saveCanvas()
    }
  }

  updateCamera(camera: Camera) {
    const currentCanvas = this.currentCanvas
    if (!currentCanvas) return
    this.updateCanvas(currentCanvas.id, {camera})
    this.saveUpdatedCamera()
  }

  updateCameraPoint(point: [number, number]) {
    const currentCanvas = this.currentCanvas
    if (!currentCanvas) return
    this.updateCanvas(currentCanvas.id, {camera: {...currentCanvas.camera, point}})
    this.saveUpdatedCamera()
  }

  deleteCanvas(id: string) {
    const canvases = []
    for (const c of this.store.canvases) {
      if (c.id === id) {
        c.elements.forEach((el) => {
          if (isEditorElement(el)) el.editorView?.destroy()
        })
      } else {
        canvases.push(c)
      }
    }

    this.setState('canvases', canvases)
    db.deleteCanvas(id)
  }

  select(id: string, active = false) {
    const currentCanvas = this.currentCanvas
    if (!currentCanvas) return
    const prevIndex = currentCanvas.elements.findIndex((el) => el.selected)
    const newIndex = currentCanvas.elements.findIndex((el) => el.id === id)
    if (prevIndex !== -1 && prevIndex !== newIndex) {
      this.updateCanvasElement(currentCanvas.id, prevIndex, {selected: false, active: false})
    }

    this.updateCanvasElement(currentCanvas.id, newIndex, {selected: true, active})
  }

  deselect() {
    const currentCanvas = this.currentCanvas
    if (!currentCanvas) return
    const prevIndex = currentCanvas.elements.findIndex((el) => el.selected)
    if (prevIndex === -1) return
    this.updateCanvasElement(currentCanvas.id, prevIndex, {selected: false, active: false})
  }

  newCanvas() {
    const state = unwrap(this.store)
    const id = uuidv4()
    const collab = this.ctrl.collab.create(id, false)
    const canvas: Canvas = {
      id,
      camera: {point: [0, 0], zoom: 1},
      elements: [],
      active: true,
      lastModified: new Date(),
    }

    const prev = state.canvases.map((c) => ({...c, active: false}))

    this.setState({
      ...state,
      collab,
      canvases: [...prev, canvas],
      mode: Mode.Canvas,
    })

    this.saveCanvas()
  }

  removeElement(elementId: string) {
    const currentCanvas = this.currentCanvas
    if (!currentCanvas) return
    const elements = []
    for (const el of currentCanvas.elements) {
      if (isEditorElement(el) && el.id === elementId) {
        el.editorView?.destroy()
        continue
      }

      if (isLinkElement(el) && (el.from === elementId || el.to === elementId)) {
        continue
      }

      elements.push(el)
    }

    this.updateCanvas(currentCanvas.id, {elements})
  }

  destroyElement(elementId: string) {
    const currentCanvas = this.currentCanvas
    if (!currentCanvas) return
    const elementIndex = currentCanvas.elements.findIndex((el) => el.id === elementId)
    const element = currentCanvas.elements[elementIndex]
    if (elementIndex === -1 || !isEditorElement(element)) return

    element?.editorView?.destroy()
    this.updateCanvasElement(currentCanvas.id, elementIndex, {
      type: ElementType.Editor,
      editorView: undefined,
    })
  }

  discard() {
    console.log('discard')
  }

  open(id: string) {
    const state = unwrap(this.store)
    const canvases = []

    for (const canvas of state.canvases) {
      if (canvas.id === id) {
        canvases.push({...canvas, active: true})
      } else if (canvas.active) {
        canvases.push({
          ...canvas,
          active: false,
          elements: canvas.elements.map((el) => {
            if (isEditorElement(el)) el.editorView?.destroy()
            return {...el, editorView: undefined}
          }),
        })
      } else {
        canvases.push(canvas)
      }
    }

    const collab = this.ctrl.collab.create(id, false)
    const mode = Mode.Canvas

    this.setState({
      ...state,
      collab,
      canvases,
      mode,
    })

    db.setMeta({mode})
  }

  newFile() {
    const file = this.ctrl.file.createFile()
    const state = unwrap(this.store)
    const update = {
      ...state,
      files: [...state.files, file],
      collab: this.ctrl.collab.createByFile(file),
    }

    this.setState(update)
    this.addToCanvas(file)
  }

  addToCanvas(file: File) {
    const currentCanvas = this.currentCanvas
    if (!currentCanvas) return

    const existing = currentCanvas.elements.find((el) => el.id === file.id)
    if (existing) return

    const width = 300
    const height = 350
    const {point, zoom} = currentCanvas.camera

    const center = new Vec2d(window.innerWidth / 2, window.innerHeight / 2).toFixed()
    const p = Vec2d.FromArray(point)
    const {x, y} = center.div(zoom).sub(p).subXY(width / 2, height / 2)

    const element: CanvasEditorElement = {
      type: ElementType.Editor,
      id: file.id,
      x,
      y,
      width,
      height,
    }

    this.updateCanvas(currentCanvas.id, {
      elements: [...currentCanvas.elements, element],
      lastModified: new Date(),
    })

    this.saveCanvas()
  }

  drawLink(id: string, from: string, fromEdge: EdgeType, toX: number, toY: number) {
    const currentCanvas = this.currentCanvas
    if (!currentCanvas) return

    const fromEl = currentCanvas.elements.find((el) => el.id === from) as CanvasEditorElement
    if (!fromEl) return

    const existingIndex = currentCanvas.elements.findIndex((el) => el.id === id)

    if (existingIndex !== -1) {
      let toBox = this.elementMap?.near([toX, toY])
      if (toBox?.id === fromEl.id) {
        toBox = undefined
      }

      this.updateCanvasElement(currentCanvas.id, existingIndex, {
        type: ElementType.Link,
        ...(toBox ? {
          from,
          fromEdge,
          to: toBox.id,
          toEdge: toBox.edge,
          toX: undefined,
          toY: undefined,
        } : {
          from,
          fromEdge,
          toX,
          toY,
          to: undefined,
          toEdge: undefined,
        }),
      })
      return
    }

    const newLink: CanvasLinkElement = {type: ElementType.Link, id, from, fromEdge}

    this.updateCanvas(currentCanvas.id, {
      elements: [...currentCanvas.elements, newLink],
    })
  }

  drawLinkEnd(id: string) {
    const currentCanvas = this.currentCanvas
    if (!currentCanvas) return

    const unlinked = currentCanvas.elements.find((el) => {
      return el.id === id && !(el as CanvasLinkElement).to
    }) as CanvasLinkElement

    if (unlinked) {
      this.updateCanvas(currentCanvas.id, {
        elements: currentCanvas.elements.filter((el) => el.id !== id),
      })
    }
  }

  generateElementMap() {
    const currentCanvas = this.currentCanvas
    if (!currentCanvas) return
    const xs = []
    for (const el of currentCanvas.elements) {
      if (isEditorElement(el)) {
        const {id, x, y, width, height} = el
        xs.push(new ElementBox(id, x, y, width, height))
      }
    }

    this.elementMap = new ElementMap(xs)
  }

  clearCanvas() {
    const currentCanvas = this.currentCanvas
    if (!currentCanvas) return
    this.updateCanvas(currentCanvas.id, {elements: []})
    this.saveCanvas()
  }

  removeLinks() {
    const currentCanvas = this.currentCanvas
    if (!currentCanvas) return
    const elements = currentCanvas.elements.filter((el) => !isLinkElement(el))
    this.updateCanvas(currentCanvas.id, {elements})
    this.saveCanvas()
  }

  async renderEditor(element: CanvasEditorElement, node: HTMLElement) {
    const file = this.ctrl.file.findFile({id: element.id})
    if (!file) return
    this.updateEditorState(file, node)
  }

  updateEditorState(file: File, node?: Element) {
    const currentCanvas = this.currentCanvas
    if (!currentCanvas) return

    const elementIndex = currentCanvas?.elements.findIndex((el) => el.id === file.id)
    if (elementIndex === undefined || elementIndex === -1) {
      return
    }

    let editorView = (currentCanvas?.elements[elementIndex] as CanvasEditorElement)?.editorView
    this.ctrl.collab.apply(file)

    const extensions = createExtensions({
      ctrl: this.ctrl,
      markdown: false,
      keymap: this.ctrl.keymap.create(),
      type: this.store.collab?.ydoc?.getXmlFragment(file.id),
      dropcursor: false,
    })

    const nodeViews = createNodeViews(extensions)
    const schema = createSchema(extensions)
    const plugins = extensions.reduce<Plugin[]>((acc, e) => e.plugins?.(acc, schema) ?? acc, [])
    const editorState = EditorState.fromJSON({schema, plugins}, createEmptyText())

    if (!editorView) {
      const dispatchTransaction = (tr: Transaction) => {
        const newState = editorView!.state.apply(tr)
        editorView!.updateState(newState)
        if (!tr.docChanged) return

        const yMeta = tr.getMeta(ySyncPluginKey)
        const maybeSkip = tr.getMeta('addToHistory') === false
        const isUndo = yMeta?.isUndoRedoOperation

        if ((maybeSkip && !isUndo) || this.store.isSnapshot) return

        this.ctrl.file.updateFile(file.id, {
          lastModified: new Date(),
          markdown: file.markdown,
          path: file.path,
        })

        const updatedFile = this.store.files.find((f) => f.id === file.id)
        if (!updatedFile) return
        this.ctrl.file.saveFile(updatedFile)
        remote.log('info', '💾 Saved updated text')
      }

      editorView = new EditorView(node!, {
        state: editorState,
        nodeViews,
        dispatchTransaction,
      })

      this.updateCanvasElement(currentCanvas.id, elementIndex, {
        type: ElementType.Editor,
        editorView,
      })
    }

    editorView.setProps({state: editorState, nodeViews})
    editorView.focus()
  }

  fetchCanvases(): Promise<Canvas[]> {
    return db.getCanvases() as Promise<Canvas[]>
  }

  private async saveCanvas() {
    const currentCanvas = this.currentCanvas
    if (!currentCanvas) return

    db.updateCanvas(unwrap({
      ...currentCanvas,
      elements: currentCanvas.elements.map((el) => ({
        ...el,
        editorView: undefined,
        selected: undefined,
        active: undefined,
      }))
    }))
  }
}

const isEditorUpdate = (update: any): update is UpdateEditorElement =>
  update.type === ElementType.Editor

const isLinkUpdate = (update: any): update is UpdateLinkElement =>
  update.type === ElementType.Link

const isSelectionUpdate = (update: any): update is UpdateSelection =>
  Object.hasOwn(update, 'selected')
