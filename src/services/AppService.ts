import type {SetStoreFunction, Store} from 'solid-js/store'
import {DB} from '@/db'
import {getArgs, setFullscreen} from '@/remote/app'
import {getDocument} from '@/remote/editor'
import {info} from '@/remote/log'
import {createConfig} from '@/state'
import type {State, Window} from '@/types'
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
    const sidebar = await DB.getSidebar()
    const tree = await DB.getTree()
    const ai = await DB.getAi()
    const lastLocation = await DB.getLastLocation()
    const threads = (await DB.getThreads())?.sort((a, b) => {
      return (b.lastModified?.getTime() ?? 0) - (a.lastModified?.getTime() ?? 0)
    })

    info(
      `Fetched data (args=${JSON.stringify(args)}, lastLocation=${JSON.stringify(lastLocation)})`,
    )

    return {
      fullscreen: false,
      args,
      canvases,
      files,
      config: fetchedConfig,
      window: fetchedWindow,
      sidebar,
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

  async getBasePath() {
    const currentFile = this.fileService.currentFile
    const filePath = currentFile?.path ?? currentFile?.newFile
    const doc = filePath ? await getDocument(filePath) : undefined

    return doc?.worktreePath ?? this.store.args?.cwd
  }

  async reset(): Promise<void> {
    info('Delete database')
    await DB.deleteDatabase()
  }

  async setFullscreen(fullscreen: boolean) {
    // Set state before changing fullscreen, otherwise resize window cannot skip
    this.setState('fullscreen', fullscreen)
    await setFullscreen(fullscreen)
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
}
