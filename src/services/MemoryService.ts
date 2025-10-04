import { MemoryStats as BaseMemoryStats } from '../types';

interface MemoryConfig {
  maxConcurrentDownloads: number;
  maxCacheSize: number; // MB
  maxHistoryItems: number;
  enableGarbageCollection: boolean;
  monitoringInterval: number; // ms
  warningThreshold: number; // MB
  criticalThreshold: number; // MB
}

// Extender la interfaz base para incluir propiedades específicas del servicio
interface MemoryStats extends BaseMemoryStats {
  // Ya incluye lastMeasurement: number de la interfaz base
}

interface ProcessInfo {
  id: string;
  type: 'download' | 'info' | 'cache';
  startTime: number;
  memoryUsage: number;
  status: 'running' | 'completed' | 'error';
}

export class MemoryService {
  private config: MemoryConfig = {
    maxConcurrentDownloads: 3,
    maxCacheSize: 100, // 100 MB
    maxHistoryItems: 1000,
    enableGarbageCollection: true,
    monitoringInterval: 5000, // 5 seconds
    warningThreshold: 512, // 512 MB
    criticalThreshold: 1024 // 1 GB
  };

  private stats: MemoryStats = {
    used: 0,
    available: 0,
    total: 0,
    percentage: 0,
    cacheSize: 0,
    historySize: 0,
    activeProcesses: 0,
    status: 'normal',
    lastMeasurement: Date.now() // ✅ Ahora incluido correctamente
  };

  private processes = new Map<string, ProcessInfo>();
  private monitoringInterval: NodeJS.Timeout | null = null;
  private lastGC = Date.now();

  constructor() {
    this.loadMemorySettings();
    this.startMonitoring();
    this.setupMemoryListeners();
  }

  /**
   * Iniciar monitoreo de memoria
   */
  private startMonitoring(): void {
    if (this.monitoringInterval) return;

    this.monitoringInterval = setInterval(() => {
      this.updateMemoryStats();
    }, this.config.monitoringInterval);

    console.log('Memory monitoring started');
  }

  /**
   * Parar monitoreo de memoria
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Actualizar estadísticas de memoria
   */
  private updateMemoryStats(): void {
    try {
      // Estimar uso de memoria
      this.stats.used = this.estimateMemoryUsage();
      this.stats.available = Math.max(0, this.config.criticalThreshold - this.stats.used);
      this.stats.total = this.config.criticalThreshold;
      this.stats.percentage = Math.min(100, (this.stats.used / this.stats.total) * 100);

      this.stats.activeProcesses = this.processes.size;
      this.stats.lastMeasurement = Date.now(); // ✅ Funciona correctamente ahora

      this.calculateCacheSize();
      this.calculateHistorySize();
      this.updateMemoryStatus();
      this.checkMemoryPressure();
    } catch (error) {
      console.error('Error updating memory stats:', error);
    }
  }

  /**
   * Estimar uso de memoria
   */
  private estimateMemoryUsage(): number {
    let estimate = 50; // Base de 50MB para la aplicación
    
    // Estimar por procesos activos
    estimate += this.processes.size * 5; // 5MB por proceso
    
    // Estimar por cache
    estimate += this.stats.cacheSize;
    
    // Estimar por historial
    estimate += this.stats.historySize;
    
    return Math.round(estimate);
  }

  /**
   * Calcular tamaño del cache
   */
  private calculateCacheSize(): void {
    try {
      // Estimar tamaño del cache en localStorage
      let totalSize = 0;
      for (const key in localStorage) {
        if (key.startsWith('youtube-downloader-cache') || key.startsWith('video-cache')) {
          totalSize += localStorage.getItem(key)?.length || 0;
        }
      }
      
      // Convertir a MB (aproximado)
      this.stats.cacheSize = Math.round(totalSize / 1024 / 1024 * 100) / 100;
    } catch (error) {
      console.warn('Could not calculate cache size:', error);
      this.stats.cacheSize = 0;
    }
  }

  /**
   * Calcular tamaño del historial
   */
  private calculateHistorySize(): void {
    try {
      const historyData = localStorage.getItem('youtube-downloader-store');
      if (historyData) {
        // Estimar tamaño en MB
        this.stats.historySize = Math.round(historyData.length / 1024 / 1024 * 100) / 100;
      } else {
        this.stats.historySize = 0;
      }
    } catch (error) {
      console.warn('Could not calculate history size:', error);
      this.stats.historySize = 0;
    }
  }

  /**
   * Actualizar estado de memoria
   */
  private updateMemoryStatus(): void {
    if (this.stats.used >= this.config.criticalThreshold) {
      this.stats.status = 'critical';
    } else if (this.stats.used >= this.config.warningThreshold) {
      this.stats.status = 'warning';
    } else {
      this.stats.status = 'normal';
    }
  }

