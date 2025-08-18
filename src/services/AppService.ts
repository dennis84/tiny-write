import type {SetStoreFunction, Store} from 'solid-js/store'
import {DB} from '@/db'
import {getArgs, setFullscreen} from '@/remote/app'
import {getDocument} from '@/remote/editor'
import {error, info} from '@/remote/log'
import {
  createConfig,
  type ErrorObject,
  type LastLocation,
  ServiceError,
  type State,
  type Window,
} from '@/state'
import {CanvasService} from './CanvasService'
import {FileService} from './FileService'

export class AppService {
  public layoutRef: HTMLElement | undefined

  static async fetchData(): Promise<State> {
    const args = (await getArgs().catch(() => undefined)) ?? {}

    const fetchedWindow = await DB.getWindow()
    const fetchedConfig = (await DB.getConfig()) ?? createConfig()
    const files = (await FileService.fetchFiles()) ?? []
    const canvases = (await CanvasService.fetchCanvases()) ?? []
    const menuWidth = await DB.getMenuWidth()
    const tree = await DB.getTree()
    const ai = await DB.getAi()
    const lastLocation = await DB.getLastLocation()
    const threads = (await DB.getThreads())?.sort((a, b) => {
      return (b.lastModified?.getTime() ?? 0) - (a.lastModified?.getTime() ?? 0)
    })

    return {
      fullscreen: false,
      args,
      canvases,
      files,
      config: fetchedConfig,
      window: fetchedWindow,
      collab: undefined,
      menuWidth,
      tree,
      ai,
      threads,
      lastLocation,
    }
  }

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

  async getBasePath() {
    const currentFile = this.fileService.currentFile
    const filePath = currentFile?.path ?? currentFile?.newFile
    const doc = filePath ? await getDocument(filePath) : undefined

    return doc?.worktreePath ?? this.store.args?.cwd
  }

  setError(data: Partial<ErrorObject>) {
    const err = this.createError(data)
    error(`Error thrown (error=${err}})`, err)
    this.setState('error', err)
  }

  async reset(): Promise<void> {
    info('Delete database')
    await DB.deleteDatabase()
  }

  async setFullscreen(fullscreen: boolean) {
    await setFullscreen(fullscreen)
    this.setState('fullscreen', fullscreen)
  }

  async setLastLocation(lastLocation: Partial<LastLocation>) {
    info(`Save last location (path=${lastLocation.path}, page=${lastLocation.page})`)
    this.setState('lastLocation', lastLocation)
    const loc = this.store.lastLocation
    if (loc) await DB.setLastLocation(loc)
  }

  async updateWindow(win: Partial<Window>) {
    if (this.store.fullscreen) return
    this.setState('window', {...this.store.window, ...win})
    if (!this.store.window) return
    await DB.setWindow(this.store.window)
  }

  setSelecting(selecting: boolean) {
    this.setState('selecting', selecting)
  }

  private createError(data: Partial<ErrorObject>): ErrorObject {
    if (data.error instanceof ServiceError) {
      return {...data.error.errorObject, ...data}
    } else {
      return {id: 'exception', ...data}
    }
  }
}
