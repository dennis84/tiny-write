import {Dispatch} from 'hyperapp'
import {State} from '.'
import {ChangeConfig, Clear, Open, New, Next} from './actions'
import {toText} from './utils/text'

export const createMenu = (state: State) => (dispatch: Dispatch) => {
  const remote = (window as any).require('electron').remote
  const {MenuItem} = remote

  return [
    new MenuItem({
      label: 'Application',
      submenu: [
        new MenuItem({label: 'About Application', selector: 'orderFrontStandardAboutPanel:'}),
        new MenuItem({
          label: 'About Version',
          click: () => {
            const version = remote.app.getVersion()
            remote.shell.openExternal(`https://github.com/dennis84/tiny-write/releases/tag/v${version}`)
          }
        }),
        new MenuItem({type: 'separator'}),
        new MenuItem({
          label: 'Quit',
          accelerator: 'Command+Q',
          click: () => remote.app.quit()
        }),
      ],
    }),
    new MenuItem({
      label: 'File',
      submenu: [
        new MenuItem({
          label: 'New',
          accelerator: 'Cmd+N',
          click: () => dispatch(New, {}),
        }),
        new MenuItem({
          label: 'Clear',
          accelerator: 'Cmd+W',
          click: () => dispatch(Clear, {}),
        }),
        new MenuItem({type: 'separator'}),
        new MenuItem({
          label: 'Open Next',
          accelerator: 'Ctrl+Tab',
          click: () => dispatch(Next, {}),
        }),
        new MenuItem({
          label: 'Files',
          submenu: state.files.map(file => new MenuItem({
            label: toText(file.text).substring(0, 16),
            type: 'checkbox',
            checked: file.lastModified === state.lastModified,
            click: () => dispatch(Open, file),
          }))
        }),
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
        new MenuItem({
          label: 'Toggle Fullscreen',
          accelerator: 'Cmd+Return',
          click: () => {
            const win = remote.getCurrentWindow()
            win.setSimpleFullScreen(!win.isSimpleFullScreen())
          }
        }),
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
          new MenuItem({
            label: 'Iosevka Term Slab',
            type: 'checkbox',
            checked: 'Iosevka Term Slab' === state.config.font,
            click: () => {
              dispatch(ChangeConfig, {...state.config, font: 'Iosevka Term Slab'})
            }
          }),
        ]}),
        new MenuItem({label: 'Theme', submenu: [
          new MenuItem({
            label: 'Light',
            type: 'checkbox',
            checked: 'light' === state.config.theme,
            click: () => {
              dispatch(ChangeConfig, {...state.config, theme: 'light'})
            }
          }),
          new MenuItem({
            label: 'Sand',
            type: 'checkbox',
            checked: 'sand' === state.config.theme,
            click: () => {
              dispatch(ChangeConfig, {...state.config, theme: 'sand'})
            }
          }),
          new MenuItem({
            label: 'Dark',
            type: 'checkbox',
            checked: 'dark' === state.config.theme,
            click: () => {
              dispatch(ChangeConfig, {...state.config, theme: 'dark'})
            }
          }),
          new MenuItem({
            label: 'Sand Dark',
            type: 'checkbox',
            checked: 'sand dark' === state.config.theme,
            click: () => {
              dispatch(ChangeConfig, {...state.config, theme: 'sand dark'})
            }
          }),
        ]}),
        new MenuItem({label: 'Code', submenu: [
          new MenuItem({
            label: 'Cobalt',
            type: 'checkbox',
            checked: 'cobalt' === state.config.codeTheme,
            click: () => {
              dispatch(ChangeConfig, {...state.config, codeTheme: 'cobalt'})
            }
          }),
          new MenuItem({
            label: 'Dracula',
            type: 'checkbox',
            checked: 'dracula' === state.config.codeTheme,
            click: () => {
              dispatch(ChangeConfig, {...state.config, codeTheme: 'dracula'})
            }
          }),
          new MenuItem({
            label: 'Material',
            type: 'checkbox',
            checked: 'material' === state.config.codeTheme,
            click: () => {
              dispatch(ChangeConfig, {...state.config, codeTheme: 'material'})
            }
          }),
          new MenuItem({
            label: 'Nord',
            type: 'checkbox',
            checked: 'nord' === state.config.codeTheme,
            click: () => {
              dispatch(ChangeConfig, {...state.config, codeTheme: 'nord'})
            }
          }),
          new MenuItem({
            label: 'Solarized Dark',
            type: 'checkbox',
            checked: 'solarized dark' === state.config.codeTheme,
            click: () => {
              dispatch(ChangeConfig, {...state.config, codeTheme: 'solarized dark'})
            }
          }),
          new MenuItem({
            label: 'Solarized Light',
            type: 'checkbox',
            checked: 'solarized light' === state.config.codeTheme,
            click: () => {
              dispatch(ChangeConfig, {...state.config, codeTheme: 'solarized light'})
            }
          }),
        ]}),
      ],
    })
  ]
}
