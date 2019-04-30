/// <reference path="./types/hyperapp.d.ts" />
/// <reference path="./types/insert-css.d.ts" />
/// <reference path="./types/svg.d.ts" />

import {h, app, VNode, Effect} from 'hyperapp'
import Main from './Main'
import {ChangeTheme, UpdateState, ToggleBackground} from './actions'
import * as LocalStorage from './effects/LocalStorage'
import * as IpcRenderer from './effects/IpcRenderer'

export interface State {
  error: string,
  text: string,
  light: boolean,
  theme: string,
}

const init: [State, Effect] = [{
  error: '',
  text: '',
  light: true,
  theme: 'dracula',
}, [LocalStorage.getItem, {
  action: UpdateState,
  key: 'tiny_write.app.data'
}]]

const view = (state: State): VNode => (
  <Main
    text={state.text}
    error={state.error}
    light={state.light}
    theme={state.theme} />
)

const container = document.getElementById('container')

app({
  init,
  view,
  container,
  subscriptions: (s: State) => [
    [IpcRenderer.on, {
      event: 'toggle-background',
      action: ToggleBackground,
    }],
    [IpcRenderer.on, {
      event: 'change-theme',
      action: ChangeTheme,
    }],
  ],
})
