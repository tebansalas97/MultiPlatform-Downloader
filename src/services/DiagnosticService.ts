/**
 * Servicio de diagnóstico y logging para plataformas
 * Permite rastrear y diagnosticar problemas por plataforma
 */

import { PlatformType, PlatformLog, PlatformStats } from '../types/platforms';

class DiagnosticService {
  private logs: PlatformLog[] = [];
  private stats: Map<PlatformType, PlatformStats> = new Map();
  private maxLogs = 1000; // Límite de logs en memoria
  private isEnabled = true;

  constructor() {
    this.initializeStats();

    // Hacer disponible globalmente para BasePlatform
    if (typeof window !== 'undefined') {
      (window as any).__diagnosticService = this;
    }
  }

  /**
   * Inicializar estadísticas para todas las plataformas
   */
  private initializeStats(): void {
    const platforms: PlatformType[] = ['youtube', 'tiktok', 'twitter', 'reddit', 'twitch'];

    platforms.forEach(platform => {
      this.stats.set(platform, {
        totalDownloads: 0,
        successfulDownloads: 0,
        failedDownloads: 0,
        totalErrors: 0,
        lastUsed: 0,
        averageDownloadTime: 0
      });
    });
  }

  /**
   * Registrar un log
   */
  log(
    platform: PlatformType,
    level: 'info' | 'warn' | 'error' | 'debug',
    message: string,
    metadata?: Record<string, any>
  ): void {
    if (!this.isEnabled) return;

    const log: PlatformLog = {
      id: this.generateLogId(),
      platform,
      timestamp: Date.now(),
      level,
      message,
      metadata
    };

    this.logs.push(log);

    // Actualizar estadísticas
    if (level === 'error') {
      this.incrementErrorCount(platform);
    }

    // Mantener límite de logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Log visual mejorado en consola
    this.consoleLog(log);
  }

  /**
   * Log visual mejorado en consola
   */
  private consoleLog(log: PlatformLog): void {
    const icon = this.getPlatformIcon(log.platform);
    const emoji = this.getLevelEmoji(log.level);
    const timestamp = new Date(log.timestamp).toLocaleTimeString();

    const style = this.getConsoleStyle(log.level);
    const message = `${emoji} ${icon} [${log.platform}] ${timestamp}: ${log.message}`;

    if (log.metadata) {
      console.log(`%c${message}`, style, log.metadata);
    } else {
      console.log(`%c${message}`, style);
    }
  }

  /**
   * Obtener estilo de consola según nivel
   */
  private getConsoleStyle(level: string): string {
    const styles = {
      info: 'color: #3b82f6; font-weight: normal',
      warn: 'color: #f59e0b; font-weight: bold',
      error: 'color: #ef4444; font-weight: bold',
      debug: 'color: #6b7280; font-weight: normal'
    };
    return styles[level as keyof typeof styles] || styles.info;
  }

  /**
   * Obtener emoji según nivel
   */
  private getLevelEmoji(level: string): string {
    const emojis = {
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌',
      debug: '🔍'
    };
    return emojis[level as keyof typeof emojis] || 'ℹ️';
  }

  /**
   * Obtener icono de plataforma
   */
  private getPlatformIcon(platform: PlatformType): string {
    const icons: Record<PlatformType, string> = {
      youtube: '🎬',
      tiktok: '🎵',
      twitter: '🐦',
      reddit: '🤖',
      twitch: '🎮',
      facebook: '📘',
      instagram: '📸'
    };
    return icons[platform] || '📹';
  }

  /**
   * Generar ID único para log
   */
  private generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Registrar inicio de descarga
   */
  recordDownloadStart(platform: PlatformType, jobId: string): void {
    this.log(platform, 'info', `Download started`, { jobId });
    this.updateLastUsed(platform);
  }

  /**
   * Registrar éxito de descarga
   */
  recordDownloadSuccess(platform: PlatformType, jobId: string, duration: number): void {
    this.log(platform, 'info', `Download completed successfully`, { jobId, duration });

    const stats = this.stats.get(platform);
    if (stats) {
      stats.totalDownloads++;
      stats.successfulDownloads++;
      stats.averageDownloadTime =
        (stats.averageDownloadTime * (stats.successfulDownloads - 1) + duration) /
        stats.successfulDownloads;
      this.stats.set(platform, stats);
    }
  }

