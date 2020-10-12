import {defaultMarkdownSerializer} from 'prosemirror-markdown'
import {State} from '.'
import {UpdateConfig, Close, Open, New, ToggleAlwaysOnTop} from './reducer'
import {themes, fonts, codeThemes} from './config'

const userAgent = window.navigator.userAgent.toLowerCase()
const isElectron = userAgent.indexOf(' electron/') > -1

export const updateRemote = (state: State, dispatch: any) => {
  if (!isElectron) return
  const remote = window.require('electron').remote
  const {app, Menu} = remote

  const root = new Menu()
  createMenu(state, dispatch).forEach(root.append)
  app.applicationMenu = root

  remote.getCurrentWindow().setAlwaysOnTop(state.alwaysOnTop)
}

export const toggleFullScreen = () => {
  if (!isElectron) return
  const remote = window.require('electron').remote
  const win = remote.getCurrentWindow()
  win.setSimpleFullScreen(!win.isSimpleFullScreen())
}

export const createMenu = (state: State, dispatch: any) => {
  const electron = (window as any).require('electron')
  const remote = electron.remote
  const {MenuItem} = remote
  const toText = (editorState) => editorState.doc.textContent

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
          click: () => dispatch(New),
        }),
        new MenuItem({
          label: 'Close',
          accelerator: 'Cmd+W',
          click: () => dispatch(Close),
        }),
        new MenuItem({type: 'separator'}),
        new MenuItem({
          label: 'Files',
          submenu: state.files.map(file => new MenuItem({
            label: toText(file.text).substring(0, 16),
            type: 'checkbox',
            click: () => dispatch(Open(file))
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
        new MenuItem({
          label: 'Copy All as Markdown',
          click: () => {
            const text = defaultMarkdownSerializer.serialize(state.text.doc)
            electron.clipboard.writeText(text, 'selection')
          }
        }),
        new MenuItem({type: 'separator'}),
        new MenuItem({label: 'Paste', accelerator: 'CmdOrCtrl+V', selector: 'paste:'}),
        new MenuItem({label: 'Paste and match style', accelerator: 'Shift+CmdOrCtrl+V', selector: 'pasteAndMatchStyle:'}),
        new MenuItem({label: 'Select All', accelerator: 'CmdOrCtrl+A', selector: 'selectAll:'}),
      ],
    }),
    new MenuItem({
      label: 'View',
      submenu: [
        new MenuItem({
          label: 'Always on Top',
          type: 'checkbox',
          checked: state.alwaysOnTop,
          click: () => dispatch(ToggleAlwaysOnTop),
        }),
        new MenuItem({
          label: 'Toggle Fullscreen',
          accelerator: 'Cmd+Enter',
          click: (_, win) => {
            toggleFullScreen()
          }
        }),
        new MenuItem({
          label: 'Font',
          submenu: Object.entries(fonts).map(([key, value]) => new MenuItem({
            label: value.label,
            type: 'checkbox',
            checked: key === state.config.font,
            click: () => {
              dispatch(UpdateConfig({...state.config, font: key}))
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
              dispatch(UpdateConfig({...state.config, theme: key}))
            }
          })),
        }),
        new MenuItem({
          label: 'Code',
          submenu: Object.entries(codeThemes).map(([key, value]) => new MenuItem({
            label: value.label,
            type: 'checkbox',
            checked: key === state.config.codeTheme,
            click: () => {
              dispatch(UpdateConfig({...state.config, codeTheme: key}))
            }
          })),
        }),
      ],
    })
  ]
}
