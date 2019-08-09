import {Dispatch} from 'hyperapp'
import {State} from '.'
import {ChangeConfig} from './actions'

export const createMenu = (state: State) => (dispatch: Dispatch) => {
  const remote = (window as any).require('electron').remote
  const {MenuItem} = remote

  return [
    new MenuItem({
      label: 'Application',
      submenu: [
        new MenuItem({label: 'About Application', selector: 'orderFrontStandardAboutPanel:'}),
        new MenuItem({label: 'About Version', click: () => {
          const version = remote.app.getVersion()
          remote.shell.openExternal(`https://github.com/dennis84/tiny-write/releases/tag/v${version}`)
        }}),
        new MenuItem({type: 'separator'}),
        new MenuItem({label: 'Quit', accelerator: 'Command+Q', click: () => remote.app.quit()}),
      ],
    }),
    new MenuItem({
      label: 'Edit',
      submenu: [
        new MenuItem({label: 'Undo', accelerator: 'CmdOrCtrl+Z', selector: 'undo:'}),
        new MenuItem({label: 'Redo', accelerator: 'Shift+CmdOrCtrl+Z', selector: 'redo:'}),
        new MenuItem({type: 'separator'}),
        new MenuItem({label: 'Cut', accelerator: 'CmdOrCtrl+X', selector: 'cut:'}),
        new MenuItem({label: 'Copy', accelerator: 'CmdOrCtrl+C', selector: 'copy:'}),
        new MenuItem({label: 'Paste', accelerator: 'CmdOrCtrl+V', selector: 'paste:'}),
        new MenuItem({label: 'Paste and match style', accelerator: 'Shift+CmdOrCtrl+V', selector: 'pasteAndMatchStyle:'}),
        new MenuItem({label: 'Select All', accelerator: 'CmdOrCtrl+A', selector: 'selectAll:'}),
      ],
    }),
    new MenuItem({
      label: 'View',
      submenu: [
        new MenuItem({label: 'Toggle Fullscreen', accelerator: 'Cmd+Return', click: () => {
          const win = remote.getCurrentWindow()
          win.setSimpleFullScreen(!win.isSimpleFullScreen())
        }}),
        new MenuItem({label: 'Dark Mode', type: 'checkbox', checked: !state.config.light}),
        new MenuItem({label: 'Font', submenu: [
          new MenuItem({
            label: 'Merriweather',
            type: 'checkbox',
            checked: 'Merriweather' === state.config.font,
            click: () => {
              dispatch(ChangeConfig, {...state.config, font: 'Merriweather'})
            }
          }),
          new MenuItem({
            label: 'Times New Roman',
            type: 'checkbox',
            checked: 'Times New Roman' === state.config.font,
            click: () => {
              dispatch(ChangeConfig, {...state.config, font: 'Times New Roman'})
            }
          }),
          new MenuItem({
            label: 'Roboto',
            type: 'checkbox',
            checked: 'Roboto' === state.config.font,
            click: () => {
              dispatch(ChangeConfig, {...state.config, font: 'Roboto'})
            }
          }),
          new MenuItem({
            label: 'Roboto Slab',
            type: 'checkbox',
            checked: 'Roboto Slab' === state.config.font,
            click: () => {
              dispatch(ChangeConfig, {...state.config, font: 'Roboto Slab'})
            }
          }),
          new MenuItem({
            label: 'IBM Plex Serif',
            type: 'checkbox',
            checked: 'IBM Plex Serif' === state.config.font,
            click: () => {
              dispatch(ChangeConfig, {...state.config, font: 'IBM Plex Serif'})
            }
          }),
        ]}),
        new MenuItem({label: 'Code', submenu: [
          new MenuItem({
            label: 'Cobalt',
            type: 'checkbox',
            checked: 'cobalt' === state.config.theme,
            click: () => {
              dispatch(ChangeConfig, {...state.config, theme: 'cobalt'})
            }
          }),
          new MenuItem({
            label: 'Dracula',
            type: 'checkbox',
            checked: 'dracula' === state.config.theme,
            click: () => {
              dispatch(ChangeConfig, {...state.config, theme: 'dracula'})
            }
          }),
          new MenuItem({
            label: 'Material',
            type: 'checkbox',
            checked: 'material' === state.config.theme,
            click: () => {
              dispatch(ChangeConfig, {...state.config, theme: 'material'})
            }
          }),
          new MenuItem({
            label: 'Nord',
            type: 'checkbox',
            checked: 'nord' === state.config.theme,
            click: () => {
              dispatch(ChangeConfig, {...state.config, theme: 'nord'})
            }
          }),
          new MenuItem({
            label: 'Solarized Dark',
            type: 'checkbox',
            checked: 'solarized dark' === state.config.theme,
            click: () => {
              dispatch(ChangeConfig, {...state.config, theme: 'solarized dark'})
            }
          }),
          new MenuItem({
            label: 'Solarized Light',
            type: 'checkbox',
            checked: 'solarized light' === state.config.theme,
            click: () => {
              dispatch(ChangeConfig, {...state.config, theme: 'solarized light'})
            }
          }),
        ]}),
      ],
    })
  ]
}
