import {SetStoreFunction, Store, unwrap} from 'solid-js/store'
import {EditorState, Plugin, Transaction} from 'prosemirror-state'
import {EditorView} from 'prosemirror-view'
import {ySyncPluginKey} from 'y-prosemirror'
import {v4 as uuidv4} from 'uuid'
import {debounce} from 'ts-debounce'
import {Camera, Canvas, CanvasEditorElement, File, Mode, State} from '@/state'
import * as db from '@/db'
import * as remote from '@/remote'
import {createEmptyText, createExtensions, createNodeViews, createSchema} from '@/prosemirror-setup'
import {Ctrl} from '.'

interface UpdateCanvas {
  camera?: Camera;
  elements?: CanvasEditorElement[];
  lastModified?: Date;
}

interface UpdateCanvasElement {
  editorView?: EditorView;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  selected?: boolean;
  active?: boolean;
}

export enum EdgeType {
  Top,
  Right,
  Bottom,
  Left,
}

export enum CornerType {
  TopLeft,
  TopRight,
  BottomLeft,
  BottomRight,
}

export class CanvasService {
  private saveUpdatedCamera = debounce(() => this.saveCanvas(), 100)

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

  updateCanvasElement(id: string, elementIndex: number, update: UpdateCanvasElement) {
    const index = this.store.canvases.findIndex((canvas) => canvas.id === id)
    if (index === -1) return
    const hasOwn = (prop: string) => Object.hasOwn(update, prop)

    this.setState('canvases', index, 'elements', elementIndex, (prev) => ({
      editorView: hasOwn('editorView') ? update.editorView : prev?.editorView,
      x: hasOwn('x') ? update.x : prev?.x,
      y: hasOwn('y') ? update.y : prev?.y,
      width: hasOwn('width') ? update.width : prev?.width,
      height: hasOwn('height') ? update.height : prev?.height,
      selected: hasOwn('selected') ? update.selected : prev?.selected,
      active: hasOwn('active') ? update.active : prev?.active,
    }))
  }

  backToContent() {
    const currentCanvas = this.currentCanvas
    if (!currentCanvas) return
    this.updateCanvas(currentCanvas.id, {camera: {zoom: 1, point: [0, 0]}})
    this.saveCanvas()
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
        c.elements.forEach((el) => el.editorView?.destroy())
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
    if (prevIndex !== newIndex) {
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

  destroyElement(elementId: string) {
    const currentCanvas = this.currentCanvas
    if (!currentCanvas) return
    const elementIndex = currentCanvas.elements.findIndex((el) => el.id === elementId)
    if (elementIndex === -1) return
    currentCanvas.elements[elementIndex]?.editorView?.destroy()
    this.updateCanvasElement(currentCanvas.id, elementIndex, {editorView: undefined})
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
            el.editorView?.destroy()
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

  addToCanvas(file: File) {
    const currentCanvas = this.currentCanvas
    if (!currentCanvas) return

    const existing = currentCanvas.elements.find((el) => el.id === file.id)
    if (existing) return

    const x = (currentCanvas.elements.length ?? 0) * 400
    const element: CanvasEditorElement = {
      type: 'editor',
      id: file.id,
      x: x,
      y: 0,
      width: 300,
      height: 350,
    }

    this.updateCanvas(currentCanvas.id, {
      elements: [...currentCanvas.elements, element],
      lastModified: new Date(),
    })

    this.saveCanvas()
  }

  clearCanvas() {
    const currentCanvas = this.currentCanvas
    if (!currentCanvas) return
    this.updateCanvas(currentCanvas.id, {elements: []})
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

    let editorView = currentCanvas?.elements[elementIndex]?.editorView
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

      this.updateCanvasElement(currentCanvas.id, elementIndex, {editorView})
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
