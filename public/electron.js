const { app, BrowserWindow, ipcMain, dialog, shell, net } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');

let mainWindow;

// ✅ Forzar producción si estamos en un ejecutable empaquetado
const isProduction = app.isPackaged || !isDev;

// ✅ Deshabilitar warnings de seguridad en desarrollo
if (!isProduction) {
  process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';
}

// ✅ Configuración de seguridad mejorada
app.on('web-contents-created', (event, contents) => {
  // Prevenir navegación a URLs externas
  contents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    
    // Permitir solo localhost en desarrollo o file:// en producción
    if (isProduction) {
      if (parsedUrl.protocol !== 'file:') {
        event.preventDefault();
      }
    } else {
      if (!['http:', 'https:'].includes(parsedUrl.protocol) || 
          !parsedUrl.hostname.includes('localhost')) {
        event.preventDefault();
      }
    }
  });

  // Prevenir apertura de nuevas ventanas
  contents.setWindowOpenHandler(({ url }) => {
    // Abrir enlaces externos en el navegador predeterminado
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      // ✅ Configuración de seguridad mejorada
      nodeIntegration: true,  // TODO: Cambiar a false cuando se implemente preload completo
      contextIsolation: false, // TODO: Cambiar a true con preload
      enableRemoteModule: false, // ✅ Deshabilitado por seguridad
      webSecurity: true, // ✅ Siempre habilitado
      allowRunningInsecureContent: false,
      devTools: !isProduction,
      // Preload script para exposición segura de APIs
      // preload: path.join(__dirname, 'preload.js'), // Descomentar cuando esté listo
      sandbox: false // TODO: Habilitar cuando se complete la migración a preload
    },
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    frame: process.platform !== 'win32',
    show: false,
    backgroundColor: '#111827',
    title: 'MultiPlatform Downloader Pro',
    icon: path.join(__dirname, 'Logo.png')
  });

  // ✅ Deshabilitar warnings de DevTools
  if (!isProduction) {
    mainWindow.webContents.on('devtools-opened', () => {
      mainWindow.webContents.devToolsWebContents.executeJavaScript(`
        const originalWarn = console.warn;
        console.warn = (...args) => {
          const msg = args.join(' ');
          if (msg.includes('Autofill') || msg.includes('Request')) return;
          originalWarn.apply(console, args);
        };
      `);
    });
  }

  const startUrl = isProduction 
    ? `file://${path.join(__dirname, 'index.html')}`
    : 'http://localhost:3000';
  
  console.log('🚀 Electron Starting...');
  console.log('Loading URL:', startUrl);
  console.log('__dirname:', __dirname);
  console.log('isProduction:', isProduction);
  console.log('app.isPackaged:', app.isPackaged);
  console.log('process.resourcesPath:', process.resourcesPath);
  
  mainWindow.loadURL(startUrl)
    .then(() => {
      console.log('✅ URL loaded successfully');
    })
    .catch(err => {
      console.error('❌ Failed to load URL:', err);
    });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    // Abrir DevTools solo en desarrollo
    if (!isProduction) {
      mainWindow.webContents.openDevTools();
    }
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription);
  });
}

// IPC handlers
ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.handle('select-folder', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: 'Select Download Folder'
    });
    return result;
  } catch (error) {
    console.error('Error in folder selection:', error);
    return { canceled: true };
  }
});

// ✅ Handler para obtener rutas del sistema
ipcMain.handle('get-app-path', () => {
  return app.getAppPath();
});

ipcMain.handle('get-downloads-path', () => {
  return app.getPath('downloads');
});

// ✅ Handler para mostrar archivo en explorador
ipcMain.handle('show-item-in-folder', (event, filePath) => {
  shell.showItemInFolder(filePath);
  return true;
});

// ✅ Handler para abrir enlaces externos
ipcMain.handle('open-external', (event, url) => {
  try {
    const parsed = new URL(url);
    if (['http:', 'https:'].includes(parsed.protocol)) {
      shell.openExternal(url);
      return true;
    }
  } catch (error) {
    console.error('Invalid URL:', url);
  }
  return false;
});

// ✅ Handler para proxy de imágenes (evita CORS)
ipcMain.handle('fetch-image', async (event, imageUrl) => {
  return new Promise((resolve, reject) => {
    try {
      const request = net.request(imageUrl);
      const chunks = [];
      
      request.on('response', (response) => {
        const contentType = response.headers['content-type'] || 'image/jpeg';
        
        response.on('data', (chunk) => {
          chunks.push(chunk);
        });
        
        response.on('end', () => {
          const buffer = Buffer.concat(chunks);
          const base64 = buffer.toString('base64');
          const dataUrl = `data:${contentType};base64,${base64}`;
          resolve(dataUrl);
        });
        
        response.on('error', (err) => {
          console.error('Response error:', err);
          reject(err);
        });
      });
      
      request.on('error', (err) => {
        console.error('Request error:', err);
        reject(err);
      });
      
      request.end();
    } catch (error) {
      console.error('Fetch image error:', error);
      reject(error);
    }
  });
});

