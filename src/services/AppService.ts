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

  async init() {
    let data = await this.fetchData()
    remote.debug(`Fetched data: ${stateToString(data)}`)

    try {
      let text: FileText | undefined
      remote.info(`Init app (mode=${data.mode}, args=${JSON.stringify(data.args)})`)

      if (isTauri() && data.window) {
        await remote.updateWindow(data.window)
      }

      let currentFile
      let currentCanvas

      // Get last active editor or canvas
      if (data.mode === Mode.Editor) {
        currentFile = data.files.find((it) => it.active)
      } else {
        currentCanvas = data.canvases.find((it) => it.active)
      }

      // Handle args:
      // List files instead show editor if app was started with
      // a directory argument.
      if (data.args?.dir) {
        currentFile = undefined
      }
      // If app was started with a file as argument
      else if (data.args?.file) {
        const path = data.args.file
        currentFile = data.files.find((f) => f.path === path)
        if (!currentFile) {
          currentFile = this.ctrl.file.createFile({path})
          data.files.push(currentFile as File)
        }
      }
      // If source was passed but file not found
      else if (data.args?.newFile) {
        currentFile = this.ctrl.file.createFile({newFile: data.args.newFile})
        data.files.push(currentFile as File)
      }
      // Join collab if room was passed
      else if (data.args?.room) {
        if (data.mode === Mode.Editor) {
          currentFile = data.files.find((f) => f.id === data.args?.room)
          if (!currentFile) {
            currentFile = this.ctrl.file.createFile({id: data.args.room})
            data.files.push(currentFile)
          }
        } else {
          currentCanvas = data.canvases.find((c) => c.id === data.args?.room)
          if (!currentCanvas) {
            currentCanvas = this.ctrl.canvas.createCanvas({id: data.args.room})
            data.canvases.push(currentCanvas)
          }
        }
      }

      // Create new file if no current file or canvas
      if (!data.args?.dir && !currentFile && !currentCanvas) {
        currentFile = this.ctrl.file.createFile({id: data.args?.room})
        data.files.push(currentFile)
      }

      // Init ydoc and load text
      const mode = currentCanvas ? Mode.Canvas : Mode.Editor
      let collab
      if (mode === Mode.Editor && currentFile) {
        collab = this.ctrl.collab.create(currentFile.id, mode, !!data.args?.room)
        if (currentFile?.path) {
          try {
            text = (await this.ctrl.file.loadFile(currentFile.path)).text
          } catch (e) {
            remote.info(`Could not load current file with path, not found (path=${currentFile.path})`)
            currentFile.newFile = currentFile.path
            currentFile.path = undefined
          }
        }
        data = await EditorService.activateFile(data, currentFile)
      } else if (mode === Mode.Canvas && currentCanvas) {
        data = CanvasService.activateCanvas(data, currentCanvas.id)
        collab = this.ctrl.collab.create(currentCanvas.id, mode, !!data.args?.room)
      }

      const newState: State = {
        ...data,
        config: {...data.config, ...ConfigService.getThemeConfig(data)},
        loading: 'initialized',
        collab,
        mode,
      }

      if (isTauri() && newState.config?.alwaysOnTop) {
        await remote.setAlwaysOnTop(true)
      }

      this.setState(newState)
      if (mode === Mode.Editor) {
        this.ctrl.editor.updateText(text)
      } else {
        this.ctrl.canvasCollab.init()
      }

      this.ctrl.tree.create()
    } catch (e: any) {
      remote.error(`Error during init: ${e.message}`, e)
      const error = this.createError(e)
      this.setState({...data, error, loading: 'initialized'})
    }

    await DB.cleanup()

    if (isTauri()) {
      await remote.show()
    }
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

  parseRoom(room: string): [Mode, string] {
    const [m, r] = room.split('/')
    if (!r) return [Mode.Editor, m]
    return [m === 'c' ? Mode.Canvas : Mode.Editor, r]
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
}
