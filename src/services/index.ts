import {useLocation, useNavigate, useParams} from '@solidjs/router'
import {createStore, type Store} from 'solid-js/store'
import {isDev} from '@/env'
import type {LocationState, State} from '@/types'
import {AiService} from './AiService'
import {AppService} from './AppService'
import {CanvasCollabService} from './CanvasCollabService'
import {CanvasService} from './CanvasService'
import {CanvasThreadService} from './CanvasThreadService'
import {ChangeSetService} from './ChangeSetService'
import {CodeMirrorService} from './CodeMirrorService'
import {CodeService} from './CodeService'
import {CollabService} from './CollabService'
import {ConfigService} from './ConfigService'
import {CopilotService} from './CopilotService'
import {DeleteService} from './DeleteService'
import {DialogService} from './DialogService'
import {EditorService} from './EditorService'
import {FileService} from './FileService'
import {LocationService} from './LocationService'
import {MediaService} from './MediaService'
import {MenuService} from './MenuService'
import {PrettierService} from './PrettierService'
import {ProseMirrorService} from './ProseMirrorService'
import {SelectService} from './SelectService'
import {ThreadService} from './ThreadService'
import {TreeService} from './TreeService'

export const createCtrl = (initial: State) => {
  const [store, setState] = createStore<Store<State>>(initial)
  const location = useLocation<LocationState>()
  const navigate = useNavigate()
  const params = useParams()

  if (isDev) (window as any).__STORE__ = store

  const locationService = new LocationService(location, navigate, () => params, store, setState)

  const dialogService = new DialogService()
  const aiService = new AiService(store, setState)
  const collabService = new CollabService(dialogService, locationService, store, setState)
  const configService = new ConfigService(collabService, store, setState)
  const fileService = new FileService(collabService, locationService)
  const copilotService = new CopilotService(store, setState, fileService)
  const selectService = new SelectService()
  const prettierService = new PrettierService()
  const appService = new AppService(fileService, store, setState)
  const canvasService = new CanvasService(
    fileService,
    selectService,
    collabService,
    locationService,
  )
  const treeService = new TreeService(store, setState, fileService, canvasService)
  const deleteService = new DeleteService(fileService, canvasService, treeService)
  const codeMirrorService = new CodeMirrorService(
    configService,
    appService,
    prettierService,
    dialogService,
    locationService,
    store,
  )
  const proseMirrorService = new ProseMirrorService(
    configService,
    collabService,
    appService,
    codeMirrorService,
    canvasService,
    locationService,
  )
  const editorService = new EditorService(
    fileService,
    collabService,
    proseMirrorService,
    dialogService,
    selectService,
    locationService,
    setState,
  )
  const codeService = new CodeService(
    fileService,
    collabService,
    codeMirrorService,
    prettierService,
    locationService,
    store,
    setState,
  )
  const changeSetService = new ChangeSetService(fileService, collabService)
  const canvasCollabService = new CanvasCollabService(collabService, canvasService)
  const canvasThreadService = new CanvasThreadService(canvasService, fileService)
  const mediaService = new MediaService(
    fileService,
    canvasService,
    canvasCollabService,
    appService,
    locationService,
  )

  const threadService = new ThreadService(copilotService, locationService, dialogService)
  const menuService = new MenuService(store, setState)

  return {
    store,
    collabService,
    configService,
    treeService,
    fileService,
    selectService,
    prettierService,
    deleteService,
    appService,
    codeMirrorService,
    proseMirrorService,
    editorService,
    codeService,
    changeSetService,
    canvasService,
    canvasCollabService,
    canvasThreadService,
    mediaService,
    aiService,
    copilotService,
    threadService,
    menuService,
    dialogService,
    locationService,
  }
}

export type Ctrl = ReturnType<typeof createCtrl>