// ✅ Handler para test de velocidad de bandwidth
ipcMain.handle('test-bandwidth', async () => {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const testUrl = 'https://httpbin.org/bytes/500000'; // 500KB test file
    
    try {
      const request = net.request(testUrl);
      const chunks = [];
      
      request.on('response', (response) => {
        response.on('data', (chunk) => {
          chunks.push(chunk);
        });
        
        response.on('end', () => {
          const endTime = Date.now();
          const buffer = Buffer.concat(chunks);
          const duration = (endTime - startTime) / 1000;
          const speedBps = buffer.length / duration;
          const speedKbps = (speedBps * 8) / 1024;
          
          resolve({
            success: true,
            speed: speedKbps,
            latency: endTime - startTime,
            bytes: buffer.length
          });
        });
        
        response.on('error', () => {
          resolve({ success: false });
        });
      });
      
      request.on('error', () => {
        resolve({ success: false });
      });
      
      request.end();
    } catch (error) {
      resolve({ success: false });
    }
  });
});

// ✅ Handler para obtener URL de streaming via yt-dlp
ipcMain.handle('get-stream-url', async (event, videoUrl) => {
  const { spawn } = require('child_process');
  
  return new Promise((resolve) => {
    try {
      // Buscar yt-dlp en diferentes ubicaciones
      const possiblePaths = [
        'yt-dlp',
        'yt-dlp.exe',
        path.join(process.env.LOCALAPPDATA || '', 'Programs', 'yt-dlp', 'yt-dlp.exe'),
        path.join(process.env.USERPROFILE || '', 'yt-dlp.exe'),
      ];
      
      const ytdlpPath = possiblePaths[0]; // Usar el del PATH
      
      // Detectar la plataforma para usar el formato correcto
      const isReddit = videoUrl.includes('reddit.com') || videoUrl.includes('redd.it');
      const isTwitter = videoUrl.includes('twitter.com') || videoUrl.includes('x.com');
      
      // Reddit y Twitter necesitan formatos diferentes
      let formatArg;
      if (isReddit) {
        formatArg = 'bestvideo+bestaudio/best';
      } else if (isTwitter) {
        formatArg = 'best';
      } else {
        formatArg = 'best[ext=mp4]/bestvideo[ext=mp4]+bestaudio/best';
      }
      
      const args = [
        '--get-url',
        '-f', formatArg,
        '--no-playlist',
        videoUrl
      ];
      
      console.log('🎬 Getting stream URL:', ytdlpPath, args.join(' '));
      
      const process_ytdlp = spawn(ytdlpPath, args);
      let stdout = '';
      let stderr = '';
      
      process_ytdlp.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      process_ytdlp.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      process_ytdlp.on('close', (code) => {
        if (code === 0 && stdout.trim()) {
          const urls = stdout.trim().split('\n').filter(u => u.startsWith('http'));
          resolve({
            success: true,
            videoUrl: urls[0] || null,
            audioUrl: urls[1] || null
          });
        } else {
          console.error('yt-dlp error:', stderr);
          resolve({ success: false, error: stderr });
        }
      });
      
      process_ytdlp.on('error', (err) => {
        console.error('yt-dlp spawn error:', err);
        resolve({ success: false, error: err.message });
      });
      
    } catch (error) {
      resolve({ success: false, error: error.message });
    }
  });
});

// ✅ Handler para proxy de video stream (evita CORS)
ipcMain.handle('proxy-video-stream', async (event, streamUrl) => {
  return new Promise((resolve) => {
    try {
      const request = net.request({
        url: streamUrl,
        method: 'GET'
      });
      
      const chunks = [];
      let totalSize = 0;
      const maxSize = 10 * 1024 * 1024; // Límite de 10MB para preview
      
      request.on('response', (response) => {
        const contentType = response.headers['content-type'] || 'video/mp4';
        
        response.on('data', (chunk) => {
          if (totalSize < maxSize) {
            chunks.push(chunk);
            totalSize += chunk.length;
          }
        });
        
        response.on('end', () => {
          const buffer = Buffer.concat(chunks);
          const base64 = buffer.toString('base64');
          const dataUrl = `data:${contentType};base64,${base64}`;
          resolve({ success: true, dataUrl, size: totalSize });
        });
        
        response.on('error', (err) => {
          resolve({ success: false, error: err.message });
        });
      });
      
      request.on('error', (err) => {
        resolve({ success: false, error: err.message });
      });
      
      request.end();
    } catch (error) {
      resolve({ success: false, error: error.message });
    }
  });
});

// ✅ Comandos adicionales para suprimir warnings
app.commandLine.appendSwitch('disable-features', 'OutOfBlinkCors');
app.commandLine.appendSwitch('disable-site-isolation-trials');

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});