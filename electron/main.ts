import { app, BrowserWindow, globalShortcut, ipcMain, session } from 'electron';
import path from 'path';

let mainWindow: BrowserWindow | null = null;

const isDev = process.env.NODE_ENV !== 'production' && !app.isPackaged;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'NexusVoice - Gaming Voice Chat',
    backgroundColor: '#0b0e14',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false // Arka planda veya oyundayken sesin kısılmaması ve kesilmemesi için
    }
  });

  // Mikrofon ve ses yakalama izinlerini otomatik onayla
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    if (permission === 'media' || (permission as string) === 'microphone' || (permission as string) === 'audioCapture') {
      callback(true);
    } else {
      callback(false);
    }
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../client/dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  // Varsayılan global kısayollar (Oyun arka plandayken Mute aç/kapa)
  try {
    globalShortcut.register('CommandOrControl+Shift+M', () => {
      mainWindow?.webContents.send('global-mute-toggle');
    });
  } catch (e) {
    console.warn('Global shortcut registration error:', e);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

ipcMain.on('register-shortcuts', (event, data: { pttKey: string }) => {
  // Dinamik tuş kaydı
  console.log('Registering dynamic shortcuts:', data);
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
