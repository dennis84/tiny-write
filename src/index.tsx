import React from 'react'
import {render} from 'react-dom'
import Main from './Main'
import {Node} from 'slate'

export interface Config {
  theme: string;
  codeTheme: string;
  font: string;
}

export interface Notification {
  title: string;
  props: any,
}

export interface State {
  text: Node[];
  lastModified: Date;
  files: File[];
  config: Config;
  notification?: Notification;
}

export interface File {
  text: Node[];
  lastModified: Date;
}

export const newState = (): State => ({
  text: [{children: [{text: ''}]}],
  lastModified: new Date,
  files: [],
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
