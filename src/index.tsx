import React from 'react'
import {render} from 'react-dom'
import {EditorState} from 'prosemirror-state'
import Main from './Main'
import {isMac} from './env'

export interface Config {
  theme: string;
  codeTheme: string;
  font: string;
  fontSize: number;
}

export interface Error {
  id: string;
  props?: unknown;
}

export interface State {
  text?: EditorState;
  lastModified?: Date;
  files: File[];
  config: Config;
  error?: Error;
  loading: boolean;
  alwaysOnTop: boolean;
  focusMode: boolean;
}

export interface File {
  text: {doc: unknown};
  lastModified: string;
}

export const newState = (props: Partial<State> = {}): State => ({
  lastModified: new Date(),
  files: [],
  loading: true,
  alwaysOnTop: isMac,
  focusMode: true,
  config: {
    theme: 'light',
    codeTheme: 'dracula',
    font: 'Merriweather',
    fontSize: 24,
  },
  ...props,
})

render(<Main />, document.getElementById('container'))
