import {SetStoreFunction, Store, unwrap} from 'solid-js/store'
import {EditorState, Plugin, Transaction} from 'prosemirror-state'
import {EditorView} from 'prosemirror-view'
import * as Y from 'yjs'
import {ySyncPluginKey} from 'y-prosemirror'
import {v4 as uuidv4} from 'uuid'
import {debounce} from 'ts-debounce'
import {Box2d, Vec2d} from '@tldraw/primitives'
import {
  Camera,
  Canvas,
  CanvasBoxElement,
  CanvasEditorElement,
  CanvasElement,
  CanvasLinkElement,
  CanvasImageElement,
  CanvasVideoElement,
  EdgeType,
  ElementType,
  File,
  Mode,
  State,
  isEditorElement,
  isLinkElement,
  isBoxElement,
} from '@/state'
import {DB} from '@/db'
import * as remote from '@/remote'
import {createEmptyText, createExtensions, createNodeViews, createSchema} from '@/prosemirror-setup'
import {Ctrl} from '.'

type UpdateElement =
  Partial<CanvasLinkElement> |
  Partial<CanvasEditorElement> |
  Partial<CanvasBoxElement>

export interface Selection {
  elements: [string, Box2d][];
  box: Box2d;
}

export class CanvasService {
  public saveCanvasDebounced = debounce(() => this.saveCanvas(), 100)
  public canvasRef: HTMLElement | undefined

  constructor(
    private ctrl: Ctrl,
    private store: Store<State>,
    private setState: SetStoreFunction<State>,
  ) {}

  get currentCanvas() {
    return this.store.canvases?.find((c) => c.active)
  }

  get selection(): Selection | undefined {
    const currentCanvas = this.currentCanvas
    if (!currentCanvas) return
    const elements: [string, Box2d][] = []
    let box
    for (const el of currentCanvas.elements) {
      if (!el.selected) continue
      if (isBoxElement(el)) {
        const elBox = this.createBox(el)
        if (!box) box = Box2d.From(elBox)
        else box.expand(elBox)
        elements.push([el.id, elBox])
      }
    }

    if (!box || elements.length < 2) return
    return {box, elements}
  }

  updateCanvas(id: string, update: Partial<Canvas>) {
    const index = this.store.canvases.findIndex((canvas) => canvas.id === id)
    if (index === -1) return
    this.setState('canvases', index, update)
  }

  updateCanvasElement(elementId: string, update: UpdateElement) {
    const index = this.store.canvases?.findIndex((c) => c.active)
    if (index === -1) return
    const currentCanvas = this.store.canvases[index]
    const elementIndex = currentCanvas.elements.findIndex((el) => el.id === elementId)
    this.setState('canvases', index, 'elements', elementIndex, update)
  }

  focus(id: string) {
    const currentCanvas = this.currentCanvas
    if (!currentCanvas) return
    const element = currentCanvas.elements.find((el) => el.id === id) as CanvasBoxElement
    if (!element) return

    const zoom = currentCanvas.camera.zoom
    const elementCenter = this.createBox(element).center
    const canvasRef = this.canvasRef!
    const vp = new Vec2d(canvasRef.clientWidth / 2, canvasRef.clientHeight / 2).div(zoom)
    const [x, y] = elementCenter.sub(vp).toArray()

    this.updateCamera({zoom, point: [-x, -y]})
    this.saveCanvas()
    remote.info('💾 Saved updated camera')
  }

  backToContent() {
    const currentCanvas = this.currentCanvas
    if (!currentCanvas) return
    const center = this.getCenterPoint()
    const zoom = 0.5
    if (center) {
      const canvasRef = this.canvasRef!
      const vp = new Vec2d(canvasRef.clientWidth / 2, canvasRef.clientHeight / 2).div(zoom)
      const [x, y] = center.sub(vp).toArray()
      this.updateCanvas(currentCanvas.id, {camera: {zoom, point: [-x, -y]}})
      this.saveCanvas()
      remote.info('💾 Saved updated camera')
    }
  }

  snapToGrid() {
    const currentCanvas = this.currentCanvas
    if (!currentCanvas) return
    this.updateCanvas(currentCanvas.id, {snapToGrid: !currentCanvas.snapToGrid})
  }

  updateCamera(camera: Camera) {
    const currentCanvas = this.currentCanvas
    if (!currentCanvas) return
    this.updateCanvas(currentCanvas.id, {camera})
    this.saveCanvasDebounced()
  }

