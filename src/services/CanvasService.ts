import {Box, Point, Segment, Vector} from '@flatten-js/core'
import {TextSelection} from 'prosemirror-state'
import {type SetStoreFunction, type Store, unwrap} from 'solid-js/store'
import {throttle} from 'throttle-debounce'
import {v4 as uuidv4} from 'uuid'
import {DB} from '@/db'
import {info} from '@/remote/log'
import {
  type Camera,
  type Canvas,
  type CanvasBoxElement,
  type CanvasEditorElement,
  type CanvasElement,
  type CanvasImageElement,
  type CanvasLinkElement,
  type CanvasPoint,
  type CanvasRect,
  type CanvasVideoElement,
  EdgeType,
  ElementType,
  type File,
  isBoxElement,
  isCodeElement,
  isEditorElement,
  isLinkElement,
  Page,
  type State,
} from '@/state'
import {BoxUtil} from '@/utils/BoxUtil'
import {PointUtil} from '@/utils/PointUtil'
import {VecUtil} from '@/utils/VecUtil'
import {CollabService} from './CollabService'
import {FileService} from './FileService'
import type {SelectService} from './SelectService'

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
    await DB.updateCanvas({
      ...canvas,
      elements: canvas.elements.map((el) => ({
        ...el,
        editorView: undefined,
        selected: undefined,
        active: undefined,
      })),
    })
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

  get currentCanvasId() {
    return this.store.lastLocation?.canvasId
  }

  get currentCanvas() {
    const canavsId = this.currentCanvasId
    if (!canavsId) return undefined
    return this.store.canvases?.find((c) => c.id === canavsId)
  }

  get currentCanvasIndex() {
    const canavsId = this.currentCanvasId
    if (!canavsId) return -1
    return this.store.canvases?.findIndex((c) => c.id === canavsId)
  }

  get selection(): Selection | undefined {
    const currentCanvas = this.currentCanvas
    if (!currentCanvas) return undefined
    const elements: [string, Box][] = []
    let box: Box | undefined
    for (const el of currentCanvas.elements) {
      if (!el.selected) continue
      if (isBoxElement(el)) {
        const elBox = this.createBox(el)
        if (!box) box = elBox
        else box = box.merge(elBox)
        elements.push([el.id, elBox])
      }
    }

    if (!box || elements.length < 2) return undefined
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

  // static activateCanvas(state: State, id: string) {
  //   const canvases = []
  //   const files = []
  //
  //   for (const file of state.files) {
  //     file.editorView?.destroy()
  //     file.codeEditorView?.destroy()
  //     files.push({...file, active: false, editorView: undefined, codeEditorView: undefined})
  //   }
  //
  //   for (const canvas of state.canvases) {
  //     if (canvas.id === id) {
  //       canvases.push({...canvas, active: true})
  //     } else if (canvas.active) {
  //       canvases.push({...canvas, active: false})
  //     } else {
  //       canvases.push(canvas)
  //     }
  //   }
  //
  //   return {
  //     ...state,
  //     canvases,
  //     files,
  //   }
  // }

  updateCanvas(id: string, update: Partial<Canvas>) {
    const index = this.store.canvases.findIndex((canvas) => canvas.id === id)
    if (index === -1) return
    this.setState('canvases', index, update)
  }

  updateCanvasElement(elementId: string, update: UpdateElement) {
    const index = this.currentCanvasIndex
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
    const centerPoint = this.createBox(element).center
    const elementCenter = new Vector(centerPoint.x, centerPoint.y)
    const canvasRef = this.canvasRef
    if (!canvasRef) return
    const vp = new Vector(canvasRef.clientWidth / 2, canvasRef.clientHeight / 2).multiply(1 / zoom)
    const {x, y} = elementCenter.subtract(vp)

    this.updateCamera({zoom, point: [-x, -y]})
    await this.saveCanvas()
    info('Canvas saved after camera update')
  }

  async backToContent(point: Vector | undefined = undefined, zoom = 0.5) {
    const currentCanvas = this.currentCanvas
    if (!currentCanvas) return
    const center = point ?? this.getCenterPoint()
    if (center) {
      const canvasRef = this.canvasRef
      if (!canvasRef) return

      const vp = new Vector(canvasRef.clientWidth / 2, canvasRef.clientHeight / 2).multiply(
        1 / zoom,
      )
      const {x, y} = center.subtract(vp)
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
    const b = new Box(
      box.xmin / zoom - x,
      box.ymin / zoom - y,
      box.xmax / zoom - x,
      box.ymax / zoom - y,
    )

    for (const el of currentCanvas.elements) {
      if (!isBoxElement(el)) continue
      const elBox = this.createBox(el)
      if (b.intersect(elBox)) {
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

    this.updateCanvas(currentCanvas.id, {elements})
    await this.saveCanvas()
    info('Canvas saved after removing element')

    return [...removedIds]
  }

  async open(id: string, share = false) {
    info(`Open canvas (id=${id}, share=${share})`)

    const files = []
    for (const file of this.store.files) {
      file.editorView?.destroy()
      file.codeEditorView?.destroy()
      files.push({...file, editorView: undefined, codeEditorView: undefined})
    }

    const newState = {...this.store, files}

    if (!this.findCanvas(id)) {
      const canvas = CanvasService.createCanvas({id})
      newState.canvases = [...newState.canvases, canvas]
    }

    newState.args = {
      ...newState.args,
      selection: undefined,
      merge: undefined,
    }

    const collab = CollabService.create(id, Page.Canvas, share)

    this.setState({...newState, collab})
    const canvas = this.findCanvas(id)

    await this.saveCanvas(canvas)
  }

  async newFile(
    code = false,
    link?: CanvasLinkElement,
    point?: Vector,
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
    point?: Vector,
  ): Promise<CanvasElement[] | undefined> {
    const currentCanvas = this.currentCanvas
    if (!currentCanvas) return

    const existing = currentCanvas.elements.find((el) => el.id === file.id)
    if (existing) return

    const width = 300
    const height = 350
    const camera = currentCanvas.camera

    const isLink = link?.toX !== undefined && link.toY !== undefined
    let linkToEdge: EdgeType | undefined

    let x: number, y: number
    if (isLink) {
      const from = currentCanvas.elements.find((el) => el.id === link.from) as CanvasBoxElement
      if (!from) return
      const fromBox = this.createBox(from)
      const fromHandle = BoxUtil.getHandlePoint(fromBox, link.fromEdge)

      x = link.toX ?? 0
      y = link.toY ?? 0

      const box = new Box(
        Math.min(fromHandle.x, x),
        Math.min(fromHandle.y, y),
        Math.max(fromHandle.x, x),
        Math.max(fromHandle.y, y),
      )

      if (box.width > box.height) {
        if (x > fromHandle.x) {
          linkToEdge = EdgeType.Left
          y -= height / 2
        } else {
          linkToEdge = EdgeType.Right
          y -= height / 2
          x -= width
        }
      } else {
        if (y > fromHandle.y) {
          linkToEdge = EdgeType.Top
          x -= width / 2
        } else {
          linkToEdge = EdgeType.Bottom
          x -= width / 2
          y -= height
        }
      }
    } else if (point) {
      x = point.x
      y = point.y
    } else {
      const center = new Vector(window.innerWidth / 2, window.innerHeight / 2)
      const p = VecUtil.fromArray(camera.point)
      const target = center
        .multiply(1 / camera.zoom)
        .subtract(p)
        .translate(-width / 2, -height / 2)
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
    point: Vector,
    imageWidth: number,
    imageHeight: number,
  ): Promise<CanvasImageElement | undefined> {
    const currentCanvas = this.currentCanvas
    if (!currentCanvas) return

    const width = 300
    const height = (width * imageHeight) / imageWidth
    const {x, y} = point.translate(-width / 2, -height / 2)

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
    point: Vector,
    imageWidth: number,
    imageHeight: number,
  ): Promise<CanvasVideoElement | undefined> {
    const currentCanvas = this.currentCanvas
    if (!currentCanvas) return

    const width = 300
    const height = (width * imageHeight) / imageWidth
    const {x, y} = point.translate(-width / 2, -height / 2)

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

      const element = toBox
        ? {
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

  getElementNear(point: CanvasPoint): {id: string; edge: EdgeType} | undefined {
    const currentCanvas = this.currentCanvas
    if (!currentCanvas) return

    const p = PointUtil.fromVec(VecUtil.fromArray(point))

    const shrink = (segment: Segment, h: number, v: number) => {
      const seg = new Segment(
        new Point(
          Math.min(segment.start.x, segment.end.x),
          Math.min(segment.start.y, segment.end.y),
        ),
        new Point(
          Math.max(segment.start.x, segment.end.x),
          Math.max(segment.start.y, segment.end.y),
        ),
      )
      seg.ps.x += h
      seg.ps.y += v
      seg.pe.x -= h
      seg.pe.y -= v
      return seg
    }

    for (const el of currentCanvas.elements) {
      if (!isBoxElement(el)) continue
      const box = this.createBox(el)

      const [t, r, b, l] = box.toSegments()

      const distT = p.distanceTo(shrink(t, 1, 0))
      const distB = p.distanceTo(shrink(b, 1, 0))
      const distL = p.distanceTo(shrink(l, 0, 1))
      const distR = p.distanceTo(shrink(r, 0, 1))

      const corners = [
        {e: EdgeType.Top, d: distT},
        {e: EdgeType.Bottom, d: distB},
        {e: EdgeType.Left, d: distL},
        {e: EdgeType.Right, d: distR},
      ]

      let min: (typeof corners)[number] | undefined
      for (const c of corners) {
        if (!min || c.d[0] < min.d[0]) min = c
      }

      if (min !== undefined && min.d[0] <= 30) {
        return {id: el.id, edge: min.e}
      }
    }
  }

  getCenterPoint(): Vector | undefined {
    const currentCanvas = this.currentCanvas
    if (!currentCanvas?.elements.length) return

    let all!: Box
    for (const el of currentCanvas.elements) {
      if (!isBoxElement(el)) continue
      const box = this.createBox(el)
      if (!all) all = box
      else all = all.merge(box)
    }

    const point = all.center
    return new Vector(point.x, point.y)
  }

  findCanvas(id: string): Canvas | undefined {
    return this.store.canvases?.find((it) => it.id === id)
  }

  createBox(el: CanvasRect) {
    const {x, y, width, height} = el
    return new Box(x, y, x + width, y + height)
  }

  getPosition([x, y]: CanvasPoint): Vector | undefined {
    const currentCanvas = this.currentCanvas
    if (!currentCanvas) return
    const {camera} = currentCanvas
    const point = new Vector(x, y)
    return point.multiply(1 / camera.zoom).subtract(VecUtil.fromArray(camera.point))
  }

  async saveCanvas(canvas = this.currentCanvas) {
    if (!canvas) return
    await CanvasService.saveCanvas(canvas)
  }
}
