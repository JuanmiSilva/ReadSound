const { app, BrowserWindow, ipcMain, dialog } = require('electron');

const createWindow = () => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false
    }
  });

  win.maximize();
  win.loadFile('index.html');
};

ipcMain.handle("get-user-data-path", () => {
  return app.getPath("userData");
});

ipcMain.handle('dialog-save', async (event, defaultName) => {
  const { filePath } = await dialog.showSaveDialog({
    title: 'Exportar Rsound',
    defaultPath: defaultName,
    filters: [{ name: 'Rsound', extensions: ['rsound'] }]
  });
  return filePath;
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});