import {SetStoreFunction, Store, unwrap} from 'solid-js/store'
import {Config, State} from '@/state'
import * as service from '@/service'
import * as remote from '@/remote'
import {isDarkTheme} from '@/config'
import {Ctrl} from '.'

export class ConfigApi {
  constructor(
    private ctrl: Ctrl,
    private store: Store<State>,
    private setState: SetStoreFunction<State>,
  ) {}

  getTheme(state: State, force = false) {
    const matchDark = window.matchMedia('(prefers-color-scheme: dark)')
    const isDark = matchDark.matches
    const update = force || !state.config.theme
    if (update && isDark && !isDarkTheme(state.config)) {
      return {theme: 'dark', codeTheme: 'material-dark'}
    } else if (update && !isDark && isDarkTheme(state.config)) {
      return {theme: 'light', codeTheme: 'material-light'}
    }

    return {}
  }

  setAlwaysOnTop(alwaysOnTop: boolean) {
    remote.setAlwaysOnTop(alwaysOnTop)
    this.setState('config', {alwaysOnTop})
  }

  updateConfig(conf: Partial<Config>) {
    const state: State = unwrap(this.store)
    if (conf.font) state.collab?.ydoc?.getMap('config').set('font', conf.font)
    if (conf.fontSize) state.collab?.ydoc?.getMap('config').set('fontSize', conf.fontSize)
    if (conf.contentWidth) state.collab?.ydoc?.getMap('config').set('contentWidth', conf.contentWidth)
    const config = {...state.config, ...conf}
    this.setState('config', config)
    this.ctrl.editor.updateEditorState({...state, config})
    service.saveConfig(unwrap(this.store))
  }

  updateContentWidth(contentWidth: number) {
    this.store.collab?.ydoc?.getMap('config').set('contentWidth', contentWidth)
    this.setState('config', 'contentWidth', contentWidth)
    service.saveConfig(unwrap(this.store))
  }

  updateTheme() {
    this.setState('config', this.getTheme(unwrap(this.store), true))
    service.saveConfig(unwrap(this.store))
  }
}
