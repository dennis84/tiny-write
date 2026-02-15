import type {Location, Navigator, Params} from '@solidjs/router'
import type {SetStoreFunction, Store} from 'solid-js/store'
import {DB} from '@/db'
import {isTauri} from '@/env'
import {info} from '@/remote/log'
import {isCanvas, isCodeElement, isCodeFile, isEditorElement, isFile, isThread} from '@/state'
import {
  type Canvas,
  type CanvasElement,
  type File,
  type LastLocation,
  type LocationState,
  Page,
  type State,
  type Thread,
} from '@/types'
import {open as shellOpen} from '../remote/app'

export class LocationService {
  constructor(
    private location: Location<LocationState>,
    private navigator: Navigator,
    private getParams: () => Params,
    private store: Store<State>,
    private setState: SetStoreFunction<State>,
  ) {}

  get editorId(): string | undefined {
    const params = this.getParams()
    return this.page === Page.Editor ? params.id : undefined
  }

  get codeId(): string | undefined {
    const params = this.getParams()
    return this.page === Page.Code ? params.id : undefined
  }

  get canvasId(): string | undefined {
    const params = this.getParams()
    return this.page === Page.Canvas ? params.id : undefined
  }

  get threadId(): string | undefined {
    const params = this.getParams()
    return (this.page === Page.Assistant ? params.id : undefined) ?? this.state?.threadId
  }

  get page(): Page | undefined {
    const pathname = this.location.pathname
    if (pathname.startsWith('/editor')) return Page.Editor
    if (pathname.startsWith('/code')) return Page.Code
    if (pathname.startsWith('/canvas')) return Page.Canvas
    if (pathname.startsWith('/assistant')) return Page.Assistant
    if (pathname.startsWith('/dir')) return Page.Dir
    return undefined
  }

  get pathname() {
    return this.location.pathname
  }

  get state() {
    return this.location.state
  }

  async setLastLocation(lastLocation: Partial<LastLocation> | undefined) {
    info(`Set last location (lastLocation=${JSON.stringify(lastLocation)})`)
    this.setState('lastLocation', lastLocation)
    const loc = this.store.lastLocation
    await DB.setLastLocation(loc)
  }

  updateState(locState: Partial<LocationState> | undefined) {
    const state = {...this.state, ...locState}
    this.navigator(location.pathname, {state, replace: true})
  }

  openFile(file?: File | Canvas | CanvasElement | Thread, locState?: Partial<LocationState>) {
    if (!file) return this.navigator('/')
    const state = {...this.state, ...locState}

    if (isCodeFile(file)) {
      const newFile = file.newFile
      return this.navigator(`/code/${file.id}`, {state: {...state, newFile}})
    } else if (isFile(file)) {
      const newFile = file.newFile
      return this.navigator(`/editor/${file.id}`, {state: {...state, newFile}})
    } else if (isCanvas(file)) {
      return this.navigator(`/canvas/${file.id}`, {state})
    } else if (isThread(file)) {
      return this.navigator(`/assistant/${file.id}`, {state: {...state, threadId: undefined}})
    } else if (isEditorElement(file)) {
      return this.navigator(`/editor/${file.id}`, {state})
    } else if (isCodeElement(file)) {
      return this.navigator(`/code/${file.id}`, {state})
    }
  }

  openPage(page: Page, locState?: Partial<LocationState>) {
    info(`Open page (page=${page})`)
    const state = {...this.state, ...locState}
    this.navigator(`/${page}`, {state})
  }

  openDir(path?: string[]) {
    info(`Open dir (path=${path})`)
    const state = {path}
    this.navigator('/dir', {state})
  }

  async openUrl(url: string) {
    info(`Open url (url=${url})`)

    if (isTauri()) {
      await shellOpen(url)
      return
    }

    window.open(url, '_blank')
  }
}
