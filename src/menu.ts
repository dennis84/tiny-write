import {Dispatch} from 'hyperapp'
import {State} from '.'
import {ChangeConfig, Clear, Open, New, Next} from './actions'
import {themes, fonts, codeThemes} from './data';
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
        new MenuItem({
          label: 'Font',
          submenu: Object.entries(fonts).map(([key, value]) => new MenuItem({
            label: value.label,
            type: 'checkbox',
            checked: key === state.config.font,
            click: () => {
              dispatch(ChangeConfig, {...state.config, font: key})
            }
          })),
        }),
        new MenuItem({
          label: 'Theme',
          submenu: Object.entries(themes).map(([key, value]) => new MenuItem({
            label: value.label,
            type: 'checkbox',
            checked: key === state.config.theme,
            click: () => {
              dispatch(ChangeConfig, {...state.config, theme: key})
            }
          })),
        }),
        new MenuItem({
          label: 'Code',
          submenu: Object.entries(codeThemes).map(([key, value]) => new MenuItem({
            label: value.label,
            checked: key === state.config.codeTheme,
            click: () => {
              dispatch(ChangeConfig, {...state.config, codeTheme: key})
            }
          })),
        }),
      ],
    })
  ]
}
