const {app, clipboard, shell, ipcMain, BrowserWindow, Menu} = require('electron')
const {autoUpdater} = require('electron-updater')
const path = require('path')
const url = require('url')
const FileType = require('file-type')
const fs = require('fs')
const os = require('os')

let win

function autoUpdate() {
  autoUpdater.checkForUpdatesAndNotify()
}

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
      preload: path.join(app.getAppPath(), 'preload.js'),
    }
  })

  if (process.env.NODE_ENV === 'dev') {
    win.loadURL('http://localhost:3000')
  } else {
    win.loadURL(url.format({
      protocol: 'file',
      hash: '',
      pathname: path.join(__dirname, '/dist/index.html')
    }))
  }

  Menu.setApplicationMenu(Menu.buildFromTemplate([{
    label: 'Application',
    submenu: [
      {label: 'About Application', selector: 'orderFrontStandardAboutPanel:'},
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
      {label: 'Undo', accelerator: 'CmdOrCtrl+Z', selector: 'undo:'},
      {label: 'Redo', accelerator: 'Shift+CmdOrCtrl+Z', selector: 'redo:'},
      {type: 'separator'},
      {label: 'Cut', accelerator: 'CmdOrCtrl+X', selector: 'cut:'},
      {label: 'Copy', accelerator: 'CmdOrCtrl+C', selector: 'copy:'},
      {type: 'separator'},
      {label: 'Paste', accelerator: 'CmdOrCtrl+V', selector: 'paste:'},
      {label: 'Paste and match style', accelerator: 'Shift+CmdOrCtrl+V', selector: 'pasteAndMatchStyle:'},
      {label: 'Select All', accelerator: 'CmdOrCtrl+A', selector: 'selectAll:'},
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

app.on('ready', () => {
  createWindow()
  autoUpdate()
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
  if(win === null) {
    createWindow()
  }
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

ipcMain.handle('getVersion', () => {
  return app.getVersion()
})

ipcMain.handle('fileExists', (event, src) => {
  const file = src.replace('~', os.homedir())
  return fs.existsSync(file)
})

ipcMain.handle('readFile', async (event, src) => {
  const file = src.replace('~', os.homedir())
  const meta = await FileType.fromFile(file)
  const data = await fs.promises.readFile(file)
  const buffer = Buffer.from(data);
  return {...meta, buffer, file}
})

ipcMain.handle('writeFile', (event, file, content) => {
  if (fs.existsSync(file)) {
    fs.writeFileSync(file, content)
  }
})
