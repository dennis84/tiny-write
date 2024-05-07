import {Store, unwrap, SetStoreFunction} from 'solid-js/store'
import {stateToString} from '@/utils/debug'
import * as remote from '@/remote'
import {State, ServiceError, Window, File, FileText, Mode, ErrorObject} from '@/state'
import {DB} from '@/db'
import {isTauri} from '@/env'
import {Ctrl} from '.'
import {ConfigService} from './ConfigService'
import {CanvasService} from './CanvasService'
import {EditorService} from './EditorService'
import {FileService} from './FileService'
import {CollabService} from './CollabService'

interface InitResult {
  data: State;
  markdownDoc?: FileText;
}

class InitError extends Error {
  constructor(public data: State, message?: string) {
    super(message)
  }
}

export class AppService {
  public layoutRef: HTMLElement | undefined

  constructor(
    private ctrl: Ctrl,
    private store: Store<State>,
    private setState: SetStoreFunction<State>,
  ) {}

  get mode() {
    return this.store.mode
  }

  get fullscreen() {
    return this.store.fullscreen
  }

  // State initialization:

  // List files
  static showDir(data: State): InitResult {
    // do nothing
    return {data}
  }

  // Normal init in editor mode
  static async editorMode(data: State): Promise<InitResult> {
    let currentFile = data.files.find((f) => f.active)
    let markdownDoc

    if (!currentFile) {
      currentFile = FileService.createFile()
      data.files.push(currentFile as File)
    }

    if (currentFile?.path) {
      const result = await this.loadMarkdownFile(currentFile)
      currentFile = result.file
      markdownDoc = result.doc
    }

    data.collab = CollabService.create(currentFile.id, data.mode, false)
    data = await EditorService.activateFile(data, currentFile)
    return {data, markdownDoc}
  }

  // Normal init in canvas mode
  static async canvasMode(data: State): Promise<InitResult> {
    const currentCanvas = data.canvases.find((c) => c.active)
    if (currentCanvas) {
      data = CanvasService.activateCanvas(data, currentCanvas.id)
      data.collab = CollabService.create(currentCanvas.id, data.mode, false)
      return {data}
    } else {
      throw new InitError(data, 'No current canvas')
    }
  }

  // If app was started with a file argument
  // newFile=true id passed file does not exist
  static async openFile(data: State, isNew = false): Promise<InitResult> {
    const path = isNew ? data.args?.newFile : data.args?.file
    if (!path) throw new InitError(data, 'No file arg')

    let currentFile = data.files.find((f) => f.path === path)
    let markdownDoc

    if (!currentFile) {
      const props = isNew ? {newFile: path} : {path}
      currentFile = FileService.createFile(props)
      data.files.push(currentFile as File)
    }

    if (currentFile.path) {
      const result = await this.loadMarkdownFile(currentFile)
      currentFile = result.file
      markdownDoc = result.doc
    }

    data = await EditorService.activateFile(data, currentFile)
    data.collab = CollabService.create(currentFile.id, data.mode, false)
    return {data, markdownDoc}
  }

  // Join collab if room was passed
  static async joinRoom(data: State): Promise<InitResult> {
    const room = data.args?.room
    if (!room) throw new InitError(data, 'No room arg')

    if (data.mode === Mode.Editor) {
      let currentFile = data.files.find((f) => f.id === room)
      if (!currentFile) {
        currentFile = FileService.createFile({id: room})
        data.files.push(currentFile)
      }

      // do not load file contents?

      data = await EditorService.activateFile(data, currentFile)
      data.collab = CollabService.create(currentFile.id, data.mode, true)
      return {data}
    } else if (data.mode === Mode.Canvas) {
      let currentCanvas = data.canvases.find((c) => c.id === room)
      if (!currentCanvas) {
        currentCanvas = CanvasService.createCanvas({id: room})
        data.canvases.push(currentCanvas)
      }

      data = CanvasService.activateCanvas(data, currentCanvas.id)
      data.collab = CollabService.create(currentCanvas.id, data.mode, true)
      return {data}
    } else {
      throw new InitError(data, 'Unknown mode')
    }
  }

  private static async loadMarkdownFile(file: File): Promise<{file: File; doc?: FileText}> {
    let doc: FileText | undefined
    try {
      doc = (await FileService.loadFile(file.path!)).text
    } catch (e) {
      remote.info(`Could not load current file with path, not found (path=${file.path})`)
      file.newFile = file.path
      file.path = undefined
    }

    return {file, doc}
  }