  updateCameraPoint(point: [number, number]) {
    const currentCanvas = this.currentCanvas
    if (!currentCanvas) return
    this.updateCanvas(currentCanvas.id, {camera: {...currentCanvas.camera, point}})
    this.saveCanvasDebounced()
  }

  deleteCanvas(id: string) {
    const canvas = this.findCanvas(id)
    if (!canvas) return

    this.updateCanvas(canvas.id, {
      deleted: true,
      lastModified: new Date(),
    })

    let max = 0
    let maxId = undefined

    for (const c of this.store.canvases) {
      if (c.deleted) continue
      const t = c.lastModified?.getTime() ?? 0
      if (t > max) {
        max = t
        maxId = c.id
      }
    }

    const updated = this.findCanvas(id)
    this.saveCanvas(updated)
    remote.info('💾 Canvas deleted')

    console.log({maxId})
    if (this.store.mode === Mode.Canvas && maxId) {
      this.open(maxId)
    }
  }

  select(id: string, active = false, extend = false) {
    const currentCanvas = this.currentCanvas
    if (!currentCanvas) return
    const newEl = currentCanvas.elements.find((el) => el.id === id)

    if (!extend) {
      for (const el of currentCanvas.elements) {
        if (el.id === id) continue
        this.updateCanvasElement(el.id, {selected: false, active: false})
      }
    }

    if (!newEl) return
    this.updateCanvasElement(newEl.id, {selected: true, active})

    if (active && isEditorElement(newEl)) {
      newEl.editorView?.focus()
    }
  }

  selectBox(box: Box2d) {
    const currentCanvas = this.currentCanvas
    if (!currentCanvas) return
    for (const el of currentCanvas.elements) {
      if (!isBoxElement(el)) continue
      const elBox = this.createBox(el)
      if (box.collides(elBox)) {
        this.updateCanvasElement(el.id, {selected: true})
      } else {
        this.updateCanvasElement(el.id, {selected: false})
      }
    }
  }

  deselect() {
    const currentCanvas = this.currentCanvas
    if (!currentCanvas) return
    for (const el of currentCanvas.elements) {
      this.updateCanvasElement(el.id, {selected: false, active: false})
    }
  }

  createCanvas(params: Partial<Canvas>): Canvas {
    return {
      camera: {point: [0, 0], zoom: 1},
      elements: [],
      lastModified: new Date(),
      ...params,
      id: params.id ?? uuidv4(),
    }
  }

  newCanvas() {
    this.removeDeadLinks()
    this.ctrl.collab.disconnectCollab()

    const state = unwrap(this.store)
    const id = uuidv4()
    const collab = this.ctrl.collab.create(id, Mode.Canvas, false)
    const canvas = this.createCanvas({id, active: true})

    const prev = state.canvases.map((c) => ({
      ...c,
      active: false,
      elements: c.elements.map((el) => {
        if (isEditorElement(el)) el.editorView?.destroy()
        return {...el, editorView: undefined}
      }),
    }))

    this.setState({
      ...state,
      collab,
      canvases: [...prev, canvas],
      mode: Mode.Canvas,
    })

    this.saveCanvas()
    remote.info('💾 New canvas created')
    DB.setMeta({mode: state.mode})
  }

  removeElement(elementId: string) {
    const currentCanvas = this.currentCanvas
    if (!currentCanvas) return
    const elements = []
    const toRemove = [elementId]

    for (const el of currentCanvas.elements) {
      if (isEditorElement(el) && el.id === elementId) {
        el.editorView?.destroy()
        continue
      }

      if (isLinkElement(el) && (el.from === elementId || el.to === elementId)) {
        toRemove.push(el.id)
        continue
      }

      if (el.id === elementId) {
        continue
      }

      elements.push(el)
    }

    const type = this.store.collab?.ydoc?.get(elementId)
    if (type) this.store.collab?.undoManager?.removeFromScope(type)

    this.ctrl.canvasCollab.removeMany(toRemove)
    this.updateCanvas(currentCanvas.id, {elements})
    this.saveCanvas()
    remote.info('💾 Element removed')
  }

  destroyElement(elementId: string) {
    const currentCanvas = this.currentCanvas
    if (!currentCanvas) return
    const element = currentCanvas.elements.find((el) => el.id === elementId)
    if (!element || !isEditorElement(element)) return

    element.editorView?.destroy()
    this.updateCanvasElement(element.id, {editorView: null})
  }

