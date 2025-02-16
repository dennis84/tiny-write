import {SetStoreFunction, Store, unwrap} from 'solid-js/store'
import {TextSelection} from 'prosemirror-state'
import {v4 as uuidv4} from 'uuid'
import {Box, Vec} from '@tldraw/editor'
import {throttle} from 'throttle-debounce'
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
  isCodeElement,
} from '@/state'
import {DB} from '@/db'
import {info} from '@/remote/log'
import {FileService} from './FileService'
import {CollabService} from './CollabService'
import {SelectService} from './SelectService'

type UpdateElement =
  | Partial<CanvasLinkElement>
  | Partial<CanvasEditorElement>
  | Partial<CanvasBoxElement>

export interface Selection {
  elements: [string, Box][]
  box: Box
}

export class CanvasService {
  public saveCanvasThrottled = throttle(100, () => this.saveCanvas())
  public canvasRef: HTMLElement | undefined

  static async saveCanvas(canvas: Canvas) {
    await DB.updateCanvas(
      unwrap({
        ...canvas,
        elements: canvas.elements.map((el) => ({
          ...el,
          editorView: undefined,
          selected: undefined,
          active: undefined,
        })),
      }),
    )
  }

  static async fetchCanvases(): Promise<Canvas[]> {
    return DB.getCanvases() as Promise<Canvas[]>
  }

  constructor(
    private fileService: FileService,
    private selectService: SelectService,
    private store: Store<State>,
    private setState: SetStoreFunction<State>,
  ) {}

  get currentCanvas() {
    return this.store.canvases?.find((c) => c.active)
  }

  get selection(): Selection | undefined {
    const currentCanvas = this.currentCanvas
    if (!currentCanvas) return
    const elements: [string, Box][] = []
    let box
    for (const el of currentCanvas.elements) {
      if (!el.selected) continue
      if (isBoxElement(el)) {
        const elBox = this.createBox(el)
        if (!box) box = Box.From(elBox)
        else box.expand(elBox)
        elements.push([el.id, elBox])
      }
    }

    if (!box || elements.length < 2) return
    return {box, elements}
  }

  static createCanvas(params: Partial<Canvas>): Canvas {
    return {
      camera: {point: [0, 0], zoom: 1},
      elements: [],
      lastModified: new Date(),
      ...params,
      id: params.id ?? uuidv4(),
    }
  }

