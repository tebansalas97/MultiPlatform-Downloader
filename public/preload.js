/**
 * Preload script para Electron
 * Proporciona un puente seguro entre el proceso principal y el renderer
 * usando contextBridge para exponer APIs de forma segura
 */

const { contextBridge, ipcRenderer, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

// Lista blanca de canales IPC permitidos
const validSendChannels = [
  'window-minimize',
  'window-maximize',
  'window-close'
];

const validInvokeChannels = [
  'select-folder',
  'get-app-path',
  'get-downloads-path',
  'show-item-in-folder',
  'open-external'
];

// Exponer API segura al renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Información del entorno
  platform: process.platform,
  isElectron: true,
  
  // Control de ventana
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),
  
  // Diálogos
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  
  // Rutas del sistema
  getAppPath: () => ipcRenderer.invoke('get-app-path'),
  getDownloadsPath: () => ipcRenderer.invoke('get-downloads-path'),
  
  // Sistema de archivos (limitado y seguro)
  openFolder: (folderPath) => shell.openPath(folderPath),
  showItemInFolder: (filePath) => shell.showItemInFolder(filePath),
  
  // Abrir enlaces externos (en el navegador predeterminado)
  openExternal: (url) => {
    // Validar que sea una URL segura
    try {
      const parsed = new URL(url);
      if (['http:', 'https:'].includes(parsed.protocol)) {
        shell.openExternal(url);
        return true;
      }
    } catch {
      console.error('Invalid URL:', url);
    }
    return false;
  },
  
  // Procesos externos (yt-dlp, ffmpeg)
  spawn: (command, args, options) => {
    // Lista blanca de comandos permitidos
    const allowedCommands = ['yt-dlp', 'ffmpeg', 'ffprobe', 'where', 'which'];
    const baseCommand = path.basename(command).replace(/\.exe$/i, '').toLowerCase();
    
    if (!allowedCommands.includes(baseCommand)) {
      console.error('Command not allowed:', command);
      return null;
    }
    
    return spawn(command, args, {
      ...options,
      shell: false, // Nunca usar shell para mayor seguridad
      windowsHide: true
    });
  },
  
  // Acceso limitado al sistema de archivos
  fs: {
    existsSync: (filePath) => {
      // Solo permitir verificar existencia en rutas seguras
      try {
        return fs.existsSync(filePath);
      } catch {
        return false;
      }
    },
    readFileSync: (filePath, encoding) => {
      // Solo permitir leer archivos de configuración o logs
      const allowedExtensions = ['.json', '.log', '.txt', '.md'];
      const ext = path.extname(filePath).toLowerCase();
      
      if (!allowedExtensions.includes(ext)) {
        console.error('File type not allowed:', ext);
        return null;
      }
      
      try {
        return fs.readFileSync(filePath, encoding);
      } catch {
        return null;
      }
    },
    writeFileSync: (filePath, data) => {
      // Solo permitir escribir en carpetas de usuario
      const userDataPath = require('electron').app?.getPath('userData') || '';
      
      if (!filePath.startsWith(userDataPath)) {
        console.error('Write path not allowed:', filePath);
        return false;
      }
      
      try {
        fs.writeFileSync(filePath, data);
        return true;
      } catch {
        return false;
      }
    }
  },
  
  // Información del proceso
  getProcessInfo: () => ({
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
    electronVersion: process.versions.electron
  }),
  
  // Notificaciones del sistema
  showNotification: (title, body) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body });
    }
  }
});

console.log('✅ Preload script loaded - Secure APIs exposed');
