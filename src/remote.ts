import {defaultMarkdownSerializer} from 'prosemirror-markdown'
import {EditorState} from 'prosemirror-state'
import {State} from '.'
import {UpdateConfig, Discard, Open, New, ToggleAlwaysOnTop, Dispatch} from './reducer'
import {themes, fonts, codeThemes} from './config'
import {isElectron, isMac} from './env'

export const updateRemote = (state: State, dispatch: Dispatch) => {
  if (!isElectron) return
  const remote = window.require('electron').remote
  const {app, Menu} = remote

  const root = new Menu()
  createMenu(state, dispatch).forEach(root.append)
  app.applicationMenu = root

  remote.getCurrentWindow().setAlwaysOnTop(state.alwaysOnTop)
}

export const quit = () => {
  const remote = window.require('electron').remote
  remote.app.quit()
}

export const toggleFullScreen = () => {
  if (!isElectron) return
  const remote = window.require('electron').remote
  const win = remote.getCurrentWindow()
  win.setSimpleFullScreen(!win.isSimpleFullScreen())
}

export const copyAllAsMarkdown = (state: EditorState) => {
  const text = defaultMarkdownSerializer.serialize(state.doc)
  if (isElectron) {
    const electron = window.require('electron')
    electron.clipboard.writeText(text, 'selection')
  } else {
    navigator.clipboard.writeText(text)
  }
}

export const getVersion = () => {
  if (isElectron) {
    const electron = window.require('electron')
    return electron.remote.app.getVersion()
  }

  return process.env.npm_package_version
}

export const createMenu = (state: State, dispatch: Dispatch) => {
  const electron = window.require('electron')
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
            remote.shell.openExternal(`https://github.com/dennis84/tiny-write/releases/tag/v${getVersion()}`)
          }
        }),
        new MenuItem({type: 'separator'}),
        new MenuItem({
          label: 'Quit',
          accelerator: 'CmdOrCtrl+Q',
          click: () => quit()
        }),
      ],
    }),
    new MenuItem({
      label: 'File',
      submenu: [
        new MenuItem({
          label: 'New',
          accelerator: 'CmdOrCtrl+N',
          click: () => dispatch(New),
        }),
        new MenuItem({
          label: 'Discard',
          accelerator: 'CmdOrCtrl+W',
          click: () => dispatch(Discard),
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
          click: () => copyAllAsMarkdown(state.text)
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
          accelerator: isMac ? 'Cmd+Enter' : 'Alt+Enter',
          click: () => toggleFullScreen(),
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
