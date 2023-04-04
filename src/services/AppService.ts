import {Store, unwrap, SetStoreFunction} from 'solid-js/store'
import * as remote from '@/remote'
import {State, ServiceError, Window} from '@/state'
import * as db from '@/db'
import {Ctrl} from '.'

export class AppService {
  constructor(
    private ctrl: Ctrl,
    private store: Store<State>,
    private setState: SetStoreFunction<State>,
  ) {}

  setError(error: Error) {
    console.error(error)
    if (error instanceof ServiceError) {
      this.setState({error: error.errorObject, loading: 'initialized'})
    } else {
      this.setState({error: {id: 'exception', props: {error}}, loading: 'initialized'})
    }
  }

  async reset() {
    this.ctrl.collab.disconnectCollab(this.store)
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
}
