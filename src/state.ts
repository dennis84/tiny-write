import {createContext, useContext} from 'solid-js'
import {Store} from 'solid-js/store'
import {EditorView} from 'prosemirror-view'
import * as Y from 'yjs'
import {WebsocketProvider} from 'y-websocket'
import {Ctrl} from '@/services'

export interface Args {
  cwd?: string;
  file?: string;
  dir?: string[];
  room?: string;
  text?: string;
}

export interface PrettierConfig {
  printWidth: number;
  tabWidth: number;
  useTabs: boolean;
  semi: boolean;
  singleQuote: boolean;
}

export interface Config {
  theme?: string;
  codeTheme?: string;
  font?: string;
  fontSize: number;
  contentWidth: number;
  alwaysOnTop: boolean;
  typewriterMode: boolean;
  spellcheck: boolean;
  prettier: PrettierConfig;
}

export interface ErrorObject {
  id: string;
  props?: unknown;
}

export interface Version {
  snapshot: Uint8Array;
  date: number;
  clientID: number;
}

export interface Collab {
  started?: boolean;
  provider?: WebsocketProvider;
  permanentUserData?: Y.PermanentUserData;
  ydoc?: Y.Doc;
}

export type LoadingType = 'loading' | 'initialized'

export interface Window {
  width: number;
  height: number;
  x: number;
  y: number;
}

export enum ElementType {
  Editor,
  Link,
}

export enum EdgeType {
  Top,
  Right,
  Bottom,
  Left,
}

export enum CornerType {
  TopLeft,
  TopRight,
  BottomLeft,
  BottomRight,
}

export interface Camera {
  point: [number, number];
  zoom: number;
}

export interface CanvasElement {
  id: string;
  type: ElementType;
  selected?: boolean;
}

export interface CanvasEditorElement extends CanvasElement {
  x: number;
  y: number;
  width: number;
  height: number;
  editorView?: EditorView;
  active?: boolean;
}

export interface CanvasLinkElement extends CanvasElement {
  from: string;
  fromEdge: EdgeType;
  to?: string;
  toEdge?: EdgeType;
  toX?: number;
  toY?: number;
}

export interface Canvas {
  id: string;
  camera: Camera;
  elements: CanvasElement[];
  active?: boolean;
  lastModified?: Date;
}

export enum Mode {
  Editor,
  Canvas,
}

export interface State {
  canvases: Canvas[];
  files: File[];
  mode: Mode;
  config: Config;
  error?: ErrorObject;
  loading: LoadingType;
  fullscreen: boolean;
  collab?: Collab;
  args?: Args;
  storageSize: number;
  window?: Window;
  isSnapshot?: boolean;
}

export type FileText = {[key: string]: any}

export interface File {
  id: string;
  ydoc: Uint8Array;
  lastModified?: Date;
  path?: string;
  markdown?: boolean;
  active?: boolean;
  editorView?: EditorView;
}

export class ServiceError extends Error {
  public errorObject: ErrorObject
  constructor(id: string, props: unknown) {
    super(id)
    this.errorObject = {id, props}
  }
}

export const StateContext = createContext<[Store<State>, Ctrl]>([{} as any, {} as any])

export const useState = () => useContext(StateContext)

export const createState = (props: Partial<State> = {}): State => ({
  files: [],
  canvases: [],
  mode: Mode.Editor,
  loading: 'loading',
  fullscreen: false,
  storageSize: 0,
  config: {
    fontSize: 14,
    contentWidth: 600,
    alwaysOnTop: false,
    typewriterMode: true,
    spellcheck: true,
    prettier: {
      printWidth: 80,
      tabWidth: 2,
      useTabs: false,
      semi: false,
      singleQuote: true,
    }
  },
  ...props,
})
