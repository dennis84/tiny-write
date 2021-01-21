import React from 'react'
import {render} from 'react-dom'
import {ProseMirrorState} from './prosemirror/prosemirror'
import Main from './Main'
import {isMac} from './env'
import {isFullScreen} from './remote'

export interface Config {
  theme: string;
  codeTheme: string;
  font: string;
  fontSize: number;
  alwaysOnTop: boolean;
  typewriterMode: boolean;
}

export interface Error {
  id: string;
  props?: unknown;
}

export interface State {
  text?: ProseMirrorState;
  lastModified?: Date;
  files: File[];
  config: Config;
  error?: Error;
  loading: boolean;
  fullscreen: boolean;
}

export interface File {
  text: {doc: unknown};
  lastModified: string;
}

export const newState = (props: Partial<State> = {}): State => ({
  lastModified: new Date(),
  files: [],
  loading: true,
  fullscreen: isFullScreen(),
  config: {
    theme: 'light',
    codeTheme: 'dracula',
    font: 'Merriweather',
    fontSize: 24,
    alwaysOnTop: isMac,
    typewriterMode: true,
  },
  ...props,
})

render(
  <Main state={newState()} />,
  document.getElementById('container')
)