  async init() {
    const data = await this.fetchData()
    remote.debug(`Fetched data: ${stateToString(data)}`)
    remote.info(`Init app (mode=${data.mode}, args=${JSON.stringify(data.args)})`)

    try {
      if (isTauri() && data.window) {
        await remote.updateWindow(data.window)
      }

      let result

      if (data.args?.dir) {
        remote.info('Init with dir')
        result = AppService.showDir(data)
      } else if (data.args?.file) {
        remote.info('Init with file')
        result = await AppService.openFile(data)
      } else if (data.args?.newFile) {
        remote.info('Init with new file')
        result = await AppService.openFile(data, true)
      } else if (data.args?.room) {
        remote.info('Init with join room')
        result = await AppService.joinRoom(data)
      } else if (data.mode === Mode.Editor) {
        remote.info('Init without args in editor mode')
        result = await AppService.editorMode(data)
      } else if (data.mode === Mode.Canvas) {
        remote.info('Init without args in canvas mode')
        result = await AppService.canvasMode(data)
      } else {
        throw new InitError(data, 'Mode not known')
      }

      const newState: State = {
        ...result.data,
        config: {...result.data.config, ...ConfigService.getThemeConfig(data)},
        loading: 'initialized',
      }

      if (isTauri() && newState.config?.alwaysOnTop) {
        await remote.setAlwaysOnTop(true)
      }

      this.setState(newState)

      if (data.mode === Mode.Editor) {
        this.ctrl.editor.updateText(result.markdownDoc)
      } else {
        this.ctrl.canvasCollab.init()
      }

      this.ctrl.collab.init()
      this.ctrl.tree.create()
    } catch(e: any) {
      const error = this.createError(e)
      remote.error(`Error during init: ${e.message}`)
      const data = e.data ?? {}
      this.setState({...data, error, loading: 'initialized'})
    }

    await DB.cleanup()

    if (isTauri()) {
      await remote.show()
    }
  }

  async getBasePath() {
    let currentFile
    if (this.mode === Mode.Editor) {
      currentFile = this.ctrl.file.currentFile
    } else {
      const active = this.ctrl.canvas.activeEditorElement
      if (active) currentFile = this.ctrl.file.findFileById(active.id)
    }

    const filePath = currentFile?.path ?? currentFile?.newFile
    const basePath = filePath ? await remote.dirname(filePath) : undefined

    return basePath ?? this.store.args?.cwd
  }

  setError(data: Partial<ErrorObject>) {
    const error = this.createError(data)
    remote.error(`Error thrown (error=${error}})`, error)
    this.setState({error, loading: 'initialized'})
  }

  async reset() {
    this.ctrl.collab.disconnectCollab()
    await DB.deleteDatabase()
  }

  async setFullscreen(fullscreen: boolean) {
    await remote.setFullscreen(fullscreen)
    this.setState('fullscreen', fullscreen)
  }

  async updateWindow(win: Partial<Window>) {
    if (this.store.fullscreen) return
    this.setState('window', {...this.store.window, ...win})
    if (!this.store.window) return
    const updatedWindow = unwrap(this.store.window)
    await DB.setWindow(updatedWindow)
    remote.info('Saved window state')
  }

  setSelecting(selecting: boolean) {
    this.setState('selecting', selecting)
  }

  private async fetchData(): Promise<State> {
    const state = unwrap(this.store)
    const args = await remote.getArgs().catch(() => undefined) ?? state.args ?? {}

    const room = window.location.pathname?.slice(1).trim()
    if (room) args.room = room

    const fetchedWindow = await DB.getWindow()
    const fetchedConfig = await DB.getConfig()
    const files = await this.ctrl.file.fetchFiles() ?? state.files ?? []
    const canvases = await this.ctrl.canvas.fetchCanvases() ?? state.canvases ?? []
    const meta = await DB.getMeta()
    const tree = await DB.getTree()

    let mode = meta?.mode ?? state.mode ?? Mode.Editor
    if (args.room) {
      const [m, r] = this.parseRoom(args.room)
      mode = m
      args.room = r
    }

    // Only show dir is it's not empty
    if (!args.dir?.length) {
      args.dir = undefined
    }

    const config = {
      ...state.config,
      ...fetchedConfig,
    }

    return {
      ...state,
      args,
      canvases,
      files,
      config,
      window: fetchedWindow,
      collab: undefined,
      mode,
      tree,
    }
  }

  private createError(data: Partial<ErrorObject>): ErrorObject {
    if (data.error instanceof ServiceError) {
      return {...data.error.errorObject, ...data}
    } else {
      return {id: 'exception', ...data}
    }
  }

  private parseRoom(room: string): [Mode, string] {
    const [m, r] = room.split('/')
    if (!r) return [Mode.Editor, m]
    return [m === 'c' ? Mode.Canvas : Mode.Editor, r]
  }
}