  open(id: string) {
    this.removeDeadLinks()
    this.ctrl.collab.disconnectCollab()

    const prevCanvas = this.currentCanvas
    const state = this.activateCanvas(unwrap(this.store), id)
    const collab = this.ctrl.collab.create(id, Mode.Canvas, false)

    this.setState({
      ...state,
      collab,
    })

    if (prevCanvas) {
      this.saveCanvas({...prevCanvas, active: false})
    }

    this.saveCanvas()
    DB.setMeta({mode: state.mode})
    remote.info('💾 Switched to canvas mode')

    this.ctrl.canvasCollab.init()
  }

  activateCanvas(state: State, id: string) {
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

    return {
      ...state,
      canvases,
      mode: Mode.Canvas,
    }
  }

  newFile(link?: CanvasLinkElement) {
    const file = this.ctrl.file.createFile()
    this.setState('files', [...this.store.files, file])
    this.addFile(file, link)
    remote.info('💾 New file added')
  }

  addFile(file: File, link?: CanvasLinkElement) {
    const currentCanvas = this.currentCanvas
    if (!currentCanvas) return

    const existing = currentCanvas.elements.find((el) => el.id === file.id)
    if (existing) return

    const width = 300
    const height = 350
    const {point, zoom} = currentCanvas.camera

    const isLink = link?.toX !== undefined && link.toY !== undefined
    let linkToEdge

    let x, y
    if (isLink) {
      const from = currentCanvas.elements.find((el) => el.id === link.from) as CanvasBoxElement
      if (!from) return
      const fromBox = this.createBox(from)
      const fromHandle = fromBox.getHandlePoint(link.fromEdge)

      x = link.toX ?? 0
      y = link.toY ?? 0

      const box = new Box2d(fromHandle.x, fromHandle.y, x - fromHandle.x, y - fromHandle.y)

      if (Math.abs(box.aspectRatio) > 1) {
        if (box.width > 0) {
          linkToEdge = EdgeType.Left
          y -= height / 2
        } else {
          linkToEdge = EdgeType.Right
          y -= height / 2
          x -= width
        }
      } else {
        if (box.height > 0) {
          linkToEdge = EdgeType.Top
          x -= width / 2
        } else {
          linkToEdge = EdgeType.Bottom
          x -= width / 2
          y -= height
        }
      }
    } else {
      const center = new Vec2d(window.innerWidth / 2, window.innerHeight / 2).toFixed()
      const p = Vec2d.FromArray(point)
      const target = center.div(zoom).sub(p).subXY(width / 2, height / 2)
      x = target.x
      y = target.y
    }

    const element: CanvasEditorElement = {
      type: ElementType.Editor,
      id: file.id,
      x,
      y,
      width,
      height,
    }

    const toAdd: CanvasElement[] = [element]

    this.updateCanvas(currentCanvas.id, {
      elements: [...currentCanvas.elements, element],
      lastModified: new Date(),
    })

    if (isLink) {
      const l = currentCanvas.elements.find((el) => el.id === link.id)
      if (!l) return
      this.updateCanvasElement(l.id, {
        to: file.id,
        toEdge: linkToEdge,
        toX: undefined,
        toY: undefined,
      })

      const updatedLink = currentCanvas.elements.find((el) => el.id === link.id)
      if (updatedLink) toAdd.push(unwrap(updatedLink))
    }

    this.ctrl.canvasCollab.addElements(toAdd)
    this.saveCanvas()
    remote.info('💾 Added file to canvas')
  }

  addImage(
    src: string,
    pageX: number,
    pageY: number,
    imageWidth: number,
    imageHeight: number
  ) {
    const currentCanvas = this.currentCanvas
    if (!currentCanvas) return

    const width = 300
    const height = width * imageHeight / imageWidth
    const {zoom, point} = currentCanvas.camera
    const p = Vec2d.FromArray(point)
    const {x, y} = new Vec2d(pageX, pageY).div(zoom).sub(p).subXY(width / 2, height / 2)

    const id = uuidv4()
    const element: CanvasImageElement = {
      type: ElementType.Image,
      id,
      src,
      x,
      y,
      width,
      height,
    }

    this.ctrl.canvasCollab.addElement(element)
    this.updateCanvas(currentCanvas.id, {
      elements: [...currentCanvas.elements, element],
      lastModified: new Date(),
    })

    this.saveCanvas()
    remote.info('💾 Added image to canvas')
  }

