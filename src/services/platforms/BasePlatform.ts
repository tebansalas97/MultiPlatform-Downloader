/**
 * Clase abstracta base para todas las plataformas
 * Define la interfaz común que todas las plataformas deben implementar
 */

import { DownloadJob, VideoInfo, PlaylistInfo } from '../../types';
import {
  PlatformType,
  PlatformConfig,
  PlatformCapabilities,
  URLValidationResult,
  PlatformVideoInfo,
  PlatformPlaylistInfo
} from '../../types/platforms';

export abstract class BasePlatform {
  /**
   * Tipo de plataforma
   */
  abstract readonly type: PlatformType;

  /**
   * Configuración de la plataforma
   */
  abstract readonly config: PlatformConfig;

  /**
   * Patrones de URL que esta plataforma puede manejar
   */
  abstract readonly urlPatterns: RegExp[];

  /**
   * Capacidades de la plataforma
   */
  abstract readonly capabilities: PlatformCapabilities;

  /**
   * Validar si una URL pertenece a esta plataforma
   */
  isValidUrl(url: string): boolean {
    try {
      return this.urlPatterns.some(pattern => pattern.test(url));
    } catch (error) {
      this.log('error', `Error validating URL: ${error}`, { url });
      return false;
    }
  }

  /**
   * Validación detallada de URL
   */
  abstract validateUrl(url: string): URLValidationResult;

  /**
   * Detectar si es una URL de playlist
   */
  abstract isPlaylistUrl(url: string): boolean;

  /**
   * Detectar si es un stream en vivo
   */
  abstract isLiveStream(url: string): boolean;

  /**
   * Obtener información de un video
   */
  abstract getVideoInfo(url: string): Promise<PlatformVideoInfo>;

  /**
   * Obtener información de una playlist
   */
  abstract getPlaylistInfo(url: string): Promise<PlatformPlaylistInfo>;

  /**
   * Construir argumentos para yt-dlp
   */
  abstract buildDownloadArgs(job: DownloadJob, ffmpegPath?: string): string[];

  /**
   * Construir thumbnail URL si no está disponible
   */
  abstract buildThumbnailUrl(videoId: string): string;

  /**
   * Extraer ID del video desde la URL
   */
  abstract extractVideoId(url: string): string | null;

  /**
   * Logging con contexto de plataforma
   */
  protected log(
    level: 'info' | 'warn' | 'error' | 'debug',
    message: string,
    metadata?: Record<string, any>
  ): void {
    const prefix = `[${this.config.displayName}]`;
    const logMessage = `${prefix} ${message}`;

    switch (level) {
      case 'error':
        console.error(logMessage, metadata || '');
        break;
      case 'warn':
        console.warn(logMessage, metadata || '');
        break;
      case 'debug':
        console.debug(logMessage, metadata || '');
        break;
      default:
        console.log(logMessage, metadata || '');
    }

    // Aquí se integrará con DiagnosticService
    if (typeof window !== 'undefined' && (window as any).__diagnosticService) {
      (window as any).__diagnosticService.log(this.type, level, message, metadata);
    }
  }

  /**
   * Manejar errores de forma consistente
   */
  protected handleError(error: unknown, context: string): Error {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const enhancedError = new Error(`${context}: ${errorMessage}`);

    this.log('error', enhancedError.message, {
      originalError: error,
      context
    });

    return enhancedError;
  }

  /**
   * Formatear duración en segundos a string legible
   */
  protected formatDuration(seconds: number | undefined): string {
    if (!seconds || isNaN(seconds)) return 'Unknown';

    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  /**
   * Formatear tamaño de archivo
   */
  protected formatFileSize(bytes: number | undefined): string {
    if (!bytes || isNaN(bytes)) return 'Unknown';

    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  }

  /**
   * Normalizar URL (remover tracking params, etc.)
   */
  protected normalizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      // Mantener solo parámetros esenciales
      return urlObj.href;
    } catch {
      return url;
    }
  }

  /**
   * Obtener configuración de la plataforma
   */
  getConfig(): PlatformConfig {
    return { ...this.config };
  }

  /**
   * Obtener capacidades de la plataforma
   */
  getCapabilities(): PlatformCapabilities {
    return { ...this.capabilities };
  }

  /**
   * Verificar si la plataforma está habilitada
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Obtener nombre para mostrar
   */
  getDisplayName(): string {
    return this.config.displayName;
  }

  /**
   * Obtener icono
   */
  getIcon(): string {
    return this.config.icon;
  }

  /**
   * Obtener color
   */
  getColor(): string {
    return this.config.color;
  }

  /**
   * Parsear calidad de video de forma segura
   * Retorna null si la calidad no es válida o es 'best'
   */
  protected parseQualityHeight(quality: string | undefined): number | null {
    if (!quality || quality === 'best' || quality === 'worst') {
      return null;
    }

    // Remover 'p' y cualquier sufijo adicional (ej: '1080p60' -> '1080')
    const match = quality.match(/^(\d+)p?/);
    if (!match) {
      return null;
    }

    const height = parseInt(match[1], 10);

    // Validar que sea un número válido y razonable
    if (isNaN(height) || height <= 0 || height > 8192) {
      return null;
    }

    return height;
  }

  /**
   * Validar argumentos antes de pasar a yt-dlp
   * Previene errores por argumentos inválidos
   */
  protected validateDownloadArgs(args: string[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Buscar argumentos con valores inválidos
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      // Verificar NaN en argumentos
      if (typeof arg === 'string' && arg.includes('NaN')) {
        errors.push(`Invalid argument contains NaN: ${arg}`);
      }

      // Verificar undefined o null
      if (arg === undefined || arg === null || arg === 'undefined' || arg === 'null') {
        errors.push(`Invalid argument at position ${i}: ${arg}`);
      }

      // Verificar formato de height
      if (arg.includes('height<=') && arg.includes('NaN')) {
        errors.push(`Invalid height filter: ${arg}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Sanitizar argumentos antes de ejecutar
   * Remueve o corrige argumentos problemáticos
   */
  protected sanitizeDownloadArgs(args: string[]): string[] {
    return args.filter(arg => {
      // Remover argumentos inválidos
      if (!arg || arg === 'undefined' || arg === 'null') {
        return false;
      }

      // Remover argumentos con NaN
      if (typeof arg === 'string' && arg.includes('NaN')) {
        this.log('warn', `Removed invalid argument: ${arg}`);
        return false;
      }

      return true;
    });
  }
}
