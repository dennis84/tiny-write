import type {EditorView as CmEditorView} from '@codemirror/view'
import type {EditorView} from 'prosemirror-view'
import * as v from 'valibot'
import type {Model} from './services/CopilotService'

type OpenThread = {threadId: string}

export type Openable = File | Canvas | CanvasElement | OpenThread | '/'

export interface MergeState {
  doc: string
  range?: [number, number]
}

export interface LocationState {
  page?: Page // /:page/*
  editorId?: string // /editor/:id
  canvasId?: string // /canvas/:id
  codeId?: string // /code/:id
  threadId?: string // /assistant/:id or active thread in sidebar
  prev?: string // prev location pathname
  file?: string // is this required???
  newFile?: string // save as to this path
  selection?: VisualPositionRange // forgotten
  merge?: MergeState // e.g. open file with merge params from assistant
  share?: boolean // turn collab mode on
  activeFileId?: string // An active file on canvas page
  snapshot?: number // Snapshot version number (index in of file version)
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
  newFile?: string
  room?: string
  text?: string
}

const PrettierSchema = v.object({
  printWidth: v.fallback(v.number(), 80),
  tabWidth: v.fallback(v.number(), 2),
  useTabs: v.fallback(v.boolean(), false),
  semi: v.fallback(v.boolean(), false),
  singleQuote: v.fallback(v.boolean(), true),
  bracketSpacing: v.fallback(v.boolean(), false),
})

export type PrettierConfig = v.InferInput<typeof PrettierSchema>

const ThemeSchema = v.object({
  // current theme
  main: v.optional(v.string()),
  code: v.optional(v.string()),
  // last configured themes by dark mode
  mainDark: v.optional(v.string()),
  mainLight: v.optional(v.string()),
  codeDark: v.optional(v.string()),
  codeLight: v.optional(v.string()),
})

export type ThemeConfig = v.InferInput<typeof ThemeSchema>

export const ConfigSchema = v.object({
  theme: v.fallback(ThemeSchema, {}),
  font: v.optional(v.string()),
  fontSize: v.fallback(v.number(), 14),
  contentWidth: v.fallback(v.number(), 600),
  alwaysOnTop: v.fallback(v.boolean(), false),
  typewriterMode: v.fallback(v.boolean(), false),
  spellcheck: v.fallback(v.boolean(), true),
  prettier: PrettierSchema,
})

export type Config = v.InferInput<typeof ConfigSchema>

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

export interface Version {
  ydoc: Uint8Array
  date: Date
}

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

export enum AttachmentType {
  Text = 'text',
  File = 'file',
  Selection = 'selection',
  Image = 'image',
}

export interface Attachment {
  type: AttachmentType
  name?: string
  content: string
  fileId?: string
  selection?: [number, number]
  codeLang?: string
}

export type ChatRole = 'user' | 'assistant' | 'system'

export interface Message {
  id: string
  parentId?: string
  leftId?: string
  content: string
  attachments?: Attachment[]
  role: ChatRole
  interrupted?: boolean
  summary?: string
}

export interface Thread {
  id: string
  title?: string
  lastModified?: Date
  messages: Message[]
  path?: Map<string | undefined, string>
  pinned?: boolean
}

export interface State {
  canvases: Canvas[]
  files: File[]
  tree?: Tree
  config: Config
  fullscreen: boolean
  menuWidth?: number
  args?: Args
  window?: Window
  isSnapshot?: boolean
  selecting?: boolean
  moving?: boolean
  lastTr?: number
  ai?: AiConfig
  threads: Thread[]
  location?: LocationState
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