  addVideo(
    src: string,
    mime: string,
    pageX: number,
    pageY: number,
    imageWidth: number,
    imageHeight: number
  ) {
    const currentCanvas = this.currentCanvas
    if (!currentCanvas) return

    const width = 300
    const height = width * imageHeight / imageWidth
    const {zoom, point} = currentCanvas.camera
    const p = Vec2d.FromArray(point)
    const {x, y} = new Vec2d(pageX, pageY).div(zoom).sub(p).subXY(width / 2, height / 2)

    const id = uuidv4()
    const element: CanvasVideoElement = {
      type: ElementType.Video,
      id,
      src,
      mime,
      x,
      y,
      width,
      height,
    }

    this.ctrl.canvasCollab.addElement(element)
    this.updateCanvas(currentCanvas.id, {
      elements: [...currentCanvas.elements, element],
      lastModified: new Date(),
    })

    this.saveCanvas()
    remote.info('💾 Added video to canvas')
  }

  drawLink(id: string, from: string, fromEdge: EdgeType, toX: number, toY: number) {
    const currentCanvas = this.currentCanvas
    if (!currentCanvas) return

    const fromEl = currentCanvas.elements.find((el) => el.id === from) as CanvasBoxElement
    if (!fromEl) return

    const existing = currentCanvas.elements.find((el) => el.id === id)

    if (existing) {
      let toBox = this.getElementNear([toX, toY])
      if (toBox?.id === fromEl.id) {
        toBox = undefined
      }

      this.updateCanvasElement(existing.id, {
        ...(toBox ? {
          from,
          fromEdge,
          to: toBox.id,
          toEdge: toBox.edge,
          toX: undefined,
          toY: undefined,
          drawing: true,
        } : {
          from,
          fromEdge,
          toX,
          toY,
          to: undefined,
          toEdge: undefined,
          drawing: true,
        }),
      })
      return
    }

    const newLink: CanvasLinkElement = {
      type: ElementType.Link,
      drawing: true,
      id,
      from,
      fromEdge,
      toX,
      toY,
    }

    this.updateCanvas(currentCanvas.id, {
      elements: [...currentCanvas.elements, newLink],
    })
  }

  drawLinkEnd(id: string) {
    const currentCanvas = this.currentCanvas
    if (!currentCanvas) return

    const element = currentCanvas.elements.find((el) => el.id === id) as CanvasLinkElement
    if (!element) return

    this.updateCanvasElement(element.id, {drawing: undefined})

    if (element.to) {
      if (this.ctrl.canvasCollab.hasElement(id)) {
        this.ctrl.canvasCollab.updateElement(element)
      } else {
        this.ctrl.canvasCollab.addElement(element)
      }

      this.saveCanvas()
    }
  }

  findDeadLinks(): CanvasLinkElement[] {
    const currentCanvas = this.currentCanvas
    if (!currentCanvas) return []
    return currentCanvas.elements.filter((el) => {
      return isLinkElement(el) && el.to === undefined && !el.drawing
    }) as CanvasLinkElement[]
  }

  removeDeadLinks() {
    const currentCanvas = this.currentCanvas
    if (!currentCanvas) return false

    const elements = []
    const toRemove = []

    for (const el of currentCanvas.elements) {
      if (isLinkElement(el) && el.to === undefined) {
        toRemove.push(el.id)
        continue
      }

      elements.push(el)
    }

    if (elements.length !== currentCanvas.elements.length) {
      this.ctrl.canvasCollab.removeMany(toRemove)
      this.updateCanvas(currentCanvas.id, {elements})
      this.saveCanvas()
      remote.info('💾 Removed dead links')
    }
  }

  clearCanvas() {
    const currentCanvas = this.currentCanvas
    if (!currentCanvas) return

    this.ctrl.canvasCollab.removeAll()
    this.updateCanvas(currentCanvas.id, {elements: []})
    this.saveCanvas()
    remote.info('💾 All elements cleared')
  }

  async renderEditor(element: CanvasEditorElement, node: HTMLElement) {
    const file = this.ctrl.file.findFile({id: element.id})
    if (file) Y.applyUpdate(this.store.collab!.ydoc!, file.ydoc)
    this.updateEditorState(element.id, node)
  }

