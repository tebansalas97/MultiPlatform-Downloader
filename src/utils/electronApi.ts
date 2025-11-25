// Wrapper mejorado para APIs de Electron que funciona tanto en desarrollo como en producción

interface ElectronProcess {
  stdout: {
    on: (event: string, callback: (data: Buffer) => void) => void;
  };
  stderr: {
    on: (event: string, callback: (data: Buffer) => void) => void;
  };
  on(event: 'close' | 'exit', callback: (code: number) => void): void;
  on(event: 'error', callback: (error: Error) => void): void;
  kill: (signal?: string) => void;
}

interface ElectronApi {
  spawn: (command: string, args: string[]) => ElectronProcess;
  existsSync: (path: string) => boolean;
  mkdirSync: (path: string, options?: any) => void;
  openPath: (path: string) => Promise<void>;
  checkYtDlp: () => Promise<boolean>;
  getSystemInfo: () => any;
  getFs: () => any;
  getPath: () => any;
  isElectron: boolean;
}

class ElectronApiWrapper implements ElectronApi {
  public isElectron: boolean;
  private childProcess: any;
  private fs: any;
  private path: any;
  private shell: any;

  constructor() {
    // Detectar Electron de forma más robusta
    this.isElectron = !!(
      typeof window !== 'undefined' && 
      window.process && 
      window.process.type === 'renderer' &&
      window.require
    );

    console.log('Environment detection:', {
      hasWindow: typeof window !== 'undefined',
      hasProcess: !!(window.process),
      processType: window.process?.type,
      hasRequire: !!(window.require),
      userAgent: navigator?.userAgent
    });

    if (this.isElectron) {
      try {
        this.childProcess = window.require('child_process');
        this.fs = window.require('fs');
        this.path = window.require('path');
        const { shell } = window.require('electron');
        this.shell = shell;
        console.log('✅ Electron APIs initialized successfully');
      } catch (error) {
        console.warn('❌ Failed to initialize Electron APIs:', error);
        this.isElectron = false;
      }
    } else {
      console.log('🌐 Running in web browser mode - using mocks');
    }
  }

  spawn(command: string, args: string[]): ElectronProcess {
    if (this.isElectron && this.childProcess) {
      try {
        console.log(`Spawning: ${command} ${args.join(' ')}`);

        // ✅ CRÍTICO: Configuración de spawn para Windows
        const spawnOptions: any = {
          shell: false, // No usar shell por defecto para mejor control
          windowsHide: true // Ocultar ventanas de consola en Windows
        };

        // Si el comando no incluye ruta completa, podría estar en PATH
        // En ese caso, intentar con shell en Windows
        const isWin32 = typeof process !== 'undefined' && process.platform === 'win32';
        if (isWin32 && !command.includes('\\') && !command.includes('/')) {
          // Para comandos sin ruta en Windows, no usar shell pero confiar en PATH
          spawnOptions.shell = false;
        }

        const childProc = this.childProcess.spawn(command, args, spawnOptions);

        // Wrapper para hacer que el proceso sea consistente
        return {
          stdout: {
            on: (event: string, callback: (data: Buffer) => void) => {
              childProc.stdout?.on(event, callback);
            }
          },
          stderr: {
            on: (event: string, callback: (data: Buffer) => void) => {
              childProc.stderr?.on(event, callback);
            }
          },
          on(event: any, callback: any) {
            childProc.on(event, callback);
          },
          kill: (signal?: string) => {
            childProc.kill(signal || 'SIGTERM');
          }
        };
      } catch (error) {
        console.warn('Failed to spawn process in Electron:', error);
        return this.createMockProcess();
      }
    }

    // Mock mejorado para desarrollo web
    return this.createMockProcess();
  }

  private createMockProcess(): ElectronProcess {
    console.log('Using mock process for web development');
    
    const mockProcess = {
      stdout: { 
        on: (event: string, callback: (data: Buffer) => void) => {
          if (event === 'data') {
            setTimeout(() => {
              // Mock realistic yt-dlp output
              const mockData = JSON.stringify({
                title: "Sample Video Title",
                duration: 180,
                thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
                uploader: "Sample Channel",
                filesize_approx: 50000000,
                formats: [
                  { format_id: "137", ext: "mp4", height: 1080, filesize: 50000000 },
                  { format_id: "136", ext: "mp4", height: 720, filesize: 30000000 }
                ]
              });
              callback(Buffer.from(mockData + '\n'));
            }, 1000);
          }
        }
      },
      stderr: { 
        on: (event: string, callback: (data: Buffer) => void) => {
          // Mock stderr - sin errores por defecto
        }
      },
      on(event: any, callback: any) {
        if (event === 'close' || event === 'exit') {
          setTimeout(() => callback(0), 2000); // Exit successful
        } else if (event === 'error') {
          // Solo simular error si es necesario para testing
          // setTimeout(() => callback(new Error('Mock error')), 2500);
        }
      },
      kill: (signal?: string) => {
        console.log('Mock: Process killed with signal', signal);
      }
    };

    return mockProcess;
  }

