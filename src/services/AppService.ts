import {type Store, unwrap, type SetStoreFunction, reconcile} from 'solid-js/store'
import {stateToString} from '@/utils/debug'
import {getDocument} from '@/remote/editor'
import {debug, error, info} from '@/remote/log'
import {show, updateWindow} from '@/remote/window'
import {getArgs, setAlwaysOnTop, setFullscreen} from '@/remote/app'
import {startLanguageServer} from '@/remote/copilot'
import {type State, ServiceError, type Window, type ErrorObject, createState, type LastLocation} from '@/state'
import {DB} from '@/db'
import {isTauri} from '@/env'
import {ConfigService} from './ConfigService'
import {CanvasService} from './CanvasService'
import {FileService} from './FileService'

export class AppService {
  public layoutRef: HTMLElement | undefined

  constructor(
    private fileService: FileService,
    private store: Store<State>,
    private setState: SetStoreFunction<State>,
  ) {}

  get fullscreen() {
    return this.store.fullscreen
  }

  get lastLocation() {
    return this.store.lastLocation
  }

  async init() {
    const data = await this.fetchData()
    debug(`Fetched data: ${stateToString(data)}`)
    info(
      `Init app (args=${JSON.stringify(data.args)}, lastLocationPath=${data.lastLocation?.path})`,
    )

    try {
      if (isTauri() && data.window) {
        await updateWindow(data.window)
      }

      const newState: State = {
        ...data,
        args: {...data.args},
        config: {...data.config, ...ConfigService.getThemeConfig(data)},
        loading: 'initialized',
      }

      if (isTauri() && newState.config?.alwaysOnTop) {
        await setAlwaysOnTop(true)
      }

      if (newState.ai?.copilot?.user) {
        // takes about 1.5s
        if (isTauri()) void startLanguageServer()
      }

      this.setState(newState)
    } catch (err: any) {
      const errorObject = this.createError({error: err})
      error(`Error during init: ${err.message}`)
      const data = err.data ?? {}
      this.setState({...data, error: errorObject, loading: 'initialized'})
    }

    await DB.cleanup()

    if (isTauri()) {
      await show()
    }
  }

  async getBasePath() {
    const currentFile = this.fileService.currentFile
    const filePath = currentFile?.path ?? currentFile?.newFile
    const doc = filePath ? await getDocument(filePath) : undefined

    return doc?.worktreePath ?? this.store.args?.cwd
  }

  setError(data: Partial<ErrorObject>) {
    const err = this.createError(data)
    error(`Error thrown (error=${err}})`, err)
    this.setState({error: err, loading: 'initialized'})
  }

  async reset(): Promise<void> {
    info('Delete database')
    await DB.deleteDatabase()
    this.setState(
      reconcile(createState({loading: 'initialized', args: {cwd: this.store.args?.cwd}})),
    )
  }

  async setFullscreen(fullscreen: boolean) {
    await setFullscreen(fullscreen)
    this.setState('fullscreen', fullscreen)
  }

  async setLastLocation(lastLocation: Partial<LastLocation>) {
    info(`Save last location (path=${lastLocation.path}, page=${lastLocation.page})`)
    this.setState('lastLocation', lastLocation)
    const loc = this.store.lastLocation
    if (loc) await DB.setLastLocation(unwrap(loc))
  }

  async updateWindow(win: Partial<Window>) {
    if (this.store.fullscreen) return
    this.setState('window', {...this.store.window, ...win})
    if (!this.store.window) return
    const updatedWindow = unwrap(this.store.window)
    await DB.setWindow(updatedWindow)
    info(`Saved window state (window=${JSON.stringify(window)})`)
  }

  setSelecting(selecting: boolean) {
    this.setState('selecting', selecting)
  }

  private async fetchData(): Promise<State> {
    const state = unwrap(this.store)
    const args = (await getArgs().catch(() => undefined)) ?? state.args ?? {}

    const fetchedWindow = await DB.getWindow()
    const fetchedConfig = await DB.getConfig()
    const files = (await FileService.fetchFiles()) ?? state.files ?? []
    const canvases = (await CanvasService.fetchCanvases()) ?? state.canvases ?? []
    const menuWidth = (await DB.getMenuWidth()) ?? state.menuWidth
    const tree = await DB.getTree()
    const ai = await DB.getAi()
    const lastLocation = (await DB.getLastLocation()) ?? state.lastLocation
    const threads = (await DB.getThreads())?.sort((a, b) => {
      return (b.lastModified?.getTime() ?? 0) - (a.lastModified?.getTime() ?? 0)
    })

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
      menuWidth,
      tree,
      ai,
      threads,
      lastLocation,
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
