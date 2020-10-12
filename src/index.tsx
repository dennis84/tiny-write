import React from 'react'
import {render} from 'react-dom'
import {EditorState} from 'prosemirror-state'
import Main from './Main'
import {createEmptyState} from './components/ProseMirror/state'

export interface Config {
  theme: string;
  codeTheme: string;
  font: string;
}

export interface Notification {
  id: string;
  props?: any,
}

export interface State {
  text: EditorState;
  lastModified?: Date;
  files: File[];
  config: Config;
  notification?: Notification;
  loading: boolean;
  alwaysOnTop: boolean;
}

export interface File {
  text: string;
  lastModified: Date;
}

export const newState = (): State => ({
  text: createEmptyState(),
  lastModified: new Date,
  files: [],
  loading: true,
  alwaysOnTop: true,
  config: {
    theme: 'light',
    codeTheme: 'dracula',
    font: 'Merriweather',
  }
})

render(
  <Main initialState={newState()} />,
  document.getElementById('container')
)
