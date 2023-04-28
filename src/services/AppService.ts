import {Store, unwrap, SetStoreFunction} from 'solid-js/store'
import * as remote from '@/remote'
import {State, ServiceError, Window, File, FileText} from '@/state'
import * as db from '@/db'
import {isTauri} from '@/env'
import {Ctrl} from '.'

export class AppService {
  constructor(
    private ctrl: Ctrl,
    private store: Store<State>,
    private setState: SetStoreFunction<State>,
  ) {}

  get fullscreen() {
    return this.store.fullscreen
  }

  async init(node: Element) {
    try {
      let data = await this.fetchData()
      let text: FileText | undefined

      if (isTauri && data.window) {
        await remote.updateWindow(data.window)
      }

      let currentFile = data.files.find((f) => f.active)

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
        currentFile = data.files.find((f) => f.id === data.args?.room)
        if (currentFile?.path) {
          text = (await this.ctrl.file.loadFile(currentFile.path)).text
        } else if (!currentFile) {
          currentFile = this.ctrl.file.createFile({id: data.args.room})
          data.files.push(currentFile as File)
        }
        data = await this.ctrl.editor.activateFile(data, currentFile)
      } else if (currentFile?.id) { // Restore last saved file
        data = await this.ctrl.editor.activateFile(data, currentFile)
        if (currentFile?.path) {
          text = (await this.ctrl.file.loadFile(currentFile.path)).text
        }
      }

      // Init from empty state or file not found
      if (!data.args?.dir && !currentFile) {
        currentFile = this.ctrl.file.createFile({id: data.args?.room})
        data.files.push(currentFile)
        data = await this.ctrl.editor.activateFile(data, currentFile)
      }

      let collab
      if (currentFile) {
        collab = this.ctrl.collab.createByFile(currentFile, data.args?.room !== undefined)
        if (currentFile?.path) {
          text = (await this.ctrl.file.loadFile(currentFile.path)).text
        }
      }

      const newState: State = {
        ...data,
        config: {...data.config, ...this.ctrl.config.getTheme(data)},
        loading: 'initialized',
        collab,
      }

      if (isTauri && newState.config?.alwaysOnTop) {
        await remote.setAlwaysOnTop(true)
      }

      this.setState(newState)
      this.ctrl.editor.renderEditor(node)
      this.ctrl.editor.updateText(text)
    } catch (error: any) {
      remote.log('error', `Error during init: ${error.message}`)
      this.setError(error)
    }

    if (isTauri) {
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
    await db.deleteDatabase()
    window.location.reload()
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
    db.setWindow(updatedWindow)
    db.setSize('window', JSON.stringify(updatedWindow).length)
    remote.log('info', '💾 Save window state')
  }

  private async fetchData(): Promise<State> {
    const state = unwrap(this.store)
    let args = await remote.getArgs().catch(() => undefined)

    if (!isTauri) {
      const room = window.location.pathname?.slice(1).trim()
      if (room) args = {room}
    }

    const fetchedWindow = await db.getWindow()
    const fetchedConfig = await db.getConfig()
    const fetchedSize = await db.getSize()
    const files = await this.ctrl.file.fetchFiles()

    const config = {
      ...state.config,
      ...fetchedConfig,
    }

    return {
      ...state,
      args: args ?? state.args,
      files,
      config,
      window: fetchedWindow,
      storageSize: fetchedSize ?? 0,
      collab: undefined,
    }
  }
}
