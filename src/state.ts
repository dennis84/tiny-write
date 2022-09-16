import {createContext, useContext} from 'solid-js'
import {Store} from 'solid-js/store'
import * as Y from 'yjs'
import {WebsocketProvider} from 'y-websocket'

export interface Args {
  cwd?: string;
  file?: string;
  room?: string;
  text?: any;
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
  prettier: PrettierConfig;
}

export interface ErrorObject {
  id: string;
  props?: unknown;
}

export interface Version {
  snapshot: any;
  date: number;
  clientID: number;
}

export interface Collab {
  started?: boolean;
  ready?: boolean;
  room?: string;
  provider?: WebsocketProvider;
  permanentUserData?: any;
  ydoc?: Y.Doc;
}

export type LoadingType = 'loading' | 'initialized'

export interface State {
  editorView?: any;
  excerpt?: string;
  markdown?: boolean;
  lastModified?: Date;
  files: File[];
  config: Config;
  error?: ErrorObject;
  loading: LoadingType;
  fullscreen: boolean;
  collab: Collab;
  path?: string;
  args?: Args;
  storageSize: number;
}

export interface File {
  text?: {[key: string]: any};
  excerpt?: string;
  ydoc?: Uint8Array;
  lastModified?: string;
  path?: string;
  markdown?: boolean;
  room?: string;
  storageSize?: number;
}

export class ServiceError extends Error {
  public errorObject: ErrorObject
  constructor(id: string, props: unknown) {
    super(id)
    this.errorObject = {id, props}
  }
}

export const StateContext = createContext<[Store<State>, any]>([undefined, undefined])

export const useState = () => useContext(StateContext)

export const newState = (props: Partial<State> = {}): State => ({
  files: [],
  loading: 'loading',
  fullscreen: false,
  markdown: false,
  collab: {started: false},
  storageSize: 0,
  config: {
    fontSize: 14,
    contentWidth: 600,
    alwaysOnTop: false,
    typewriterMode: true,
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
