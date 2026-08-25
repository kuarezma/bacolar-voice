import { app, BrowserWindow, dialog, globalShortcut, session } from 'electron';
import { ChildProcess, fork } from 'child_process';
import http from 'http';
import path from 'path';

let mainWindow: BrowserWindow | null = null;
let signalingServer: ChildProcess | null = null;
let isQuitting = false;

const isDev = process.env.NODE_ENV !== 'production' && !app.isPackaged;

const SIGNALING_PORT = 3001;
// server/src/index.ts, portu alamadığında bu kodla çıkar.
const EXIT_PORT_IN_USE = 3;

type PortOccupant = 'nexusvoice' | 'foreign' | 'free';

function reportServerFailure(message: string) {
  if (isQuitting) return;
  dialog.showErrorBox('NexusVoice sunucusuna bağlanılamadı', message);
}

// Port doluysa oradaki servisin başka bir NexusVoice örneği mi yoksa alakasız bir
// uygulama mı olduğunu ayırt eder; ilkinde ses hizmeti çalışmaya devam edebilir.
function probeSignalingPort(): Promise<PortOccupant> {
  return new Promise((resolve) => {
    const request = http.get(
      { host: '127.0.0.1', port: SIGNALING_PORT, path: '/api/health', timeout: 1500 },
      (response) => {
        let body = '';
        response.on('data', (chunk) => (body += chunk));
        response.on('end', () => {
          try {
            resolve(JSON.parse(body).service === 'nexusvoice-signaling' ? 'nexusvoice' : 'foreign');
          } catch {
            resolve('foreign');
          }
        });
      }
    );

    request.on('timeout', () => {
      request.destroy();
      resolve('foreign');
    });
    request.on('error', () => resolve('free'));
  });
}

async function startBundledSignalingServer() {
  if (isDev || signalingServer) return;

  const occupant = await probeSignalingPort();

  if (occupant === 'nexusvoice') return;

  if (occupant === 'foreign') {
    reportServerFailure(
      `${SIGNALING_PORT} numaralı portu başka bir uygulama kullanıyor, bu yüzden NexusVoice sunucusu başlatılamadı.\n\n` +
        `O uygulamayı kapatıp NexusVoice'u yeniden açın; ya da ortak bir sunucu kullanıyorsanız ` +
        `Oyuncu Profili ayarlarından sunucu adresini değiştirin.`
    );
    return;
  }

  const serverEntryPath = path.join(process.resourcesPath, 'server', 'dist', 'index.js');
  const dataFilePath = path.join(app.getPath('userData'), 'server-data.json');

  signalingServer = fork(serverEntryPath, [], {
    cwd: path.dirname(serverEntryPath),
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      NEXUS_DATA_FILE: dataFilePath,
      PORT: String(SIGNALING_PORT)
    }
  });

  signalingServer.on('error', (error) => {
    console.error('Yerel sinyalleşme sunucusu başlatılamadı:', error);
    reportServerFailure(`Yerel sinyalleşme sunucusu başlatılamadı:\n\n${error.message}`);
  });

  signalingServer.on('exit', (code) => {
    signalingServer = null;

    if (code === EXIT_PORT_IN_USE) {
      reportServerFailure(
        `${SIGNALING_PORT} numaralı port kullanımda olduğu için NexusVoice sunucusu başlatılamadı.\n\n` +
          `O portu kullanan uygulamayı kapatıp NexusVoice'u yeniden açın.`
      );
      return;
    }

    if (code !== null && code !== 0) {
      console.error(`Yerel sinyalleşme sunucusu beklenmedik biçimde kapandı: ${code}`);
      reportServerFailure(
        `Yerel sinyalleşme sunucusu beklenmedik biçimde kapandı (çıkış kodu ${code}).\n\n` +
          `Uygulamayı yeniden başlatmayı deneyin.`
      );
    }
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

// İkinci bir örnek, ilkinin tuttuğu 3001 portunu alamaz ve sessizce bağlantısız kalırdı.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  app.whenReady().then(async () => {
    createWindow();
    await startBundledSignalingServer();

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
}

app.on('before-quit', () => {
  isQuitting = true;
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
