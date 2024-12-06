import {Store, unwrap, SetStoreFunction, reconcile} from 'solid-js/store'
import {createSignal} from 'solid-js'
import {stateToString} from '@/utils/debug'
import {timeout} from '@/utils/promise'
import {getDocument} from '@/remote/editor'
import {debug, error, info} from '@/remote/log'
import {show, updateWindow} from '@/remote/window'
import {getArgs, setAlwaysOnTop, setFullscreen} from '@/remote/app'
import {copilotStatus, enableCopilot} from '@/remote/copilot'
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
    debug(`Fetched data: ${stateToString(data)}`)
    info(`Init app (mode=${data.mode}, args=${JSON.stringify(data.args)})`)

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

      if (isTauri() && newState.ai?.copilot?.enabled) {
        await Promise.race([enableCopilot(), timeout(2000)])
        const status = (await Promise.race([copilotStatus(), timeout(2000)])) as any
        newState.ai.copilot.user = status.user
      }

      this.setState(newState)

      this.treeService.create()
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

  setInputLine(inputLine: InputLineConfig) {
    this.inputLine[1](inputLine)
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

  async updateWindow(win: Partial<Window>) {
    if (this.store.fullscreen) return
    this.setState('window', {...this.store.window, ...win})
    if (!this.store.window) return
    const updatedWindow = unwrap(this.store.window)
    await DB.setWindow(updatedWindow)
    info('Saved window state')
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
