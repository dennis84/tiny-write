import React from 'react'
import {render} from 'react-dom'
import {XmlFragment} from 'yjs'
import {WebsocketProvider} from 'y-websocket'
import {ProseMirrorState} from './prosemirror/prosemirror'
import Main from './Main'
import {newState} from './reducer'

export interface Config {
  theme: string;
  codeTheme: string;
  font: string;
  fontSize: number;
  contentWidth: number;
  alwaysOnTop: boolean;
  markdown: boolean;
  typewriterMode: boolean;
}

export interface ErrorObject {
  id: string;
  props?: unknown;
}

export interface YOptions {
  type: XmlFragment;
  provider: WebsocketProvider;
}

export interface Collab {
  started?: boolean;
  error?: boolean;
  room?: string;
  y?: YOptions;
}

export interface Args {
  cwd: string;
  file?: string;
  room?: string;
  text: any;
}

export type LoadingType = 'loading' | 'roundtrip' | 'initialized' | 'error'

export interface State {
  text?: ProseMirrorState;
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
}

render(
  <React.StrictMode>
    <Main state={newState()} />
  </React.StrictMode>,
  document.getElementById('container')
)
