import {Store, createStore, SetStoreFunction} from 'solid-js/store'
import {State} from '@/state'
import {AppApi} from './app'
import {Keymap} from './keymap'
import {ChangeSetApi} from './change-set'
import {ConfigApi} from './config'
import {EditorApi} from './editor'

export class Ctrl {
  app!: AppApi
  config!: ConfigApi
  editor!: EditorApi
  changeSet!: ChangeSetApi
  keymap!: Keymap

  constructor(
    store: Store<State>,
    setState: SetStoreFunction<State>,
  ) {
    this.app = new AppApi(this, store, setState)
    this.config = new ConfigApi(this, store, setState)
    this.editor = new EditorApi(this, store, setState)
    this.changeSet = new ChangeSetApi(store, setState)
    this.keymap = new Keymap(this, store)
  }
}

export const createCtrl = (initial: State) => {
  const [store, setState] = createStore<Store<State>>(initial)
  const ctrl = new Ctrl(store, setState)
  return {store, ctrl}
}
