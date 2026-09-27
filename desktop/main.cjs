const { app, BrowserWindow, session } = require('electron');
const path = require('node:path');
app.setName('Devast Remake');
let mainWindow;
const primary = app.requestSingleInstanceLock();
if (!primary) app.quit();
else app.whenReady().then(() => {
  if (process.argv.includes('--offline')) {
    session.defaultSession.enableNetworkEmulation({ offline: true });
    console.info('Devast Remake: application networking is offline.');
  }
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    callback({ cancel: !/^(file:|data:|blob:|devtools:)/.test(details.url) });
  });
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
  const win = new BrowserWindow({ width: 1440, height: 940, minWidth: 900, minHeight: 640, backgroundColor: '#17241e', autoHideMenuBar: true, icon: path.join(__dirname, 'icon.png'),
    webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true } });
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', e => e.preventDefault());
  win.loadFile(path.join(__dirname, '../dist/index.html'));
  mainWindow = win;
});
app.on('second-instance', () => { if (mainWindow) { if (mainWindow.isMinimized()) mainWindow.restore(); mainWindow.focus(); } });
app.on('window-all-closed', () => app.quit());