  /**
   * Registrar fallo de descarga
   */
  recordDownloadFailure(platform: PlatformType, jobId: string, error: string): void {
    this.log(platform, 'error', `Download failed: ${error}`, { jobId, error });

    const stats = this.stats.get(platform);
    if (stats) {
      stats.totalDownloads++;
      stats.failedDownloads++;
      this.stats.set(platform, stats);
    }
  }

  /**
   * Incrementar contador de errores
   */
  private incrementErrorCount(platform: PlatformType): void {
    const stats = this.stats.get(platform);
    if (stats) {
      stats.totalErrors++;
      this.stats.set(platform, stats);
    }
  }

  /**
   * Actualizar último uso
   */
  private updateLastUsed(platform: PlatformType): void {
    const stats = this.stats.get(platform);
    if (stats) {
      stats.lastUsed = Date.now();
      this.stats.set(platform, stats);
    }
  }

  /**
   * Obtener logs de una plataforma específica
   */
  getLogsByPlatform(platform: PlatformType): PlatformLog[] {
    return this.logs.filter(log => log.platform === platform);
  }

  /**
   * Obtener logs por nivel
   */
  getLogsByLevel(level: 'info' | 'warn' | 'error' | 'debug'): PlatformLog[] {
    return this.logs.filter(log => log.level === level);
  }

  /**
   * Obtener logs recientes
   */
  getRecentLogs(count: number = 50): PlatformLog[] {
    return this.logs.slice(-count);
  }

  /**
   * Obtener todos los logs
   */
  getAllLogs(): PlatformLog[] {
    return [...this.logs];
  }

  /**
   * Obtener estadísticas de una plataforma
   */
  getStats(platform: PlatformType): PlatformStats | null {
    return this.stats.get(platform) || null;
  }

  /**
   * Obtener estadísticas de todas las plataformas
   */
  getAllStats(): Map<PlatformType, PlatformStats> {
    return new Map(this.stats);
  }

  /**
   * Obtener resumen de estadísticas
   */
  getStatsSummary(): {
    totalDownloads: number;
    successRate: number;
    errorRate: number;
    mostUsedPlatform: PlatformType | null;
  } {
    let totalDownloads = 0;
    let successfulDownloads = 0;
    let totalErrors = 0;
    let mostUsedPlatform: PlatformType | null = null;
    let maxDownloads = 0;

    this.stats.forEach((stats, platform) => {
      totalDownloads += stats.totalDownloads;
      successfulDownloads += stats.successfulDownloads;
      totalErrors += stats.totalErrors;

      if (stats.totalDownloads > maxDownloads) {
        maxDownloads = stats.totalDownloads;
        mostUsedPlatform = platform;
      }
    });

    return {
      totalDownloads,
      successRate: totalDownloads > 0 ? (successfulDownloads / totalDownloads) * 100 : 0,
      errorRate: totalDownloads > 0 ? (totalErrors / totalDownloads) * 100 : 0,
      mostUsedPlatform
    };
  }

  /**
   * Exportar diagnóstico completo
   */
  exportDiagnostics(): string {
    const summary = this.getStatsSummary();

    const diagnosticData = {
      exportDate: new Date().toISOString(),
      summary,
      stats: Object.fromEntries(this.stats),
      recentLogs: this.getRecentLogs(100),
      errors: this.getLogsByLevel('error')
    };

    return JSON.stringify(diagnosticData, null, 2);
  }

  /**
   * Descargar diagnóstico como archivo
   */
  downloadDiagnostics(): void {
    const data = this.exportDiagnostics();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `diagnostic_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Limpiar logs
   */
  clearLogs(): void {
    this.logs = [];
    this.log('youtube', 'info', 'Diagnostic logs cleared');
  }

  /**
   * Limpiar estadísticas
   */
  clearStats(): void {
    this.initializeStats();
    this.log('youtube', 'info', 'Statistics reset');
  }

  /**
   * Habilitar/deshabilitar diagnóstico
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Verificar si está habilitado
   */
  getIsEnabled(): boolean {
    return this.isEnabled;
  }
}

// Singleton
export const diagnosticService = new DiagnosticService();
