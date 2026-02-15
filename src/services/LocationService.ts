import type {Location, Navigator, Params} from '@solidjs/router'
import type {SetStoreFunction, Store} from 'solid-js/store'
import {DB} from '@/db'
import {info} from '@/remote/log'
import {type LastLocation, type LocationState, Page, type State} from '@/types'

export class LocationService {
  constructor(
    private location: Location<LocationState>,
    _navigator: Navigator,
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
}
