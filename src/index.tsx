/// <reference path="./types/hyperapp.d.ts" />
/// <reference path="./types/insert-css.d.ts" />
/// <reference path="./types/svg.d.ts" />

import {h, app, VNode, Effect} from 'hyperapp'
import Main from './Main'
import {UpdateState, ToggleBackground} from './actions'
import * as LocalStorage from './effects/LocalStorage'
import * as IpcRenderer from './effects/IpcRenderer'

export interface State {
  error: string,
  text: string,
  light: boolean,
}

const init: [State, Effect] = [{
  error: '',
  text: '',
  light: true,
}, [LocalStorage.getItem, {
  action: UpdateState,
  key: 'tiny_write.app.data'
}]]

const view = (state: State): VNode => (
  <Main
    text={state.text}
    error={state.error}
    light={state.light} />
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
  ],
})
