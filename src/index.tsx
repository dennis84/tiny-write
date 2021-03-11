import React from 'react'
import {render} from 'react-dom'
import {ProseMirrorState} from './prosemirror/prosemirror'
import Main from './Main'
import {newState} from './reducer'

export interface Config {
  theme: string;
  codeTheme: string;
  font: string;
  fontSize: number;
  alwaysOnTop: boolean;
  typewriterMode: boolean;
  dragHandle: boolean;
}

export interface ErrorObject {
  id: string;
  props?: unknown;
}

export interface State {
  text?: ProseMirrorState;
  lastModified?: Date;
  files: File[];
  config: Config;
  error?: ErrorObject;
  loading: boolean;
  fullscreen: boolean;
}

export interface File {
  text: {doc: unknown};
  lastModified: string;
}

render(
  <React.StrictMode>
    <Main state={newState()} />
  </React.StrictMode>,
  document.getElementById('container')
)
