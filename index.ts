import {app, clipboard, dialog, shell, ipcMain, BrowserWindow, Menu} from 'electron'
import log from 'electron-log'
import * as path from 'path'
import * as FileType from 'file-type'
import * as fs from 'fs'
import * as os from 'os'

export const getArgs = (argv) => {
  const args = argv.slice(process.env.NODE_ENV === 'dev' ? 2 : 1)
  const cwd = process.cwd()
  let file
  let room
  let text

  for (const arg of args) {
    if (arg.startsWith('tinywrite://')) {
      const url = new URL(arg)
      room = url.searchParams.get('room')
      if (url.searchParams.has('text')) {
        text = Buffer.from(url.searchParams.get('text'), 'base64').toString('utf-8')
      }
    } else if (!arg.startsWith('--')) {
      file = path.resolve(cwd, arg)
    }
  }

  return {cwd, file, room, text}
}

let win

const lock = app.requestSingleInstanceLock()

function createWindow() {
  win = new BrowserWindow({
    title: 'TinyWrite',
    alwaysOnTop: true,
    width: 720,
    height: 720,
    frame: false,
    webPreferences: {
      allowRunningInsecureContent: false,
      contextIsolation: true,
      enableRemoteModule: false,
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

  win.on('closed', () => {
    win = null
  })

  win.on('blur', () => {
    win.setOpacity(0.3)
  })

  win.on('focus', () => {
    win.setOpacity(1)
  })

  win.webContents.on('new-window', (e, url) => {
    e.preventDefault()
    shell.openExternal(url)
  })
}

if (!lock) {
  app.quit()
} else {
  app.on('second-instance', (e, argv) => {
    if (win) {
      if (win.isMinimized()) win.restore()
      win.focus()
      const args = getArgs(argv)
      win.webContents.send('second-instance', args)
    }
  })

  app.on('ready', () => {
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
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (win === null) {
      createWindow()
    }
  })
}

ipcMain.handle('getArgs', () => {
  return getArgs(process.argv)
})

ipcMain.handle('setAlwaysOnTop', (event, flag) => {
  if (win) win.setAlwaysOnTop(flag)
})

ipcMain.handle('setSimpleFullScreen', (event, flag) => {
  if (win) win.setSimpleFullScreen(flag)
})

ipcMain.handle('isSimpleFullScreen', (event, flag) => {
  return win && win.isSimpleFullScreen(flag)
})

ipcMain.handle('copyToClipboard', (event, text) => {
  clipboard.writeText(text)
})

ipcMain.handle('quit', () => {
  app.quit()
})

ipcMain.handle('fileExists', (event, src) => {
  const file = src.replace(/^~/, os.homedir())
  return fs.existsSync(file)
})

ipcMain.handle('isImage', async (event, src) => {
  const file = src.replace('~', os.homedir())
  if (!fs.existsSync(file)) return false
  const meta = await FileType.fromFile(file)
  return meta && (meta.ext === 'png' || meta.ext === 'jpg' || meta.ext === 'gif')
})

ipcMain.handle('readFile', async (event, src) => {
  const file = src.replace('~', os.homedir())
  const meta = await FileType.fromFile(file)
  const data = await fs.promises.readFile(file)
  const stat = await fs.promises.stat(file)
  const buffer = Buffer.from(data)
  return {...meta, buffer, file, lastModified: stat.mtime}
})

ipcMain.handle('writeFile', (event, file, content) => {
  if (fs.existsSync(file)) {
    fs.writeFileSync(file, content)
  }
})

ipcMain.handle('resolve', (event, base, src) => {
  const dir = path.dirname(base)
  return path.resolve(dir, src)
})

ipcMain.handle('log', (event, ...args) => {
  log.info(...args)
})

ipcMain.handle('save', (event, content) => {
  const alwaysOnTop = win.alwaysOnTop
  win.setAlwaysOnTop(false)
  return dialog.showSaveDialog(win).then((result: any) => {
    win.setAlwaysOnTop(alwaysOnTop)
    if (result.cancelled) return
    fs.writeFileSync(result.filePath, content, 'utf-8')
    return result.filePath
  })
})
