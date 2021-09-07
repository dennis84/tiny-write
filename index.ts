import {app, clipboard, dialog, shell, ipcMain, BrowserWindow, Menu} from 'electron'
import log from 'electron-log'
import * as path from 'path'
import * as FileType from 'file-type'
import * as fs from 'fs'
import * as os from 'os'
import {spawn} from 'child_process'
import {isatty} from 'tty'
import {Args} from './src/shared'

export const getArgs = (argv: string[]): Args => {
  const xs = argv.slice(process.env.NODE_ENV === 'dev' ? 2 : 1)
  const cwd = process.cwd()
  let file: string
  let link = {}

  for (const arg of xs) {
    if (arg.startsWith('tinywrite://')) {
      link = parseDeepLink(arg)
    } else if (!arg.startsWith('--')) {
      file = path.resolve(cwd, arg)
    }
  }

  return {cwd, file, ...link}
}

const parseDeepLink = (link: string) => {
  const url = new URL(link)
  const room = url.searchParams.get('room')
  let text: string
  if (url.searchParams.has('text')) {
    text = Buffer.from(url.searchParams.get('text'), 'base64').toString('utf-8')
  }

  return {room, text}
}

const main = () => {
  let win: BrowserWindow
  let args = getArgs(process.argv)

  const createWindow = () => {
    win = new BrowserWindow({
      title: 'TinyWrite',
      alwaysOnTop: true,
      width: 720,
      height: 720,
      frame: false,
      show: false,
      webPreferences: {
        allowRunningInsecureContent: false,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        preload: path.join(__dirname, 'preload.js'),
      }
    })

    if (process.env.NODE_ENV === 'dev') {
      win.loadURL('http://localhost:3000')
    } else {
      win.loadURL(`file://${path.join(__dirname, '/index.html')}`)
    }

    Menu.setApplicationMenu(Menu.buildFromTemplate([{
      label: 'Application',
      submenu: [
        {label: 'About Application', role: 'about'},
        {
          label: 'Quit',
          accelerator: 'CmdOrCtrl+Q',
          click: () => win.close()
        },
        {
          label: 'Open Dev Tools',
          accelerator: 'CmdOrCtrl+Shift+J',
          click: () => win.webContents.openDevTools()
        },
      ],
    }, {
      label: 'Edit',
      submenu: [
        {label: 'Undo', accelerator: 'CmdOrCtrl+Z', role: 'undo'},
        {label: 'Redo', accelerator: 'Shift+CmdOrCtrl+Z', role: 'redo'},
        {type: 'separator'},
        {label: 'Cut', accelerator: 'CmdOrCtrl+X', role: 'cut'},
        {label: 'Copy', accelerator: 'CmdOrCtrl+C', role: 'copy'},
        {type: 'separator'},
        {label: 'Paste', accelerator: 'CmdOrCtrl+V', role: 'paste'},
        {label: 'Paste and match style', accelerator: 'Shift+CmdOrCtrl+V', role: 'pasteAndMatchStyle'},
        {label: 'Select All', accelerator: 'CmdOrCtrl+A', role: 'selectAll'},
      ],
    }]))

    win.once('ready-to-show', () => {
      win.show()
    })

    win.on('closed', () => {
      win = null
    })

    win.on('blur', () => {
      win.setOpacity(0.3)
    })

    win.on('focus', () => {
      win.setOpacity(1)
    })

    win.webContents.setWindowOpenHandler(({url}) => {
      shell.openExternal(url)
      return {action: 'allow'}
    })
  }

  const maybeSendArgs = () => {
    if (!win) return
    if (win.isMinimized()) win.restore()
    win.focus()
    win.webContents.send('args', args)
  }

  if (!app.requestSingleInstanceLock()) {
    app.quit()
    return
  }

  app.on('open-file', (_, file) => {
    args = getArgs([...process.argv, file])
    log.info('open-file', args)
    maybeSendArgs()
  })

  app.on('open-url', (_, url) => {
    args = getArgs([...process.argv, url])
    log.info('open-url', args)
    maybeSendArgs()
  })

  app.on('second-instance', (_, argv) => {
    args = getArgs(argv)
    log.info('second-instance', args)
    maybeSendArgs()
  })

  app.on('ready', () => {
    log.info('ready')
    createWindow()
  })

  app.on('window-all-closed', () => {
    // On macOS it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if(process.platform !== 'darwin') {
      app.quit()
    }
  })

  app.on('activate', () => {
    log.info('activate')
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (win === null) {
      createWindow()
      win.focus()
    }
  })

  ipcMain.handle('getArgs', () => args)

  ipcMain.handle('setAlwaysOnTop', (_, flag) => {
    if (win) win.setAlwaysOnTop(flag)
  })

  ipcMain.handle('setSimpleFullScreen', (_, flag) => {
    if (win) win.setSimpleFullScreen(flag)
  })

  ipcMain.handle('isSimpleFullScreen', () => {
    return win && win.isSimpleFullScreen()
  })

  ipcMain.handle('copyToClipboard', (_, text) => {
    clipboard.writeText(text)
  })

  ipcMain.handle('quit', () => {
    app.quit()
  })

  ipcMain.handle('fileExists', (_, src) => {
    const file = src.replace(/^~/, os.homedir())
    return fs.existsSync(file)
  })

  ipcMain.handle('isImage', async (_, src) => {
    const file = src.replace('~', os.homedir())
    if (!fs.existsSync(file)) return false
    const meta = await FileType.fromFile(file)
    return meta && (meta.ext === 'png' || meta.ext === 'jpg' || meta.ext === 'gif')
  })

  ipcMain.handle('readFile', async (_, src) => {
    const file = src.replace('~', os.homedir())
    const meta = await FileType.fromFile(file)
    const data = await fs.promises.readFile(file)
    const stat = await fs.promises.stat(file)
    const buffer = Buffer.from(data)
    return {...meta, buffer, file, lastModified: stat.mtime}
  })

  ipcMain.handle('writeFile', (_, file, content) => {
    if (fs.existsSync(file)) {
      fs.writeFileSync(file, content)
    }
  })

  ipcMain.handle('resolve', (_, base, src) => {
    const dir = path.dirname(base)
    return path.resolve(dir, src)
  })

  ipcMain.handle('log', (_, ...xs) => {
    log.info(...xs)
  })

  ipcMain.handle('save', async (_, content) => {
    const alwaysOnTop = win.isAlwaysOnTop()
    win.setAlwaysOnTop(false)
    const result: any = await dialog.showSaveDialog(win)
    win.setAlwaysOnTop(alwaysOnTop)
    if (result.cancelled) return
    fs.writeFileSync(result.filePath, content, 'utf-8')
    return result.filePath
  })
}

const detach = () => {
  const outputPath = '/dev/null'

  if (!isatty(process.stdout.fd)) {
    return true
  }

  for (const arg of process.argv) {
    if (arg === '--detached-process') {
      return true
    }
  }

  const args = process.argv
    .slice(1)
    .concat(['--detached-process'])

  const out = fs.openSync(outputPath, 'a')
  const err = fs.openSync(outputPath, 'a')

  const child = spawn(process.argv[0], args, {
    detached: true,
    stdio: ['ignore', out, err]
  })

  child.unref()
  app.quit()
}

if (detach()) {
  main()
}
