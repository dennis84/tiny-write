import {Store, unwrap, SetStoreFunction, reconcile} from 'solid-js/store'
import {createSignal} from 'solid-js'
import {stateToString} from '@/utils/debug'
import {timeout} from '@/utils/promise'
import * as remote from '@/remote'
import {State, ServiceError, Window, Mode, ErrorObject, createState} from '@/state'
import {DB} from '@/db'
import {isTauri} from '@/env'
import {InputLineConfig} from '@/components/dialog/InputLine'
import {ConfigService} from './ConfigService'
import {CanvasService} from './CanvasService'
import {FileService} from './FileService'
import {TreeService} from './TreeService'

export class AppService {
  public layoutRef: HTMLElement | undefined

  public inputLine = createSignal<InputLineConfig>()

  constructor(
    private fileService: FileService,
    private treeService: TreeService,
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
    const data = await this.fetchData()
    remote.debug(`Fetched data: ${stateToString(data)}`)
    remote.info(`Init app (mode=${data.mode}, args=${JSON.stringify(data.args)})`)

    try {
      if (isTauri() && data.window) {
        await remote.updateWindow(data.window)
      }

      const newState: State = {
        ...data,
        args: {...data.args},
        config: {...data.config, ...ConfigService.getThemeConfig(data)},
        loading: 'initialized',
      }

      if (isTauri() && newState.config?.alwaysOnTop) {
        await remote.setAlwaysOnTop(true)
      }

      if (isTauri() && newState.ai?.copilot?.enabled) {
        await Promise.race([remote.enableCopilot(), timeout(2000)])
        const status = await Promise.race([remote.copilotStatus(), timeout(2000)]) as any
        newState.ai.copilot.user = status.user
      }

      this.setState(newState)

      this.treeService.create()
    } catch (error: any) {
      const errorObject = this.createError({error})
      remote.error(`Error during init: ${error.message}`)
      const data = error.data ?? {}
      this.setState({...data, error: errorObject, loading: 'initialized'})
    }

    await DB.cleanup()

    if (isTauri()) {
      await remote.show()
    }
  }

  async getBasePath() {
    const currentFile = this.fileService.currentFile
    const filePath = currentFile?.path ?? currentFile?.newFile
    const basePath = filePath ? await remote.dirname(filePath) : undefined

    return basePath ?? this.store.args?.cwd
  }

  setError(data: Partial<ErrorObject>) {
    const error = this.createError(data)
    remote.error(`Error thrown (error=${error}})`, error)
    this.setState({error, loading: 'initialized'})
  }

  setInputLine(inputLine: InputLineConfig) {
    this.inputLine[1](inputLine)
  }

  async reset(): Promise<void> {
    remote.info('Delete database')
    await DB.deleteDatabase()
    this.setState(
      reconcile(createState({loading: 'initialized', args: {cwd: this.store.args?.cwd}})),
    )
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
    const args = (await remote.getArgs().catch(() => undefined)) ?? state.args ?? {}

    const fetchedWindow = await DB.getWindow()
    const fetchedConfig = await DB.getConfig()
    const files = (await FileService.fetchFiles()) ?? state.files ?? []
    const canvases = (await CanvasService.fetchCanvases()) ?? state.canvases ?? []
    const meta = await DB.getMeta()
    const tree = await DB.getTree()
    const ai = await DB.getAi()

    let mode = meta?.mode ?? state.mode ?? Mode.Editor

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
      ai,
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
