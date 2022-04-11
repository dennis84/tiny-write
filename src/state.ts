import {createContext, useContext} from 'solid-js'
import {Store} from 'solid-js/store'
import * as Y from 'yjs'
import {WebsocketProvider} from 'y-websocket'
import {isMac} from './env'

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
  font: string;
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

export interface YOptions {
  prosemirrorType: Y.XmlFragment;
  configType: Y.Map<any>;
  provider: WebsocketProvider;
}

export interface Collab {
  started?: boolean;
  error?: boolean;
  room?: string;
  y?: YOptions;
}

export type LoadingType = 'loading' | 'initialized'

export interface State {
  editorView?: any;
  markdown?: boolean;
  lastModified?: Date;
  files: File[];
  config: Config;
  error?: ErrorObject;
  loading: LoadingType;
  fullscreen: boolean;
  collab?: Collab;
  path?: string;
  args?: Args;
}

export interface File {
  text?: {[key: string]: any};
  lastModified?: string;
  path?: string;
  markdown?: boolean;
  collab?: Collab;
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
  config: {
    font: 'merriweather',
    fontSize: 24,
    contentWidth: 800,
    alwaysOnTop: isMac,
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
