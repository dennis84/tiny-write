import {createContext, useContext} from 'solid-js'
import type {EditorView} from 'prosemirror-view'
import type {EditorView as CmEditorView} from '@codemirror/view'
import type * as Y from 'yjs'
import type {WebsocketProvider} from 'y-websocket'
import type {YMultiDocUndoManager} from 'y-utility/y-multidoc-undomanager'
import type {Ctrl} from './services'
import {FileService} from './services/FileService'
import type {Model} from './services/CopilotService'
import type {CodeThemeName} from './services/ConfigService'

export type Openable = File | Canvas | CanvasElement | '/'

export interface MergeState {
  doc: string
  range?: [number, number]
}

export interface LastLocation {
  path: string
  page?: Page
  fileId?: string
  threadId?: string
  canvasId?: string
}

export interface LocationState {
  prev?: string // prev location pathname
  file?: string
  newFile?: string
  selection?: VisualPositionRange
  merge?: MergeState
}

export interface VisualPosition {
  line: number
  character: number
}

export interface VisualPositionRange {
  start: VisualPosition
  end?: VisualPosition
}

export interface SelectionRange {
  anchor: number
  head?: number
}

export interface Args {
  cwd?: string
  source?: string
  file?: string
  selection?: VisualPositionRange
  newFile?: string
  room?: string
  text?: string
  merge?: MergeState
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
  codeTheme?: CodeThemeName
  font?: string
  fontSize: number
  contentWidth: number
  alwaysOnTop: boolean
  typewriterMode: boolean
  spellcheck: boolean
  prettier: PrettierConfig
}

export interface Copilot {
  user?: string
  model?: Model
  accessToken?: string
}

export interface AiConfig {
  copilot?: Copilot
  sidebarWidth?: number
  autoContext?: boolean
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
  point: CanvasPoint
  zoom: number
}

export type CanvasPoint = [number, number]

export interface CanvasRect {
  x: number
  y: number
  width: number
  height: number
}

export interface CanvasElement {
  id: string
  type: ElementType
  selected?: boolean
}

export interface CanvasBoxElement extends CanvasElement, CanvasRect {}

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

export const isLocalFile = (it: any): it is File => isFile(it) && it.path !== undefined

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
  deleted?: boolean
  lastModified?: Date
  snapToGrid?: boolean
}

export enum Page {
  Editor = 'editor',
  Canvas = 'canvas',
  Code = 'code',
  Assistant = 'assistant',
  Dir = 'dir',
}

export interface Tree {
  collapsed: string[]
}

export type ChatRole = 'user' | 'assistant' | 'system'

export enum MessageType {
  File = 'file',
  Selection = 'selection',
}

export interface Message {
  id: string
  parentId?: string
  leftId?: string
  active?: boolean
  content: string
  role: ChatRole
  error?: string
  streaming?: boolean
  type?: MessageType
  fileId?: string
  selection?: [number, number]
  codeLang?: string
}

export interface Thread {
  id: string
  title?: string
  lastModified?: Date
  messages: Message[]
}

export interface State {
  canvases: Canvas[]
  files: File[]
  tree?: Tree
  config: Config
  error?: ErrorObject
  loading: LoadingType
  fullscreen: boolean
  menuWidth?: number
  collab?: Collab
  args?: Args
  window?: Window
  isSnapshot?: boolean
  selecting?: boolean
  moving?: boolean
  lastTr?: number
  ai?: AiConfig
  threads: Thread[]
  lastLocation?: LastLocation
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
  loading: 'loading',
  fullscreen: false,
  threads: [],
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
