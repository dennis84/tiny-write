import {Store, unwrap, SetStoreFunction} from 'solid-js/store'
import * as remote from '@/remote'
import {State, ServiceError, Window, File, FileText, Mode} from '@/state'
import {DB} from '@/db'
import {isTauri} from '@/env'
import {Ctrl} from '.'

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

  async init() {
    try {
      let data = await this.fetchData()
      let text: FileText | undefined
      remote.info(`Init app (mode=${data.mode}, args=${JSON.stringify(data.args)})`)

      if (isTauri() && data.window) {
        await remote.updateWindow(data.window)
      }

      let currentFile
      let currentCanvas
      if (data.mode === Mode.Editor) {
        currentFile = data.files.find((it) => it.active)
      } else {
        currentCanvas = data.canvases.find((it) => it.active)
      }

      if (data.args?.dir) { // If app was started with a directory as argument
        currentFile = undefined
      } else if (data.args?.file) { // If app was started with a file as argument
        const path = data.args.file
        currentFile = data.files.find((f) => f.path === path)
        if (currentFile?.path) {
          text = (await this.ctrl.file.loadFile(currentFile.path)).text
        } else if (!currentFile) {
          const loadedFile = await this.ctrl.file.loadFile(path)
          currentFile = this.ctrl.file.createFile(loadedFile)
          data.files.push(currentFile as File)
        }
        data = await this.ctrl.editor.activateFile(data, currentFile)
      } else if (data.args?.room) { // Join collab
        if (data.mode === Mode.Editor) {
          currentFile = data.files.find((f) => f.id === data.args?.room)
          if (currentFile?.path) {
            text = (await this.ctrl.file.loadFile(currentFile.path)).text
          } else if (!currentFile) {
            currentFile = this.ctrl.file.createFile({id: data.args.room})
            data.files.push(currentFile)
          }

          data = await this.ctrl.editor.activateFile(data, currentFile)
        } else {
          currentCanvas = data.canvases.find((c) => c.id === data.args?.room)
          if (!currentCanvas) {
            currentCanvas = this.ctrl.canvas.createCanvas({id: data.args.room})
            data.canvases.push(currentCanvas)
          }

          data = this.ctrl.canvas.activateCanvas(data, data.args.room)
        }
      } else if (currentFile?.id) { // Restore last saved file
        data = await this.ctrl.editor.activateFile(data, currentFile)
        if (currentFile?.path) {
          text = (await this.ctrl.file.loadFile(currentFile.path)).text
        }
      }

      // Init from empty state or file not found
      if (!data.args?.dir && !currentFile && !currentCanvas) {
        currentFile = this.ctrl.file.createFile({id: data.args?.room})
        data.files.push(currentFile)
        data = await this.ctrl.editor.activateFile(data, currentFile)
      }

      const mode = currentCanvas ? Mode.Canvas : Mode.Editor
      let collab
      if (mode === Mode.Editor && currentFile) {
        collab = this.ctrl.collab.create(currentFile.id, mode, !!data.args?.room)
        if (currentFile?.path) {
          text = (await this.ctrl.file.loadFile(currentFile.path)).text
        }
      } else if (mode === Mode.Canvas && currentCanvas) {
        collab = this.ctrl.collab.create(currentCanvas.id, mode, !!data.args?.room)
      }

      const newState: State = {
        ...data,
        config: {...data.config, ...this.ctrl.config.getTheme(data)},
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
    } catch (error: any) {
      remote.log('error', `Error during init: ${error.message}`)
      this.setError(error)
    }

    DB.cleanup()

    if (isTauri()) {
      await remote.show()
    }
  }

  setError(error: Error) {
    console.error(error)
    if (error instanceof ServiceError) {
      this.setState({error: error.errorObject, loading: 'initialized'})
    } else {
      this.setState({error: {id: 'exception', props: {error}}, loading: 'initialized'})
    }
  }

  async reset() {
    this.ctrl.collab.disconnectCollab()
    await DB.deleteDatabase()
  }

  setFullscreen(fullscreen: boolean) {
    remote.setFullscreen(fullscreen)
    this.setState('fullscreen', fullscreen)
  }

  updateWindow(win: Partial<Window>) {
    if (this.store.fullscreen) return
    this.setState('window', {...this.store.window, ...win})
    if (!this.store.window) return
    const updatedWindow = unwrap(this.store.window)
    DB.setWindow(updatedWindow)
    remote.info('💾 Save window state')
  }

  parseRoom(room: string): [Mode, string] {
    const [m, r] = room.split('/')
    if (!r) return [Mode.Editor, m]
    return [m === 'c' ? Mode.Canvas : Mode.Editor, r]
  }

  private async fetchData(): Promise<State> {
    const state = unwrap(this.store)
    const args = await remote.getArgs().catch(() => undefined) ?? state.args ?? {}

    const room = window.location.pathname?.slice(1).trim()
    if (room) args.room = room

    const fetchedWindow = await DB.getWindow()
    const fetchedConfig = await DB.getConfig()
    const files = await this.ctrl.file.fetchFiles() ?? []
    const canvases = await this.ctrl.canvas.fetchCanvases() ?? state.canvases ?? []
    const meta = await DB.getMeta()

    let mode = meta?.mode ?? state.mode ?? Mode.Editor
    if (args.room) {
      const [m, r] = this.parseRoom(args.room)
      mode = m
      args.room = r
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
    }
  }
}
