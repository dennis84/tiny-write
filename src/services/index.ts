import {Store, createStore, SetStoreFunction} from 'solid-js/store'
import {State} from '@/state'
import {AppService} from './AppService'
import {ChangeSetService} from './ChangeSetService'
import {ConfigService} from './ConfigService'
import {EditorService} from './EditorService'
import {FileService} from './FileService'
import {CollabService} from './CollabService'
import {CanvasService} from './CanvasService'
import {CanvasCollabService} from './CanvasCollabService'
import {MediaService} from './MediaService'
import {SelectService} from './SelectService'
import {isDev} from '@/env'
import {TreeService} from './TreeService'
import {CodeService} from './CodeService'
import {CodeMirrorService} from './CodeMirrorService'
import {PrettierService} from './PrettierService'

export class Ctrl {
  app!: AppService
  config!: ConfigService
  editor!: EditorService
  changeSet!: ChangeSetService
  file!: FileService
  collab!: CollabService
  canvas!: CanvasService
  canvasCollab!: CanvasCollabService
  media!: MediaService
  select!: SelectService
  tree!: TreeService
  code!: CodeService
  codeMirror!: CodeMirrorService
  prettier!: PrettierService

  constructor(store: Store<State>, setState: SetStoreFunction<State>) {
    this.app = new AppService(this, store, setState)
    this.config = new ConfigService(this, store, setState)
    this.editor = new EditorService(this, store, setState)
    this.changeSet = new ChangeSetService(this, store, setState)
    this.file = new FileService(this, store, setState)
    this.collab = new CollabService(this, store, setState)
    this.canvas = new CanvasService(this, store, setState)
    this.tree = new TreeService(this, store, setState)
    this.canvasCollab = new CanvasCollabService(this.collab, this.canvas, store)
    this.media = new MediaService(this, store)
    this.select = new SelectService()
    this.code = new CodeService(this, store, setState)
    this.codeMirror = new CodeMirrorService(this, store)
    this.prettier = new PrettierService()
  }
}

export const createCtrl = (initial: State) => {
  const [store, setState] = createStore<Store<State>>(initial)
  if (isDev) (window as any).__STORE__ = store
  const ctrl = new Ctrl(store, setState)
  return {store, ctrl}
}
