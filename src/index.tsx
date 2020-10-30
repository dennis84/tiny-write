import React from 'react'
import {render} from 'react-dom'
import {EditorState} from 'prosemirror-state'
import Main from './Main'

export interface Config {
  theme: string;
  codeTheme: string;
  font: string;
}

export interface ThemeProps {
  theme: Config;
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
}

export interface File {
  text?: EditorState;
  lastModified: Date;
}

export const newState = (props: Partial<State> = {}): State => ({
  lastModified: new Date(),
  files: [],
  loading: true,
  alwaysOnTop: true,
  config: {
    theme: 'light',
    codeTheme: 'dracula',
    font: 'Merriweather',
  },
  ...props,
})

render(<Main />, document.getElementById('container'))