  async checkYtDlp(): Promise<boolean> {
    if (!this.isElectron) {
      console.log('🌐 Web mode: yt-dlp check skipped');
      return true; // En web mode, simular que está disponible
    }

    try {
      const process = this.spawn('yt-dlp', ['--version']);
      
      return new Promise((resolve) => {
        let output = '';
        
        process.stdout.on('data', (data: Buffer) => {
          output += data.toString();
        });
        
        process.on('close', (code: number) => {
          if (code === 0 && output.trim()) {
            console.log('✅ yt-dlp version:', output.trim());
            resolve(true);
          } else {
            console.log('❌ yt-dlp not found or failed');
            resolve(false);
          }
        });
        
        process.on('error', () => {
          console.log('❌ yt-dlp command not found');
          resolve(false);
        });
        
        // Timeout después de 5 segundos
        setTimeout(() => {
          process.kill('SIGTERM');
          resolve(false);
        }, 5000);
      });
    } catch (error) {
      console.error('❌ Error checking yt-dlp:', error);
      return false;
    }
  }

  existsSync(path: string): boolean {
    if (!this.isElectron || !this.fs) {
      console.log('🌐 Web mode: existsSync mock');
      return true; // En web mode, simular que existe
    }
    
    try {
      return this.fs.existsSync(path);
    } catch (error) {
      console.error('Error checking path existence:', error);
      return false;
    }
  }

  mkdirSync(path: string, options?: any): void {
    if (!this.isElectron || !this.fs) {
      console.log('🌐 Web mode: mkdirSync mock');
      return;
    }
    
    try {
      this.fs.mkdirSync(path, options);
    } catch (error) {
      console.error('Error creating directory:', error);
      throw error;
    }
  }

  async openPath(path: string): Promise<void> {
    if (this.isElectron && this.shell) {
      try {
        await this.shell.openPath(path);
      } catch (error) {
        console.error('Error opening path:', error);
      }
    }
    // Mock para desarrollo
    console.log('Mock: Opening path', path);
  }

  /**
   * Obtener información del sistema
   */
  getSystemInfo() {
    if (this.isElectron) {
      try {
        const os = window.require('os');
        return {
          platform: os.platform(),
          arch: os.arch(),
          release: os.release(),
          homedir: os.homedir()
        };
      } catch (error) {
        console.error('Error getting system info:', error);
        return {
          platform: 'unknown',
          arch: 'unknown',
          release: 'unknown',
          homedir: '/unknown'
        };
      }
    }

    return {
      platform: 'web',
      arch: 'unknown',
      release: 'unknown',
      homedir: '/mock/home'
    };
  }

  /**
   * Obtener módulo fs de Node.js
   */
  getFs(): any {
    if (this.isElectron && this.fs) {
      return this.fs;
    }

    // Mock para desarrollo web
    console.warn('🌐 Web mode: fs module not available, returning mock');
    return {
      readdirSync: () => [],
      existsSync: () => true,
      readFileSync: () => Buffer.from(''),
      writeFileSync: () => {},
      unlinkSync: () => {},
      renameSync: () => {},
      statSync: () => ({ mtimeMs: 0 })
    };
  }

  /**
   * Obtener módulo path de Node.js
   */
  getPath(): any {
    if (this.isElectron) {
      try {
        const pathModule = window.require('path');
        return pathModule;
      } catch (e) {
        console.warn('⚠️ Failed to load path module:', e);
      }
    }

    // Mock básico para desarrollo web
    return {
      join: (...parts: string[]) => parts.join('/'),
      basename: (p: string) => p.split(/[/\\]/).pop() || '',
      dirname: (p: string) => p.split(/[/\\]/).slice(0, -1).join('/'),
      extname: (p: string) => {
        const base = p.split(/[/\\]/).pop() || '';
        const idx = base.lastIndexOf('.');
        return idx > 0 ? base.substring(idx) : '';
      }
    };
  }

