import {h, app, VNode, Effect} from 'hyperapp'
import Main from './Main'
import {UpdateState} from './actions'
import * as LocalStorage from './effects/LocalStorage'
import Delta from 'quill-delta'

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
  text: Delta;
  lastModified: Date;
  files: File[];
  config: Config;
  notification?: Notification;
}

export interface File {
  text: Delta;
  lastModified: Date;
}

export const newState = () => ({
  text: new Delta,
  lastModified: new Date,
  files: [],
  config: {
    theme: 'light',
    codeTheme: 'dracula',
    font: 'Merriweather',
  }
})

const init: [State, Effect] = [
  newState(),
  [LocalStorage.getItem, {
    action: UpdateState,
    key: 'tiny_write.app.data'
  }]
]

const view = (state: State): VNode => (
  <Main
    text={state.text}
    lastModified={state.lastModified}
    files={state.files}
    config={state.config}
    notification={state.notification} />
)

const node = document.getElementById('container')

app({init, view, node})
