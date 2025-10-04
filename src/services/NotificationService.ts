export class NotificationService {
  private isElectron: boolean;
  private electronRemote: any;

  constructor() {
    // Detectar si estamos en Electron de forma más robusta
    this.isElectron = typeof window !== 'undefined' && 
                     window.require !== undefined &&
                     window.process &&
                     window.process.type === 'renderer';
    
    if (this.isElectron) {
      try {
        // Usar require de forma segura
        const { Notification } = window.require('electron');
        this.electronRemote = { Notification };
        console.log('Electron notifications initialized');
      } catch (e) {
        console.warn('Failed to initialize Electron notifications:', e);
        this.isElectron = false;
      }
    }
  }

  /**
   * 🔔 Mostrar notificación de descarga completada
   */
  showDownloadComplete(title: string, options?: {
    thumbnail?: string;
    duration?: string;
    folder?: string;
  }) {
    const notificationOptions = {
      title: '✅ Download Complete',
      body: `"${title}" has been downloaded successfully`,
      icon: options?.thumbnail || '/logo192.png',
      tag: 'download-complete',
      requireInteraction: false,
      silent: false
    };

    this.showNotification(notificationOptions, {
      onClick: () => {
        if (options?.folder) {
          this.openFolder(options.folder);
        }
      }
    });
  }

  /**
   * ❌ Mostrar notificación de descarga fallida
   */
  showDownloadError(title: string, error: string) {
    const notificationOptions = {
      title: '❌ Download Failed',
      body: `"${title}" failed to download: ${error}`,
      icon: '/logo192.png',
      tag: 'download-error',
      requireInteraction: true,
      silent: false
    };

    this.showNotification(notificationOptions);
  }

  /**
   * 🎬 Mostrar notificación de playlist completada
   */
  showPlaylistComplete(playlistTitle: string, completedCount: number, totalCount: number) {
    const notificationOptions = {
      title: '🎬 Playlist Download Complete',
      body: `"${playlistTitle}": ${completedCount}/${totalCount} videos downloaded`,
      icon: '/logo192.png',
      tag: 'playlist-complete',
      requireInteraction: false,
      silent: false
    };

    this.showNotification(notificationOptions);
  }

  /**
   * 🎉 Mostrar notificación de cola completada
   */
  showQueueComplete(totalCount: number) {
    const notificationOptions = {
      title: '🎉 All Downloads Complete',
      body: `Successfully downloaded ${totalCount} video${totalCount > 1 ? 's' : ''}`,
      icon: '/logo192.png',
      tag: 'queue-complete',
      requireInteraction: false,
      silent: false
    };

    this.showNotification(notificationOptions);
  }

  /**
   * ⬇️ Mostrar notificación de progreso para descargas largas
   */
  showDownloadProgress(title: string, progress: number) {
    // Solo mostrar cada 25% para evitar spam
    if (progress % 25 !== 0) return;

    const notificationOptions = {
      title: '⬇️ Download Progress',
      body: `"${title}" - ${progress}% complete`,
      icon: '/logo192.png',
      tag: `download-progress-${title}`,
      requireInteraction: false,
      silent: true
    };

    this.showNotification(notificationOptions);
  }

  /**
   * Mostrar notificación genérica con mejor manejo de errores
   */
  private showNotification(
    options: any, 
    handlers?: {
      onClick?: () => void;
      onAction?: (action: string) => void;
    }
  ) {
    try {
      if (this.isElectron && this.electronRemote?.Notification) {
        // Usar notificaciones nativas de Electron
        const notification = new this.electronRemote.Notification({
          title: options.title,
          body: options.body,
          icon: options.icon,
          silent: options.silent || false
        });

        if (handlers?.onClick) {
          notification.on('click', handlers.onClick);
        }

        notification.show();
        console.log('Electron notification shown:', options.title);

      } else if (this.isWebNotificationSupported()) {
        // Usar notificaciones web
        this.requestPermissionAndShow(options, handlers);

      } else {
        // Fallback: mostrar notificación in-app
        this.showInAppNotification(options);
      }
    } catch (error) {
      console.error('Failed to show notification:', error);
      // Fallback a notificación in-app
      this.showInAppNotification(options);
    }
  }

  /**
   * Verificar soporte para notificaciones web
   */
  private isWebNotificationSupported(): boolean {
    return 'Notification' in window;
  }

  /**
   * Solicitar permisos y mostrar notificación web
   */
  private async requestPermissionAndShow(options: any, handlers?: any) {
    try {
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          this.showInAppNotification(options);
          return;
        }
      }

      if (Notification.permission === 'granted') {
        const notification = new Notification(options.title, {
          body: options.body,
          icon: options.icon,
          tag: options.tag,
          requireInteraction: options.requireInteraction,
          silent: options.silent
        });

        if (handlers?.onClick) {
          notification.onclick = handlers.onClick;
        }

        // Auto-cerrar después de 5 segundos
        setTimeout(() => notification.close(), 5000);
      } else {
        this.showInAppNotification(options);
      }
    } catch (error) {
      console.error('Web notification error:', error);
      this.showInAppNotification(options);
    }
  }

  /**
   * Mostrar notificación dentro de la app (fallback)
   */
  private showInAppNotification(options: any) {
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 z-50 max-w-sm bg-gray-800 border border-gray-600 rounded-lg shadow-2xl p-4 transform transition-all duration-300';
    
    const iconMap: { [key: string]: string } = {
      '✅': 'text-green-400',
      '❌': 'text-red-400',
      '🎬': 'text-purple-400',
      '🎉': 'text-yellow-400',
      '⬇️': 'text-blue-400'
    };

    const iconClass = iconMap[options.title.charAt(0)] || 'text-gray-400';
    
    notification.innerHTML = `
      <div class="flex items-start space-x-3">
        <div class="flex-shrink-0">
          <div class="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
            <span class="${iconClass} text-lg">${options.title.charAt(0)}</span>
          </div>
        </div>
        <div class="flex-1 min-w-0">
          <div class="text-white font-medium text-sm">${options.title.substring(2)}</div>
          <div class="text-gray-300 text-xs mt-1 break-words">${options.body}</div>
        </div>
        <button onclick="this.parentElement.parentElement.remove()" 
                class="flex-shrink-0 text-gray-400 hover:text-white transition-colors">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
          </svg>
        </button>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // Animación de entrada
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Auto-remover después de 5 segundos
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 5000);
  }

  /**
   * Abrir carpeta en el explorador
   */
  private openFolder(folderPath: string) {
    if (this.isElectron) {
      try {
        const { shell } = window.require('electron');
        shell.openPath(folderPath);
      } catch (error) {
        console.error('Failed to open folder:', error);
      }
    } else {
      console.log('Open folder:', folderPath);
    }
  }

  /**
   * Verificar si las notificaciones están habilitadas
   */
  areNotificationsEnabled(): boolean {
    if (this.isElectron && this.electronRemote?.Notification) {
      return true;
    }
    return this.isWebNotificationSupported() && Notification.permission === 'granted';
  }

  /**
   * Mostrar notificación de actualización disponible
   */
  showUpdateAvailable(version: string) {
    const notificationOptions = {
      title: '🔄 Update Available',
      body: `YouTube Downloader v${version} is available for download`,
      icon: '/logo192.png',
      tag: 'update-available',
      requireInteraction: true
    };

    this.showNotification(notificationOptions);
  }
}

// Instancia singleton
export const notificationService = new NotificationService();