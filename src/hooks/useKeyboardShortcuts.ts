import { useEffect } from 'react';
import { useDownloadStore } from '../stores/downloadStore';
import { downloadService } from '../services/DownloadService';
import { bandwidthService } from '../services/BandwidthService';

interface KeyboardShortcuts {
  onPasteUrl?: (url: string) => void;
  onClearQueue?: () => void;
  onToggleSettings?: () => void;
}

export function useKeyboardShortcuts(callbacks?: KeyboardShortcuts) {
  const { setActiveView, clearQueue, jobs } = useDownloadStore();

  useEffect(() => {
    // Declarar showToast al inicio
    const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info') => {
      const toast = document.createElement('div');
      toast.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm transform transition-all duration-300 ${
        type === 'success' ? 'bg-green-600 text-white' :
        type === 'error' ? 'bg-red-600 text-white' :
        type === 'warning' ? 'bg-yellow-600 text-white' :
        'bg-blue-600 text-white'
      }`;
      
      toast.innerHTML = `
        <div class="flex items-center space-x-2">
          <span class="text-sm font-medium">${message}</span>
          <button onclick="this.parentElement.parentElement.remove()" class="ml-2 text-white/80 hover:text-white">×</button>
        </div>
      `;
      
      document.body.appendChild(toast);
      setTimeout(() => {
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
      }, 3000);
    };

    const handleKeydown = async (event: KeyboardEvent) => {
      // Verificar si está escribiendo en un input
      const isInputActive = (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        (event.target as HTMLElement)?.isContentEditable
      );

      // Ctrl/Cmd + V - Pegar URL desde clipboard
      if ((event.ctrlKey || event.metaKey) && event.key === 'v' && !isInputActive) {
        event.preventDefault();
        try {
          const clipboardText = await navigator.clipboard.readText();
          if (clipboardText && isYouTubeUrl(clipboardText)) {
            callbacks?.onPasteUrl?.(clipboardText);
          }
        } catch (error) {
          console.log('Clipboard access denied or empty');
        }
      }

      // Ctrl/Cmd + Shift + C - Limpiar cola
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'C') {
        event.preventDefault();
        if (jobs.length > 0) {
          callbacks?.onClearQueue?.();
        }
      }

      // Ctrl/Cmd + , - Abrir configuraciones
      if ((event.ctrlKey || event.metaKey) && event.key === ',') {
        event.preventDefault();
        setActiveView('settings');
        callbacks?.onToggleSettings?.();
      }

      // Ctrl/Cmd + 1,2,3 - Cambiar vistas
      if ((event.ctrlKey || event.metaKey) && ['1', '2', '3'].includes(event.key)) {
        event.preventDefault();
        const views = ['download', 'history', 'settings'] as const;
        const index = parseInt(event.key) - 1;
        if (views[index]) {
          setActiveView(views[index]);
        }
      }

      // F5 - Refresh/Restart downloads
      if (event.key === 'F5' && !isInputActive) {
        event.preventDefault();
        downloadService.processQueue();
      }

      // Escape - Cerrar modales o cancel downloads
      if (event.key === 'Escape') {
        event.preventDefault();
        const activeDownloads = downloadService.getActiveDownloads();
        activeDownloads.forEach(jobId => {
          downloadService.cancelDownload(jobId);
        });
      }

      // Ctrl/Cmd + A - Seleccionar todo en playlist preview
      if ((event.ctrlKey || event.metaKey) && event.key === 'a' && !isInputActive) {
        const playlistPreview = document.querySelector('[data-playlist-preview]');
        if (playlistPreview) {
          event.preventDefault();
          window.dispatchEvent(new CustomEvent('playlist-select-all'));
        }
      }

      // Ctrl/Cmd + Enter - Forzar inicio de descarga
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        downloadService.processQueue();
      }

      // Ctrl/Cmd + D - Duplicar última descarga
      if ((event.ctrlKey || event.metaKey) && event.key === 'd' && !isInputActive) {
        event.preventDefault();
        const lastJob = jobs[jobs.length - 1];
        if (lastJob) {
          window.dispatchEvent(new CustomEvent('duplicate-download', {
            detail: lastJob
          }));
        }
      }

      // Alt + Enter - Previsualizar video antes de descargar
      if (event.altKey && event.key === 'Enter' && !isInputActive) {
        event.preventDefault();
        window.dispatchEvent(new CustomEvent('preview-video'));
      }

      // 📸 Ctrl/Cmd + Shift + S - Screenshot/Info de video actual
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'S') {
        event.preventDefault();
        window.dispatchEvent(new CustomEvent('capture-video-info'));
      }

      // Agregar nuevos shortcuts:
      // Alt + S - Toggle QuickSettings
      if (event.altKey && event.key === 's' && !isInputActive) {
        event.preventDefault();
        window.dispatchEvent(new CustomEvent('toggle-quick-settings'));
      }

      // Alt + 1,2,3,4,5 - Speed presets rápidos
      if (event.altKey && ['1', '2', '3', '4', '5'].includes(event.key) && !isInputActive) {
        event.preventDefault();
        const presets = [0, 5000, 2000, 1000, 500]; // Unlimited, 5MB/s, 2MB/s, 1MB/s, 500KB/s
        const index = parseInt(event.key) - 1;
        if (presets[index] !== undefined) {
          bandwidthService.setSpeedLimit(presets[index]);
          showToast(`Speed limit: ${bandwidthService.formatSpeed(presets[index])}`, 'info');
        }
      }

      // Ctrl/Cmd + B - Toggle bandwidth limiting
      if ((event.ctrlKey || event.metaKey) && event.key === 'b' && !isInputActive) {
        event.preventDefault();
        const stats = bandwidthService.getStats();
        if (stats.limitActive) {
          bandwidthService.setSpeedLimit(0); // Remove limit
          showToast('Speed limit removed', 'info');
        } else {
          bandwidthService.setSpeedLimit(1000); // Set to 1MB/s
          showToast('Speed limit set to 1 MB/s', 'info');
        }
      }
    };

    // Agregar listener
    document.addEventListener('keydown', handleKeydown);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeydown);
    };
  }, [setActiveView, clearQueue, jobs, callbacks]);

  // Función helper para validar URLs de YouTube
  const isYouTubeUrl = (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.includes('youtube.com') || 
             urlObj.hostname.includes('youtu.be') ||
             urlObj.hostname.includes('music.youtube.com');
    } catch {
      return false;
    }
  };
}