  /**
   * Fetch imagen a través de Electron para evitar CORS
   * Devuelve una data URL (base64) de la imagen
   */
  async fetchImage(imageUrl: string): Promise<string | null> {
    if (!this.isElectron) {
      console.log('🌐 Web mode: fetchImage returning original URL');
      return imageUrl; // En web mode, devolver la URL original
    }

    try {
      const { ipcRenderer } = window.require('electron');
      const dataUrl = await ipcRenderer.invoke('fetch-image', imageUrl);
      return dataUrl;
    } catch (error) {
      console.error('❌ Error fetching image via Electron:', error);
      return null;
    }
  }

  async ensureYtDlpUpdated(): Promise<boolean> {
    if (!this.isElectron) {
      console.log('🌐 Web mode: yt-dlp update check skipped');
      return true;
    }

    try {
      console.log('🔄 Checking yt-dlp version and updating...');
      
      // First check if yt-dlp exists
      const checkProcess = this.spawn('yt-dlp', ['--version']);
      
      const versionResult = await new Promise<string>((resolve, reject) => {
        let output = '';
        
        checkProcess.stdout.on('data', (data: Buffer) => {
          output += data.toString();
        });
        
        checkProcess.on('close', (code: number) => {
          if (code === 0 && output.trim()) {
            resolve(output.trim());
          } else {
            reject(new Error('yt-dlp not found'));
          }
        });
        
        checkProcess.on('error', () => {
          reject(new Error('yt-dlp command not found'));
        });
        
        setTimeout(() => {
          checkProcess.kill('SIGTERM');
          reject(new Error('Timeout checking yt-dlp'));
        }, 10000);
      });

      console.log('✅ yt-dlp found, version:', versionResult);

      // Try to update yt-dlp (this might fail if installed via package manager)
      try {
        const updateProcess = this.spawn('yt-dlp', ['--update']);
        
        await new Promise<void>((resolve, reject) => {
          let updateOutput = '';
          
          updateProcess.stdout.on('data', (data: Buffer) => {
            updateOutput += data.toString();
          });
          
          updateProcess.on('close', (code: number) => {
            console.log('📦 yt-dlp update result:', updateOutput.trim() || 'No update needed');
            resolve(); // Don't fail if update doesn't work
          });
          
          updateProcess.on('error', () => {
            console.log('⚠️ yt-dlp update failed (this is normal if installed via package manager)');
            resolve();
          });
          
          setTimeout(() => {
            updateProcess.kill('SIGTERM');
            resolve();
          }, 30000);
        });
      } catch (updateError) {
        console.log('⚠️ yt-dlp update skipped:', updateError);
      }

      return true;
    } catch (error) {
      console.error('❌ yt-dlp check failed:', error);
      return false;
    }
  }

  /**
   * Obtener URL de streaming via IPC de Electron
   */
  async getStreamUrl(videoUrl: string): Promise<{ success: boolean; videoUrl?: string; audioUrl?: string; error?: string }> {
    if (!this.isElectron) {
      return { success: false, error: 'Not running in Electron' };
    }

    try {
      const { ipcRenderer } = window.require('electron');
      const result = await ipcRenderer.invoke('get-stream-url', videoUrl);
      return result;
    } catch (error) {
      console.error('Error getting stream URL:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Proxy de video stream para evitar CORS
   */
  async proxyVideoStream(streamUrl: string): Promise<{ success: boolean; dataUrl?: string; size?: number; error?: string }> {
    if (!this.isElectron) {
      return { success: false, error: 'Not running in Electron' };
    }

    try {
      const { ipcRenderer } = window.require('electron');
      const result = await ipcRenderer.invoke('proxy-video-stream', streamUrl);
      return result;
    } catch (error) {
      console.error('Error proxying video stream:', error);
      return { success: false, error: String(error) };
    }
  }
}

// Exportar instancia singleton
export const electronApi = new ElectronApiWrapper();

// Función helper para verificar compatibilidad
export const checkEnvironment = async () => {
  console.log('Environment check:');
  console.log('- Is Electron:', electronApi.isElectron);
  console.log('- System Info:', electronApi.getSystemInfo());
  
  if (electronApi.isElectron) {
    const ytDlpAvailable = await electronApi.checkYtDlp();
    console.log('- yt-dlp available:', ytDlpAvailable);
    
    if (!ytDlpAvailable) {
      console.warn('yt-dlp is not available. Downloads will not work.');
    }
  }
};