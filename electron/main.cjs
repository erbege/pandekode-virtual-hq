const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const { fork } = require('child_process');
const http = require('http');

// Optimasi performa WebGL / Three.js di Chromium
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('ignore-gpu-blocklist');

let mainWindow = null;
let backendProcess = null;

const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';
const BACKEND_PORT = process.env.PORT || 3000;

// Fungsi memeriksa ketersediaan server backend
function checkBackendReady(port, retries = 30, delayMs = 500) {
  return new Promise((resolve, reject) => {
    const attempt = (remaining) => {
      const req = http.get(`http://localhost:${port}/`, (res) => {
        resolve(true);
      });
      req.on('error', () => {
        if (remaining <= 0) {
          resolve(false); // Lanjutkan walau timeout agar window tetap terbuka
        } else {
          setTimeout(() => attempt(remaining - 1), delayMs);
        }
      });
    };
    attempt(retries);
  });
}

// Menyalakan proses Express backend di dalam Electron
function startBackend() {
  const backendEntry = path.join(__dirname, '../packages/backend/src/index.js');
  const dbPath = path.join(app.getPath('userData'), 'pandekode.sqlite');

  console.log('[Electron] Starting backend from:', backendEntry);
  console.log('[Electron] Database path:', dbPath);

  try {
    backendProcess = fork(backendEntry, [], {
      env: {
        ...process.env,
        PORT: BACKEND_PORT,
        DB_PATH: dbPath,
        ELECTRON_RUN_AS_NODE: '1'
      },
      stdio: 'pipe'
    });

    if (backendProcess.stdout) {
      backendProcess.stdout.on('data', (data) => console.log(`[Backend] ${data.toString().trim()}`));
    }
    if (backendProcess.stderr) {
      backendProcess.stderr.on('data', (data) => console.error(`[Backend Error] ${data.toString().trim()}`));
    }

    backendProcess.on('exit', (code) => {
      console.log(`[Electron] Backend process exited with code ${code}`);
    });
  } catch (err) {
    console.error('[Electron] Failed to start backend:', err);
  }
}

async function createWindow() {
  const iconPath = path.join(__dirname, '../packages/frontend/public/assets/OFFICE_HQ.png');

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    title: 'PANDEKODE HQ',
    backgroundColor: '#07090e',
    icon: iconPath,
    show: false, // Ditampilkan setelah ready-to-show untuk menghindari flicker
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webgl: true
    }
  });

  // Tampilkan jendela begitu siap me-render
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Tentukan URL/File target
  if (isDev && process.env.ELECTRON_START_URL) {
    await mainWindow.loadURL(process.env.ELECTRON_START_URL);
  } else {
    const indexPath = path.join(__dirname, '../packages/frontend/dist/index.html');
    await mainWindow.loadFile(indexPath);
  }

  // Hotkeys & Menu
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F11' && input.type === 'keyDown') {
      mainWindow.setFullScreen(!mainWindow.isFullScreen());
      event.preventDefault();
    }
    if (input.key === 'F12' && input.type === 'keyDown') {
      mainWindow.webContents.toggleDevTools();
      event.preventDefault();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers
ipcMain.on('toggle-fullscreen', () => {
  if (mainWindow) {
    mainWindow.setFullScreen(!mainWindow.isFullScreen());
  }
});
ipcMain.on('window-minimize', () => mainWindow?.minimize());
ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});
ipcMain.on('window-close', () => mainWindow?.close());

// Lifecycle App
app.whenReady().then(async () => {
  // Matikan menu default agar tampak bersih seperti game
  Menu.setApplicationMenu(null);

  // Jika running standalone production atau backend belum berjalan, jalankan backend
  const isBackendUp = await checkBackendReady(BACKEND_PORT, 2, 200);
  if (!isBackendUp) {
    startBackend();
    await checkBackendReady(BACKEND_PORT, 15, 300);
  }

  await createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (backendProcess) {
    console.log('[Electron] Terminating backend process...');
    backendProcess.kill();
    backendProcess = null;
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (backendProcess) {
    backendProcess.kill();
    backendProcess = null;
  }
});
