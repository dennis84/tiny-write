import {Store, createStore} from 'solid-js/store'
import {State} from '@/state'
import {isDev} from '@/env'
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
import {TreeService} from './TreeService'
import {CodeService} from './CodeService'
import {CodeMirrorService} from './CodeMirrorService'
import {PrettierService} from './PrettierService'
import {DeleteService} from './DeleteService'
import {ProseMirrorService} from './ProseMirrorService'

export const createCtrl = (initial: State) => {
  const [store, setState] = createStore<Store<State>>(initial)
  if (isDev) (window as any).__STORE__ = store

  const collabService = new CollabService(store, setState)
  const configService = new ConfigService(collabService, store, setState)
  const treeService = new TreeService(store, setState)
  const fileService = new FileService(collabService, store, setState)
  const selectService = new SelectService()
  const prettierService = new PrettierService()
  const canvasService = new CanvasService(fileService, selectService, treeService, store, setState)
  const deleteService = new DeleteService(fileService, canvasService, treeService, store, setState)
  const appService = new AppService(fileService, treeService, store, setState)
  const codeMirrorService = new CodeMirrorService(configService, appService, store)
  const proseMirrorService = new ProseMirrorService(
    configService,
    collabService,
    appService,
    codeMirrorService,
    canvasService,
  )
  const editorService = new EditorService(
    fileService,
    collabService,
    proseMirrorService,
    appService,
    treeService,
    selectService,
    store,
    setState,
  )
  const codeService = new CodeService(
    fileService,
    appService,
    collabService,
    codeMirrorService,
    store,
    setState,
  )
  const changeSetService = new ChangeSetService(
    fileService,
    collabService,
    editorService,
    store,
    setState,
  )
  const canvasCollabService = new CanvasCollabService(collabService, canvasService, store)
  const mediaService = new MediaService(
    fileService,
    canvasService,
    canvasCollabService,
    appService,
    editorService,
    store,
  )

  return {
    store,
    collabService,
    configService,
    treeService,
    fileService,
    selectService,
    prettierService,
    canvasService,
    deleteService,
    appService,
    codeMirrorService,
    proseMirrorService,
    editorService,
    codeService,
    changeSetService,
    canvasCollabService,
    mediaService,
  }
}

export type Ctrl = ReturnType<typeof createCtrl>
