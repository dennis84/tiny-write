import {Store, createStore, SetStoreFunction} from 'solid-js/store'
import {State} from '@/state'
import {AppService} from './AppService'
import {KeymapService} from './KeymapService'
import {ChangeSetService} from './ChangeSetService'
import {ConfigService} from './ConfigService'
import {EditorService} from './EditorService'
import {FileService} from './FileService'
import {CollabService} from './CollabService'

export class Ctrl {
  app!: AppService
  config!: ConfigService
  editor!: EditorService
  changeSet!: ChangeSetService
  keymap!: KeymapService
  file!: FileService
  collab!: CollabService

  constructor(
    store: Store<State>,
    setState: SetStoreFunction<State>,
  ) {
    this.app = new AppService(this, store, setState)
    this.config = new ConfigService(store, setState)
    this.editor = new EditorService(this, store, setState)
    this.changeSet = new ChangeSetService(this, store, setState)
    this.keymap = new KeymapService(this, store)
    this.file = new FileService(store)
    this.collab = new CollabService(store, setState)
  }
}

export const createCtrl = (initial: State) => {
  const [store, setState] = createStore<Store<State>>(initial)
  const ctrl = new Ctrl(store, setState)
  return {store, ctrl}
}
