import {Store, unwrap, SetStoreFunction} from 'solid-js/store'
import * as remote from '@/remote'
import {State, ServiceError, Window} from '@/state'
import * as service from '@/service'
import {Ctrl} from '@/ctrl'

export class AppApi {
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
    this.ctrl.editor.disconnectCollab(this.store)
    await service.reset()
    window.location.reload()
  }

  setFullscreen(fullscreen: boolean) {
    remote.setFullscreen(fullscreen)
    this.setState('fullscreen', fullscreen)
    this.ctrl.editor.updateEditorState(this.store)
  }

  updateWindow(win: Partial<Window>) {
    if (this.store.fullscreen) return
    this.setState('window', {...this.store.window, ...win})
    service.saveWindow(unwrap(this.store))
  }
}
