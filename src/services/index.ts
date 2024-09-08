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
import {DeleteService} from './DeleteService'

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
  delete!: DeleteService
  code!: CodeService
  codeMirror!: CodeMirrorService
  prettier!: PrettierService

  constructor(store: Store<State>, setState: SetStoreFunction<State>) {
    // collab
    // ctrl (pm plugins)
    // app
    // file
    // tree
    // select
    this.editor = new EditorService(this, store, setState)

    this.collab = new CollabService(store, setState)
    this.config = new ConfigService(this.collab, store, setState)
    this.tree = new TreeService(store, setState)
    this.file = new FileService(this.collab, store, setState)
    this.select = new SelectService()
    this.prettier = new PrettierService()
    this.delete = new DeleteService(this.file, this.canvas, this.tree, store, setState)
    this.app = new AppService(this.file, this.tree, store, setState)
    this.codeMirror = new CodeMirrorService(this.config, this.app, store)
    this.code = new CodeService(this.file, this.app, this.collab, this.codeMirror, store, setState)
    this.changeSet = new ChangeSetService(this.file, this.collab, this.editor, store, setState)
    this.canvas = new CanvasService(this.file, this.select, this.tree, store, setState)
    this.canvasCollab = new CanvasCollabService(this.collab, this.canvas, store)
    this.media = new MediaService(
      this.file,
      this.canvas,
      this.canvasCollab,
      this.app,
      this.editor,
      store,
    )
  }
}

export const createCtrl = (initial: State) => {
  const [store, setState] = createStore<Store<State>>(initial)
  if (isDev) (window as any).__STORE__ = store
  const ctrl = new Ctrl(store, setState)
  return {store, ctrl}
}