  /**
   * Verificar presión de memoria
   */
  private checkMemoryPressure(): void {
    if (this.stats.status === 'critical') {
      this.performEmergencyCleanup();
      this.notifyMemoryPressure('critical');
    } else if (this.stats.status === 'warning') {
      this.performPreventiveCleanup();
      this.notifyMemoryPressure('warning');
    }
  }

  /**
   * Notificar presión de memoria
   */
  private notifyMemoryPressure(level: 'warning' | 'critical'): void {
    const message = level === 'critical' 
      ? `Critical memory usage: ${this.stats.used}MB. Some downloads may be paused.`
      : `High memory usage: ${this.stats.used}MB. Consider reducing concurrent downloads.`;
      
    // Crear notificación personalizada más robusta
    this.createMemoryNotification(message, level);

    // Enviar eventos para otros componentes
    window.dispatchEvent(new CustomEvent(`memory-pressure-${level}`, {
      detail: { usage: this.stats.used, percentage: this.stats.percentage }
    }));
  }

  /**
   * Crear notificación de memoria más robusta
   */
  private createMemoryNotification(message: string, level: 'warning' | 'critical'): void {
    try {
      const notification = document.createElement('div');
      notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm ${
        level === 'critical' ? 'bg-red-600' : 'bg-yellow-600'
      } text-white border-l-4 ${
        level === 'critical' ? 'border-red-400' : 'border-yellow-400'
      }`;
      
      notification.innerHTML = `
        <div class="flex items-center space-x-2">
          <div class="flex-shrink-0">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
            </svg>
          </div>
          <div class="flex-1">
            <div class="text-sm font-medium">${level === 'critical' ? 'Critical' : 'Warning'}: Memory Usage</div>
            <div class="text-xs mt-1">${message}</div>
          </div>
          <button onclick="this.parentElement.parentElement.remove()" class="flex-shrink-0 text-white/80 hover:text-white">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
            </svg>
          </button>
        </div>
      `;
      
      document.body.appendChild(notification);
      
      // Auto-remover después de 10 segundos
      setTimeout(() => {
        if (notification.parentNode) {
          notification.style.transform = 'translateX(100%)';
          setTimeout(() => notification.remove(), 300);
        }
      }, 10000);

    } catch (error) {
      console.error('Failed to create memory notification:', error);
    }
  }

  /**
   * Resto de métodos sin cambios...
   */
  
  private performAutomaticCleanup(): void {
    if (this.config.enableGarbageCollection && Date.now() - this.lastGC > 60000) {
      this.performGarbageCollection();
    }
  }

  private performPreventiveCleanup(): void {
    console.log('Performing preventive memory cleanup...');
    this.cleanupOldCache();
    this.cleanupCompletedProcesses();
    this.performAutomaticCleanup();
  }

  private performEmergencyCleanup(): void {
    console.log('Performing emergency memory cleanup...');
    this.clearAllCache();
    this.trimHistory(100);
    this.adjustConcurrentDownloads();
    this.pauseNonCriticalDownloads();
    this.performGarbageCollection();
  }

  private cleanupOldCache(): void {
    try {
      const cutoffTime = Date.now() - (60 * 60 * 1000);
      
      for (const key in localStorage) {
        if (key.includes('cache-')) {
          try {
            const data = JSON.parse(localStorage.getItem(key) || '{}');
            if (data.timestamp && data.timestamp < cutoffTime) {
              localStorage.removeItem(key);
            }
          } catch (e) {
            localStorage.removeItem(key);
          }
        }
      }
    } catch (error) {
      console.warn('Error cleaning old cache:', error);
    }
  }

  private trimHistory(maxItems?: number): void {
    try {
      const storeData = localStorage.getItem('youtube-downloader-store');
      if (storeData) {
        const parsed = JSON.parse(storeData);
        if (parsed.state?.history && Array.isArray(parsed.state.history)) {
          const maxHistoryItems = maxItems || this.config.maxHistoryItems;
          if (parsed.state.history.length > maxHistoryItems) {
            parsed.state.history = parsed.state.history.slice(0, maxHistoryItems);
            localStorage.setItem('youtube-downloader-store', JSON.stringify(parsed));
            console.log(`Trimmed history to ${maxHistoryItems} items`);
          }
        }
      }
    } catch (error) {
      console.warn('Error trimming history:', error);
    }
  }

  private adjustConcurrentDownloads(): void {
    if (this.stats.status === 'critical') {
      window.dispatchEvent(new CustomEvent('memory-pressure-adjust', {
        detail: { maxConcurrent: 1 }
      }));
    } else if (this.stats.status === 'warning') {
      window.dispatchEvent(new CustomEvent('memory-pressure-adjust', {
        detail: { maxConcurrent: 2 }
      }));
    }
  }

  private pauseNonCriticalDownloads(): void {
    window.dispatchEvent(new CustomEvent('memory-emergency-pause'));
  }

  private clearAllCache(): void {
    try {
      for (const key in localStorage) {
        if (key.includes('cache') || key.includes('video-info')) {
          localStorage.removeItem(key);
        }
      }
      window.dispatchEvent(new CustomEvent('clear-all-cache'));
      console.log('All cache cleared due to memory pressure');
    } catch (error) {
      console.warn('Error clearing cache:', error);
    }
  }

  private cleanupCompletedProcesses(): void {
    for (const [id, process] of this.processes.entries()) {
      if (process.status === 'completed' || process.status === 'error') {
        if (Date.now() - process.startTime > 5 * 60 * 1000) {
          this.processes.delete(id);
        }
      }
    }
  }

  private performGarbageCollection(): void {
    if (typeof window !== 'undefined' && 'gc' in window) {
      try {
        (window as any).gc();
        this.lastGC = Date.now();
        console.log('Manual garbage collection performed');
      } catch (e) {
        console.warn('Manual GC not available');
      }
    }
    
    window.dispatchEvent(new CustomEvent('manual-gc'));
  }

  private setupMemoryListeners(): void {
    window.addEventListener('memory-pressure-adjust', (event: any) => {
      if (event.detail?.maxConcurrent) {
        this.config.maxConcurrentDownloads = event.detail.maxConcurrent;
        console.log(`Adjusted max concurrent downloads to ${event.detail.maxConcurrent}`);
      }
    });

    window.addEventListener('memory-emergency-pause', () => {
      console.log('Emergency pause triggered by memory pressure');
    });

    window.addEventListener('clear-all-cache', () => {
      this.clearAllCache();
    });

    window.addEventListener('manual-gc', () => {
      this.performGarbageCollection();
    });
  }

  // Métodos públicos
  registerProcess(id: string, type: ProcessInfo['type']): void {
    this.processes.set(id, {
      id,
      type,
      startTime: Date.now(),
      memoryUsage: 0,
      status: 'running'
    });
  }

  updateProcessStatus(id: string, status: ProcessInfo['status'], memoryUsage?: number): void {
    const process = this.processes.get(id);
    if (process) {
      process.status = status;
      if (memoryUsage !== undefined) {
        process.memoryUsage = memoryUsage;
      }
    }
  }

  getStats(): MemoryStats {
    return { ...this.stats };
  }

  getConfig(): MemoryConfig {
    return { ...this.config };
  }

  updateConfig(newConfig: Partial<MemoryConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.saveMemorySettings();
    
    if (newConfig.monitoringInterval) {
      this.stopMonitoring();
      this.startMonitoring();
    }
  }

  getOptimizationSuggestions(): string[] {
    const suggestions: string[] = [];
    
    if (this.stats.cacheSize > 20) {
      suggestions.push('Clear video info cache to free up memory');
    }
    
    if (this.stats.historySize > 10) {
      suggestions.push('Reduce download history to save memory');
    }
    
    if (this.processes.size > 10) {
      suggestions.push('Too many active processes - consider reducing concurrent downloads');
    }
    
    if (this.stats.percentage > 80) {
      suggestions.push('Memory usage is high - enable automatic cleanup');
    }
    
    return suggestions;
  }

  private loadMemorySettings(): void {
    try {
      const saved = localStorage.getItem('memory-service-config');
      if (saved) {
        const config = JSON.parse(saved);
        this.config = { ...this.config, ...config };
      }
    } catch (error) {
      console.warn('Could not load memory settings:', error);
    }
  }

  private saveMemorySettings(): void {
    try {
      localStorage.setItem('memory-service-config', JSON.stringify(this.config));
    } catch (error) {
      console.warn('Could not save memory settings:', error);
    }
  }

  formatMemorySize(sizeInMB: number): string {
    if (sizeInMB >= 1024) {
      return `${(sizeInMB / 1024).toFixed(2)} GB`;
    }
    return `${sizeInMB.toFixed(2)} MB`;
  }

  getHealthStatus(): {
    status: 'healthy' | 'warning' | 'critical';
    score: number;
    issues: string[];
  } {
    const issues: string[] = [];
    let score = 100;

    if (this.stats.percentage > 90) {
      issues.push('Memory usage critically high');
      score -= 40;
    } else if (this.stats.percentage > 70) {
      issues.push('Memory usage is high');
      score -= 20;
    }

    if (this.stats.cacheSize > 50) {
      issues.push('Video cache is very large');
      score -= 15;
    }

    if (this.processes.size > 8) {
      issues.push('Too many active processes');
      score -= 10;
    }

    if (this.stats.historySize > 20) {
      issues.push('Download history is consuming significant memory');
      score -= 10;
    }

    const status = score >= 80 ? 'healthy' : score >= 60 ? 'warning' : 'critical';

    return {
      status,
      score: Math.max(0, score),
      issues
    };
  }
}

// Instancia singleton
export const memoryService = new MemoryService();