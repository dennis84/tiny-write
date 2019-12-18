/// <reference path="./types/hyperapp.d.ts" />
/// <reference path="./types/insert-css.d.ts" />
/// <reference path="./types/svg.d.ts" />

import {h, app, VNode, Effect} from 'hyperapp'
import Main from './Main'
import {UpdateState} from './actions'
import * as LocalStorage from './effects/LocalStorage'

export interface Config {
  theme: string;
  codeTheme: string;
  font: string;
}

export interface State {
  text: string;
  lastModified: Date;
  files: File[];
  config: Config;
}

export interface File {
  text: string;
  lastModified: Date;
}

const init: [State, Effect] = [{
  text: '',
  lastModified: new Date,
  files: [],
  config: {
    theme: 'light',
    codeTheme: 'dracula',
    font: 'Merriweather',
  }
}, [LocalStorage.getItem, {
  action: UpdateState,
  key: 'tiny_write.app.data'
}]]

const view = (state: State): VNode => (
  <Main
    text={state.text}
    lastModified={state.lastModified}
    files={state.files}
    config={state.config} />
)

const node = document.getElementById('container')

app({init, view, node})
