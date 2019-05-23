const {app, ipcMain, shell, BrowserWindow, Menu} = require('electron')
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
    webPreferences: {
      nodeIntegration: true
    }
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
      {label: 'Toggle Fullscreen', accelerator: 'Cmd+Return', click: () => {
        win.setSimpleFullScreen(!win.isSimpleFullScreen())
      }},
      {label: 'Dark Mode', type: 'checkbox', update: (menu, value) => {
        menu.checked = !value
      }, click: (menu) => {
        win.webContents.send('change-config', {light: !menu.checked})
      }},
      {label: 'Font', update: (menu, value) => {
        menu.submenu.items.forEach(item => {
          item.checked = item.label === value
        })
      }, submenu: [
        {label: 'Merriweather', type: 'checkbox', checked: true, click: () => {
          win.webContents.send('change-config', {font: 'Merriweather'})
        }},
        {label: 'Times New Roman', type: 'checkbox', click: () => {
          win.webContents.send('change-config', {font: 'Times New Roman'})
        }},
        {label: 'Roboto', type: 'checkbox', click: () => {
          win.webContents.send('change-config', {font: 'Roboto'})
        }},
        {label: 'Roboto Slab', type: 'checkbox', click: () => {
          win.webContents.send('change-config', {font: 'Roboto Slab'})
        }},
        {label: 'IBM Plex Serif', type: 'checkbox', click: () => {
          win.webContents.send('change-config', {font: 'IBM Plex Serif'})
        }},
      ]},
      {label: 'Code', update: (menu, value) => {
        menu.submenu.items.forEach(item => {
          item.checked = item.label.toLowerCase() === value
        })
      }, submenu: [
        {label: 'Cobalt', type: 'checkbox', click: () => {
          win.webContents.send('change-config', {theme: 'cobalt'})
        }},
        {label: 'Dracula', type: 'checkbox', checked: true, click: () => {
          win.webContents.send('change-config', {theme: 'dracula'})
        }},
        {label: 'Material', type: 'checkbox', click: () => {
          win.webContents.send('change-config', {theme: 'material'})
        }},
        {label: 'Nord', type: 'checkbox', click: () => {
          win.webContents.send('change-config', {theme: 'nord'})
        }},
        {label: 'Panda-Syntax', type: 'checkbox', click: () => {
          win.webContents.send('change-config', {theme: 'panda-syntax'})
        }},
        {label: 'Solarized Dark', type: 'checkbox', click: () => {
          win.webContents.send('change-config', {theme: 'solarized dark'})
        }},
        {label: 'Solarized Light', type: 'checkbox', click: () => {
          win.webContents.send('change-config', {theme: 'solarized light'})
        }},
      ]},
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

ipcMain.on('config', (e, data) => {
  var menu = Menu.getApplicationMenu()
  var view = menu.items[2].submenu
  var mode = view.items[1]
  var font = view.items[2]
  var code = view.items[3]
  mode.update(mode, data.light)
  font.update(font, data.font)
  code.update(code, data.theme)
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