  static activateCanvas(state: State, id: string) {
    const canvases = []
    const files = []

    for (const file of state.files) {
      file.editorView?.destroy()
      file.codeEditorView?.destroy()
      files.push({...file, active: false, editorView: undefined, codeEditorView: undefined})
    }

    for (const canvas of state.canvases) {
      if (canvas.id === id) {
        canvases.push({...canvas, active: true})
      } else if (canvas.active) {
        canvases.push({...canvas, active: false})
      } else {
        canvases.push(canvas)
      }
    }

    return {
      ...state,
      canvases,
      files,
      mode: Mode.Canvas,
    }
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

  async focus(id: string) {
    const currentCanvas = this.currentCanvas
    if (!currentCanvas) return
    const element = currentCanvas.elements.find((el) => el.id === id) as CanvasBoxElement
    if (!element) return

    const zoom = currentCanvas.camera.zoom
    const elementCenter = this.createBox(element).center
    const canvasRef = this.canvasRef!
    const vp = new Vec(canvasRef.clientWidth / 2, canvasRef.clientHeight / 2).div(zoom)
    const [x, y] = elementCenter.sub(vp).toArray()

    this.updateCamera({zoom, point: [-x, -y]})
    await this.saveCanvas()
    info('Canvas saved after camera update')
  }

  async backToContent(point: Vec | undefined = undefined, zoom = 0.5) {
    const currentCanvas = this.currentCanvas
    if (!currentCanvas) return
    const center = point ?? this.getCenterPoint()
    if (center) {
      const canvasRef = this.canvasRef!
      const vp = new Vec(canvasRef.clientWidth / 2, canvasRef.clientHeight / 2).div(zoom)
      const [x, y] = center.sub(vp).toArray()
      this.updateCanvas(currentCanvas.id, {camera: {zoom, point: [-x, -y]}})
      await this.saveCanvas()
      info('Canvas saved after camera update')
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
    void this.saveCanvasThrottled()
  }

  updateCameraPoint(point: [number, number]) {
    const currentCanvas = this.currentCanvas
    if (!currentCanvas) return
    this.updateCanvas(currentCanvas.id, {camera: {...currentCanvas.camera, point}})
    void this.saveCanvasThrottled()
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

    if (active && (isEditorElement(newEl) || isCodeElement(newEl))) {
      const file = this.fileService.findFileById(newEl.id)
      this.fileService.setActive(newEl.id)
      file?.editorView?.focus()
      file?.codeEditorView?.focus()
    }
  }

  selectBox(box: Box, first: boolean, last: boolean) {
    const currentCanvas = this.currentCanvas
    if (!currentCanvas) return

    const active = currentCanvas.elements.find(
      (it) => isEditorElement(it) && it.active,
    ) as CanvasEditorElement
    const file = this.fileService.findFileById(active?.id)

    if (file?.editorView) {
      this.selectService.selectBox(box, file.editorView, first, last)
      return
    }

    const {
      zoom,
      point: [x, y],
    } = currentCanvas.camera
    const b = Box.From(box).set(box.x / zoom - x, box.y / zoom - y, box.w / zoom, box.h / zoom)

    for (const el of currentCanvas.elements) {
      if (!isBoxElement(el)) continue
      const elBox = this.createBox(el)
      if (b.collides(elBox)) {
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
      if ((isEditorElement(el) || isCodeElement(el)) && el.active) {
        const file = this.fileService.findFileById(el.id)
        if (file?.editorView) {
          const tr = file.editorView.state.tr
          tr.setSelection(TextSelection.atStart(file.editorView.state.doc))
          file.editorView.dispatch(tr)
        } else if (file?.codeEditorView) {
          file.codeEditorView.dispatch({selection: {anchor: 0}})
        }

        this.fileService.setActive(el.id, false)
      }

      this.updateCanvasElement(el.id, {selected: false, active: false})
    }
  }

  async newCanvas(params: Partial<Canvas> = {}): Promise<Canvas> {
    await this.removeDeadLinks()

    const id = uuidv4()
    const canvas = CanvasService.createCanvas({...params, id})

    this.setState('canvases', (prev) => [...prev, canvas])
    info('New canvas created')

    return canvas
  }

  async removeElements(elementIds: string[]): Promise<string[]> {
    const currentCanvas = this.currentCanvas
    if (!currentCanvas) return []
    const elements = []
    const removedIds = new Set(elementIds)

    outer: for (const el of currentCanvas.elements) {
      for (const elementId of elementIds) {
        if (isEditorElement(el) && el.id === elementId) {
          const file = this.fileService.findFileById(el.id)
          file?.editorView?.destroy()
          file?.codeEditorView?.destroy()
          continue outer
        }

        if (isLinkElement(el) && (el.from === elementId || el.to === elementId)) {
          removedIds.add(el.id)
          continue outer
        }

        if (el.id === elementId) {
          continue outer
        }
      }

      elements.push(el)
    }

    this.updateCanvas(currentCanvas.id, {elements: [...elements]})
    await this.saveCanvas()
    info('Canvas saved after removing element')

    return [...removedIds]
  }

  async open(id: string, share = false) {
    info(`Open canvas (id=${id}, share=${share})`)

    const prevCanvas = this.currentCanvas

    let state = unwrap(this.store)

    if (!this.findCanvas(id)) {
      const canvas = CanvasService.createCanvas({id})
      state.canvases.push(canvas)
    }

    state = CanvasService.activateCanvas(state, id)
    const collab = CollabService.create(id, Mode.Canvas, share)

    this.setState({...state, collab})

    if (prevCanvas) {
      await this.saveCanvas({...prevCanvas, active: false})
    }

    await this.saveCanvas()
    await DB.setMode(state.mode)
    info('Saved canvas and mode after open')
  }

  async newFile(
    code = false,
    link?: CanvasLinkElement,
    point?: Vec,
  ): Promise<CanvasElement | undefined> {
    const currentCanvas = this.currentCanvas
    if (!currentCanvas) return

    const file = FileService.createFile({code})
    file.parentId = currentCanvas.id

    this.setState('files', [...this.store.files, file])
    const added = await this.addFile(file, link, point)
    info('New file added')

    return added?.[0]
  }

  async addFile(
    file: File,
    link?: CanvasLinkElement,
    point?: Vec,
  ): Promise<CanvasElement[] | undefined> {
    const currentCanvas = this.currentCanvas
    if (!currentCanvas) return

    const existing = currentCanvas.elements.find((el) => el.id === file.id)
    if (existing) return

    const width = 300
    const height = 350
    const camera = currentCanvas.camera

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

      const box = new Box(fromHandle.x, fromHandle.y, x - fromHandle.x, y - fromHandle.y)

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
    } else if (point) {
      ;[x, y] = point.toArray()
    } else {
      const center = new Vec(window.innerWidth / 2, window.innerHeight / 2).toFixed()
      const p = Vec.FromArray(camera.point)
      const target = center
        .div(camera.zoom)
        .sub(p)
        .subXY(width / 2, height / 2)
      x = target.x
      y = target.y
    }

    const element = {
      type: file.code ? ElementType.Code : ElementType.Editor,
      id: file.id,
      x,
      y,
      width,
      height,
    }

    const addedElements: CanvasElement[] = [element]

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
      if (updatedLink) addedElements.push(unwrap(updatedLink))
    }

    await this.saveCanvas()
    info('File added to canvas')

    return addedElements
  }

  async addImage(
    src: string,
    point: Vec,
    imageWidth: number,
    imageHeight: number,
  ): Promise<CanvasImageElement | undefined> {
    const currentCanvas = this.currentCanvas
    if (!currentCanvas) return

    const width = 300
    const height = (width * imageHeight) / imageWidth
    const {x, y} = point.subXY(width / 2, height / 2)

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

    this.updateCanvas(currentCanvas.id, {
      elements: [...currentCanvas.elements, element],
      lastModified: new Date(),
    })

    await this.saveCanvas()
    info('Image added to canvas')

    return element
  }

  async addVideo(
    src: string,
    mime: string,
    point: Vec,
    imageWidth: number,
    imageHeight: number,
  ): Promise<CanvasVideoElement | undefined> {
    const currentCanvas = this.currentCanvas
    if (!currentCanvas) return

    const width = 300
    const height = (width * imageHeight) / imageWidth
    const {x, y} = point.subXY(width / 2, height / 2)

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

    this.updateCanvas(currentCanvas.id, {
      elements: [...currentCanvas.elements, element],
      lastModified: new Date(),
    })

    await this.saveCanvas()
    info('Video added to canvas')

    return element
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

      const element =
        toBox ?
          {
            from,
            fromEdge,
            to: toBox.id,
            toEdge: toBox.edge,
            toX: undefined,
            toY: undefined,
            drawing: true,
          }
        : {
            from,
            fromEdge,
            toX,
            toY,
            to: undefined,
            toEdge: undefined,
            drawing: true,
          }

      this.updateCanvasElement(existing.id, element)
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

  async drawLinkEnd(id: string): Promise<CanvasLinkElement | undefined> {
    const currentCanvas = this.currentCanvas
    if (!currentCanvas) return

    const element = currentCanvas.elements.find((el) => el.id === id) as CanvasLinkElement
    if (!element) return

    this.updateCanvasElement(element.id, {drawing: undefined})

    if (element.to) {
      await this.saveCanvas()
      return unwrap(element)
    }
  }

  findDeadLinks(): CanvasLinkElement[] {
    const currentCanvas = this.currentCanvas
    if (!currentCanvas) return []
    return currentCanvas.elements.filter((el) => {
      return isLinkElement(el) && el.to === undefined && !el.drawing
    }) as CanvasLinkElement[]
  }

  async removeDeadLinks(): Promise<string[]> {
    const currentCanvas = this.currentCanvas
    if (!currentCanvas) return []

    const elements = []
    const removedIds = []

    for (const el of currentCanvas.elements) {
      if (isLinkElement(el) && el.to === undefined) {
        removedIds.push(el.id)
        continue
      }

      elements.push(el)
    }

    if (elements.length !== currentCanvas.elements.length) {
      this.updateCanvas(currentCanvas.id, {elements})
      await this.saveCanvas()
      info('Removed dead links')
    }

    return removedIds
  }

  async clearCanvas() {
    const currentCanvas = this.currentCanvas
    if (!currentCanvas) return

    this.updateCanvas(currentCanvas.id, {elements: []})
    await this.saveCanvas()
    info('All elements cleared')
  }

  async restore(id: string) {
    const canvas = this.findCanvas(id)
    if (!canvas) return

    this.updateCanvas(id, {deleted: false})

    const updateCanvas = this.findCanvas(id)
    if (!updateCanvas) return

    await this.saveCanvas(updateCanvas)
    info('Canavs restored')
  }

  setMoving(moving: boolean) {
    this.setState('moving', moving)
  }

  getElementNear(point: [number, number]): {id: string; edge: EdgeType} | undefined {
    const currentCanvas = this.currentCanvas
    if (!currentCanvas) return

    const p = Vec.FromArray(point)

    for (const el of currentCanvas.elements) {
      if (!isBoxElement(el)) continue
      const box = this.createBox(el)

      const distT = Vec.DistanceToLineSegment(
        box.getHandlePoint('top_left').addXY(1, 0),
        box.getHandlePoint('top_right').subXY(1, 0),
        p,
      )
      const distB = Vec.DistanceToLineSegment(
        box.getHandlePoint('bottom_left').addXY(1, 0),
        box.getHandlePoint('bottom_right').subXY(1, 0),
        p,
      )
      const distL = Vec.DistanceToLineSegment(
        box.getHandlePoint('top_left').addXY(0, 1),
        box.getHandlePoint('bottom_left').subXY(0, 1),
        p,
      )
      const distR = Vec.DistanceToLineSegment(
        box.getHandlePoint('top_right').addXY(0, 1),
        box.getHandlePoint('bottom_right').subXY(0, 1),
        p,
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

  getCenterPoint(): Vec | undefined {
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
    return new Box(x, y, width, height)
  }

  getPosition([x, y]: [number, number]): Vec | undefined {
    const currentCanvas = this.currentCanvas
    if (!currentCanvas) return
    const {camera} = currentCanvas
    const point = new Vec(x, y)
    return point.div(camera.zoom).sub(Vec.FromArray(camera.point))
  }

  async saveCanvas(canvas = this.currentCanvas) {
    if (!canvas) return
    CanvasService.saveCanvas(canvas)
  }
}
