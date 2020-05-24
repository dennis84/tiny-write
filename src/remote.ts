import {State} from '.'
import {Node} from 'slate'
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

export const createMenu = (state: State, dispatch: any) => {
  const electron = (window as any).require('electron')
  const remote = electron.remote
  const {MenuItem} = remote
  const toText = (text: Node[]) => text.map((node) => Node.string(node)).join('\n')

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
            checked: file.lastModified === state.lastModified,
            click: () => dispatch(Open(file)),
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
            const serialize = (children, del = '\n') => {
              return children.map((node, i) => {
                if (node.type === 'block-quote') {
                  return '> ' + Node.string(node)
                } else if (node.type === 'heading-one') {
                  return '# ' + Node.string(node)
                } else if (node.type === 'heading-two') {
                  return '## ' + Node.string(node)
                } else if (node.type === 'heading-three') {
                  return '### ' + Node.string(node)
                } else if (node.type === 'heading-four') {
                  return '#### ' + Node.string(node)
                } else if (node.type === 'heading-five') {
                  return '##### ' + Node.string(node)
                } else if (node.type === 'heading-six') {
                  return '###### ' + Node.string(node)
                } else if (node.type === 'list-item') {
                  const end = children[i+1]?.type !== 'list-item'
                  return `- ${serialize(node.children, '')}${end ? '\n' : ''}`
                } else if (node.type === 'image') {
                  return `![](${node.url})`
                } else if (node.type === 'link') {
                  return `[${Node.string(node)}](${node.url})`
                } else if (node.type === 'code' || node.code) {
                  return '`' + Node.string(node) + '`'
                } else if (node.type === 'code-block') {
                  return '```' + node.lang + '\n' + node.value + '\n```'
                } else if (node.children?.length) {
                  return serialize(node.children, '')
                }

                return Node.string(node)
              }).join(del)
            }

            const text = serialize(state.text)
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
          accelerator: 'Cmd+Return',
          click: (_, win) => {
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
