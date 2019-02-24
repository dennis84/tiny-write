/// <reference path="./types/hyperapp.d.ts" />
/// <reference path="./types/insert-css.d.ts" />

import {h, app, VNode, Effect} from 'hyperapp'
import {insertCss} from 'insert-css'
import {freestyle} from './styles'
import Main from './Main'
import {UpdateText} from './actions'
import * as LocalStorage from './effects/LocalStorage'

export interface State {
  error: string,
  text: string,
}

const init: [State, Effect] = [{
  error: '',
  text: '',
}, [LocalStorage.getItem, {
  action: UpdateText,
  key: 'tiny_write.app.text'
}]]

const view = (state: State): VNode => (
  <Main
    text={state.text}
    error={state.error} />
)

const container = document.getElementById('container')

app({
  init,
  view,
  container,
})

insertCss(freestyle.getStyles())
