import {createStore, type Store} from 'solid-js/store'
import {isDev} from '@/env'
import type {State} from '@/state'
import {AiService} from './AiService'
import {AppService} from './AppService'
import {CanvasCollabService} from './CanvasCollabService'
import {CanvasService} from './CanvasService'
import {ChangeSetService} from './ChangeSetService'
import {CodeMirrorService} from './CodeMirrorService'
import {CodeService} from './CodeService'
import {CollabService} from './CollabService'
import {ConfigService} from './ConfigService'
import {CopilotService} from './CopilotService'
import {DeleteService} from './DeleteService'
import {EditorService} from './EditorService'
import {FileService} from './FileService'
import {InputLineService} from './InputLineService'
import {MediaService} from './MediaService'
import {MenuService} from './MenuService'
import {PrettierService} from './PrettierService'
import {ProseMirrorService} from './ProseMirrorService'
import {SelectService} from './SelectService'
import {ThreadService} from './ThreadService'
import {ToastService} from './ToastService'
import {TreeService} from './TreeService'

export const createCtrl = (initial: State) => {
  const [store, setState] = createStore<Store<State>>(initial)
  if (isDev) (window as any).__STORE__ = store

  const toastService = new ToastService()
  const aiService = new AiService(store, setState)
  const copilotService = new CopilotService(store, setState)
  const collabService = new CollabService(store, setState)
  const configService = new ConfigService(collabService, store, setState)
  const fileService = new FileService(collabService, store, setState)
  const selectService = new SelectService()
  const prettierService = new PrettierService()
  const canvasService = new CanvasService(fileService, selectService, store, setState)
  const treeService = new TreeService(store, setState, fileService, canvasService)
  const deleteService = new DeleteService(fileService, canvasService, treeService, store, setState)
  const appService = new AppService(fileService, store, setState)
  const codeMirrorService = new CodeMirrorService(
    configService,
    appService,
    prettierService,
    toastService,
    store,
  )
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
    selectService,
    store,
    setState,
  )
  const codeService = new CodeService(
    fileService,
    appService,
    configService,
    collabService,
    codeMirrorService,
    prettierService,
    store,
    setState,
  )
  const changeSetService = new ChangeSetService(fileService, collabService, editorService, setState)
  const canvasCollabService = new CanvasCollabService(collabService, canvasService, store)
  const mediaService = new MediaService(
    fileService,
    canvasService,
    canvasCollabService,
    appService,
    store,
  )

  const threadService = new ThreadService(store, setState, copilotService, fileService)
  const menuService = new MenuService(store, setState, appService)
  const inputLineService = new InputLineService()

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
    aiService,
    copilotService,
    threadService,
    menuService,
    toastService,
    inputLineService,
  }
}

export type Ctrl = ReturnType<typeof createCtrl>
