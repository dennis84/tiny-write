import {createContext, useContext} from 'solid-js'
import {EditorView} from 'prosemirror-view'
import {EditorView as CmEditorView} from '@codemirror/view'
import * as Y from 'yjs'
import {WebsocketProvider} from 'y-websocket'
import {YMultiDocUndoManager} from 'y-utility/y-multidoc-undomanager'
import {Ctrl} from './services'
import {FileService} from './services/FileService'

export type Openable = File | Canvas | CanvasElement

export interface LocationState {
  prev?: string // prev location pathname
  file?: string
  newFile?: string
}

export interface Args {
  cwd?: string
  source?: string
  file?: string
  newFile?: string
  room?: string
  text?: string
}

export interface PrettierConfig {
  printWidth: number
  tabWidth: number
  useTabs: boolean
  semi: boolean
  singleQuote: boolean
  bracketSpacing: boolean
}

export interface Config {
  theme?: string
  codeTheme?: string
  font?: string
  fontSize: number
  contentWidth: number
  alwaysOnTop: boolean
  typewriterMode: boolean
  spellcheck: boolean
  prettier: PrettierConfig
}

export interface ErrorObject {
  id: string
  fileId?: string
  error?: Error | string
}

export interface Version {
  ydoc: Uint8Array
  date: Date
}

export interface Collab {
  id: string
  started: boolean
  provider: WebsocketProvider
  providers: Record<string, WebsocketProvider>
  undoManager: YMultiDocUndoManager
  permanentUserData: Y.PermanentUserData
  ydoc: Y.Doc
  snapshot?: Y.Doc
  error?: boolean
}

export type LoadingType = 'loading' | 'initialized'

export interface Window {
  width: number
  height: number
  x: number
  y: number
}

export enum ElementType {
  Editor = 'editor',
  Code = 'code',
  Link = 'link',
  Image = 'image',
  Video = 'video',
}

export enum EdgeType {
  Top = 'top',
  Right = 'right',
  Bottom = 'bottom',
  Left = 'left',
}

export enum CornerType {
  TopLeft = 'top_left',
  TopRight = 'top_right',
  BottomLeft = 'bottom_left',
  BottomRight = 'bottom_right',
}

export interface Camera {
  point: [number, number]
  zoom: number
}

export interface CanvasElement {
  id: string
  type: ElementType
  selected?: boolean
}

export interface CanvasBoxElement extends CanvasElement {
  x: number
  y: number
  width: number
  height: number
}

export interface CanvasEditorElement extends CanvasBoxElement {
  active?: boolean
}

export interface CanvasCodeElement extends CanvasBoxElement {
  active?: boolean
}

export interface CanvasLinkElement extends CanvasElement {
  from: string
  fromEdge: EdgeType
  to?: string
  toEdge?: EdgeType
  toX?: number
  toY?: number
  drawing?: boolean
}

export interface CanvasImageElement extends CanvasBoxElement {
  src: string
}

export interface CanvasVideoElement extends CanvasBoxElement {
  src: string
  mime: string
}

export const isBoxElement = (el?: CanvasElement): el is CanvasBoxElement =>
  el?.type === ElementType.Editor ||
  el?.type === ElementType.Code ||
  el?.type === ElementType.Image ||
  el?.type === ElementType.Video

export const isEditorElement = (el?: CanvasElement): el is CanvasEditorElement =>
  el?.type === ElementType.Editor

export const isCodeElement = (el?: CanvasElement): el is CanvasCodeElement =>
  el?.type === ElementType.Code

export const isLinkElement = (el?: CanvasElement): el is CanvasLinkElement =>
  el?.type === ElementType.Link

export const isImageElement = (el?: CanvasElement): el is CanvasImageElement =>
  el?.type === ElementType.Image

export const isVideoElement = (el?: CanvasElement): el is CanvasVideoElement =>
  el?.type === ElementType.Video

export const isFile = (it: any): it is File => it?.ydoc !== undefined

export const isCodeFile = (it: any): it is File => {
  if (it.code) return true
  const codeLang = FileService.getCodeLang(it)
  return codeLang !== undefined && codeLang !== 'markdown'
}

export const isCanvas = (it: any): it is Canvas => it?.camera

export interface Canvas {
  id: string
  parentId?: string
  leftId?: string
  title?: string
  camera: Camera
  elements: CanvasElement[]
  active?: boolean
  deleted?: boolean
  lastModified?: Date
  snapToGrid?: boolean
}

export enum Mode {
  Editor = 'editor',
  Canvas = 'canvas',
  Code = 'code',
}

export interface Tree {
  collapsed: string[]
}

export interface State {
  canvases: Canvas[]
  files: File[]
  tree?: Tree
  mode: Mode
  config: Config
  error?: ErrorObject
  loading: LoadingType
  fullscreen: boolean
  collab?: Collab
  args?: Args
  window?: Window
  isSnapshot?: boolean
  selecting?: boolean
  moving?: boolean
  lastTr?: number
}

export type FileText = Record<string, any>

export interface File {
  id: string
  parentId?: string
  leftId?: string
  title?: string
  ydoc: Uint8Array
  versions: Version[]
  lastModified?: Date
  path?: string
  newFile?: string
  code?: boolean
  codeLang?: string
  active?: boolean
  deleted?: boolean
  editorView?: EditorView
  codeEditorView?: CmEditorView
}

export class ServiceError extends Error {
  public errorObject: ErrorObject
  constructor(id: string, error: Error | string, fileId?: undefined) {
    super(typeof error === 'string' ? error : error.message)
    this.errorObject = {id, error, fileId}
  }
}

export const StateContext = createContext<Ctrl>({} as Ctrl)

export const useState = () => useContext(StateContext)

export const createState = (props: Partial<State> = {}): State => ({
  files: [],
  canvases: [],
  mode: Mode.Editor,
  loading: 'loading',
  fullscreen: false,
  config: {
    fontSize: 14,
    contentWidth: 600,
    alwaysOnTop: false,
    typewriterMode: false,
    spellcheck: true,
    prettier: {
      printWidth: 80,
      tabWidth: 2,
      useTabs: false,
      semi: false,
      singleQuote: true,
      bracketSpacing: false,
    },
  },
  ...props,
})
