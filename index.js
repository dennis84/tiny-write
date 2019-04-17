const {app, shell, BrowserWindow, Menu} = require('electron')
const {autoUpdater} = require('electron-updater')
const path = require('path')
const url = require('url')

const appVersion = app.getVersion()

let win

function autoUpdate() {
  autoUpdater.checkForUpdatesAndNotify()
}

function createWindow() {
  win = new BrowserWindow({
    title: 'TinyWrite',
    alwaysOnTop: true,
    width: 600,
    height: 600,
    frame: false,
  })

  win.loadURL(url.format({
    protocol: 'file',
    hash: '',
    pathname: path.join(__dirname, '/index.html')
  }))

  Menu.setApplicationMenu(Menu.buildFromTemplate([{
    label: 'Application',
    submenu: [
      {label: 'About Application', selector: 'orderFrontStandardAboutPanel:'},
      {label: 'About Version', click: () => {
        shell.openExternal(`https://github.com/dennis84/tiny-write/releases/tag/v${appVersion}`)
      }},
      {type: 'separator'},
      {label: 'Quit', accelerator: 'Command+Q', click: () => app.quit()},
    ],
  }, {
    label: 'Edit',
    submenu: [
      {label: 'Undo', accelerator: 'CmdOrCtrl+Z', selector: 'undo:'},
      {label: 'Redo', accelerator: 'Shift+CmdOrCtrl+Z', selector: 'redo:'},
      {type: 'separator'},
      {label: 'Cut', accelerator: 'CmdOrCtrl+X', selector: 'cut:'},
      {label: 'Copy', accelerator: 'CmdOrCtrl+C', selector: 'copy:'},
      {label: 'Paste', accelerator: 'CmdOrCtrl+V', selector: 'paste:'},
      {label: 'Paste and match style', accelerator: 'Shift+CmdOrCtrl+V', selector: 'pasteAndMatchStyle:'},
      {label: 'Select All', accelerator: 'CmdOrCtrl+A', selector: 'selectAll:'},
    ],
  }, {
    label: 'View',
    submenu: [
      {label: 'Toggle Background', click: () => {
        win.webContents.send('toggle-background')
      }},
    ],
  }]))

  // win.webContents.openDevTools()

  win.on('closed', () => {
    win = null
  })

  win.on('blur', () => {
    win.setOpacity(0.3)
  })

  win.on('focus', () => {
    win.setOpacity(1)
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
