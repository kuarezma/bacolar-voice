import { app, BrowserWindow, globalShortcut, session } from 'electron';
import { ChildProcess, fork } from 'child_process';
import path from 'path';

let mainWindow: BrowserWindow | null = null;
let signalingServer: ChildProcess | null = null;

const isDev = process.env.NODE_ENV !== 'production' && !app.isPackaged;

function startBundledSignalingServer() {
  if (isDev || signalingServer) return;

  const serverEntryPath = path.join(process.resourcesPath, 'server', 'dist', 'index.js');
  const dataFilePath = path.join(app.getPath('userData'), 'server-data.json');

  signalingServer = fork(serverEntryPath, [], {
    cwd: path.dirname(serverEntryPath),
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      NEXUS_DATA_FILE: dataFilePath,
      PORT: '3001'
    }
  });

  signalingServer.on('error', (error) => {
    console.error('Yerel sinyalleşme sunucusu başlatılamadı:', error);
  });

  signalingServer.on('exit', (code) => {
    if (code !== null && code !== 0) {
      console.error(`Yerel sinyalleşme sunucusu beklenmedik biçimde kapandı: ${code}`);
    }
    signalingServer = null;
  });
}

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
    const indexPath = path.join(app.getAppPath(), 'client/dist/index.html');
    mainWindow.loadFile(indexPath).catch(() => {
      mainWindow?.loadFile(path.join(__dirname, '../../client/dist/index.html'));
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  startBundledSignalingServer();
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

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  signalingServer?.kill();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