  updateEditorState(id: string, node?: Element) {
    const currentCanvas = this.currentCanvas
    if (!currentCanvas) return

    const element = currentCanvas?.elements.find((el) => el.id === id) as CanvasEditorElement
    if (!element) {
      return
    }

    let editorView = element?.editorView
    if (!editorView && !node) return

    const type = this.store.collab?.ydoc?.getXmlFragment(id)
    let file = this.ctrl.file.findFile({id})
    if (!file) {
      file = this.ctrl.file.createFile({id})
      this.setState('files', (prev) => [...prev, file!])
    }

    this.store.collab?.undoManager?.addToScope(type!)

    const extensions = createExtensions({
      ctrl: this.ctrl,
      markdown: false,
      type,
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

        this.ctrl.file.updateFile(id, {lastModified: new Date()})

        const updatedFile = this.store.files.find((f) => f.id === id)
        if (!updatedFile) return
        this.ctrl.file.saveFile(updatedFile)
        remote.info('💾 Saved updated text')
      }

      editorView = new EditorView(node!, {
        state: editorState,
        nodeViews,
        dispatchTransaction,
      })

      this.updateCanvasElement(element.id, {editorView})
    }

    editorView.setProps({state: editorState, nodeViews})
  }

  fetchCanvases(): Promise<Canvas[]> {
    return DB.getCanvases() as Promise<Canvas[]>
  }

  async deleteForever(id: string) {
    const canvases = this.store.canvases.filter((it) => it.id !== id)
    this.setState('canvases', canvases)
    await DB.deleteCanvas(id)
    remote.info('Canvas forever deleted')
  }

  async restore(id: string) {
    const canvas = this.findCanvas(id)
    if (!canvas) return

    this.updateCanvas(id, {deleted: false})

    const updateCanvas = this.findCanvas(id)
    if (!updateCanvas) return

    this.saveCanvas(updateCanvas)
    remote.info('Canavs restored')
  }

  getElementNear(point: [number, number]): {id: string; edge: EdgeType} | undefined {
    const currentCanvas = this.currentCanvas
    if (!currentCanvas) return

    const p = Vec2d.FromArray(point)

    for (const el of currentCanvas.elements) {
      if (!isBoxElement(el)) continue
      const box = this.createBox(el)

      const distT = Vec2d.DistanceToLineSegment(
        box.getHandlePoint('top_left').addXY(1, 0),
        box.getHandlePoint('top_right').subXY(1, 0),
        p
      )
      const distB = Vec2d.DistanceToLineSegment(
        box.getHandlePoint('bottom_left').addXY(1, 0),
        box.getHandlePoint('bottom_right').subXY(1, 0),
        p
      )
      const distL = Vec2d.DistanceToLineSegment(
        box.getHandlePoint('top_left').addXY(0, 1),
        box.getHandlePoint('bottom_left').subXY(0, 1),
        p
      )
      const distR = Vec2d.DistanceToLineSegment(
        box.getHandlePoint('top_right').addXY(0, 1),
        box.getHandlePoint('bottom_right').subXY(0, 1),
        p
      )

      const corners = [
        {e: EdgeType.Top, d: distT},
        {e: EdgeType.Bottom, d: distB},
        {e: EdgeType.Left, d: distL},
        {e: EdgeType.Right, d: distR},
      ]

      let min
      for (const c of corners) {
        if (!min || c.d < min.d) min = c
      }

      if (min !== undefined && min.d <= 30) {
        return {id: el.id, edge: min.e}
      }
    }
  }

  getCenterPoint(): Vec2d | undefined {
    const currentCanvas = this.currentCanvas
    if (!currentCanvas) return

    let all
    for (const el of currentCanvas.elements) {
      if (!isBoxElement(el)) continue
      const box = this.createBox(el)
      if (!all) all = box
      else all.expand(box)
    }

    return all?.center
  }

  findCanvas(id: string): Canvas | undefined {
    return this.store.canvases?.find((it) => it.id === id)
  }

  createBox(el: CanvasBoxElement) {
    const {x, y, width, height} = el
    return new Box2d(x, y, width, height)
  }

  private async saveCanvas(canvas = this.currentCanvas) {
    if (!canvas) return
    DB.updateCanvas(unwrap({
      ...canvas,
      elements: canvas.elements.map((el) => ({
        ...el,
        editorView: undefined,
        selected: undefined,
        active: undefined,
      }))
    }))
  }
}
