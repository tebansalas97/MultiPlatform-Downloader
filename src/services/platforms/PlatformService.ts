/**
 * Servicio orquestador de plataformas
 * Gestiona el registro, detección y acceso a todas las plataformas soportadas
 */

import { BasePlatform } from './BasePlatform';
import { PlatformType, PlatformDetectionResult, PLATFORM_CONFIGS } from '../../types/platforms';
import { diagnosticService } from '../DiagnosticService';

class PlatformService {
  private platforms: Map<PlatformType, BasePlatform> = new Map();
  private initialized = false;

  /**
   * Registrar una plataforma
   */
  register(platform: BasePlatform): void {
    if (this.platforms.has(platform.type)) {
      console.warn(`Platform ${platform.type} is already registered. Overwriting...`);
    }

    this.platforms.set(platform.type, platform);
    console.log(`✅ Platform registered: ${platform.getDisplayName()} ${platform.getIcon()}`);

    diagnosticService.log(
      platform.type,
      'info',
      `Platform ${platform.getDisplayName()} registered successfully`
    );
  }

  /**
   * Desregistrar una plataforma
   */
  unregister(platformType: PlatformType): void {
    if (this.platforms.delete(platformType)) {
      console.log(`Platform ${platformType} unregistered`);
      diagnosticService.log(platformType, 'info', 'Platform unregistered');
    }
  }

  /**
   * Detectar plataforma desde una URL
   */
  detectPlatform(url: string): BasePlatform | null {
    if (!url || typeof url !== 'string') {
      return null;
    }

    // Normalizar URL
    const normalizedUrl = url.trim();

    // Intentar detectar con cada plataforma registrada
    for (const [type, platform] of this.platforms.entries()) {
      if (!platform.isEnabled()) {
        continue;
      }

      if (platform.isValidUrl(normalizedUrl)) {
        diagnosticService.log(
          type,
          'info',
          `Platform detected from URL`,
          { url: normalizedUrl }
        );
        return platform;
      }
    }

    diagnosticService.log(
      'youtube', // Default platform for logging
      'warn',
      `No platform detected for URL: ${normalizedUrl}`
    );

    return null;
  }

  /**
   * Detectar plataforma con detalles
   */
  detectPlatformDetailed(url: string): PlatformDetectionResult {
    const platform = this.detectPlatform(url);

    return {
      platform: platform?.type || null,
      confidence: platform ? 1.0 : 0.0,
      url
    };
  }

  /**
   * Obtener plataforma por tipo
   */
  getPlatform(type: PlatformType): BasePlatform | null {
    return this.platforms.get(type) || null;
  }

  /**
   * Obtener todas las plataformas registradas
   */
  getAllPlatforms(): BasePlatform[] {
    return Array.from(this.platforms.values());
  }

  /**
   * Obtener plataformas habilitadas
   */
  getEnabledPlatforms(): BasePlatform[] {
    return this.getAllPlatforms().filter(p => p.isEnabled());
  }

  /**
   * Verificar si una plataforma está registrada
   */
  isPlatformRegistered(type: PlatformType): boolean {
    return this.platforms.has(type);
  }

  /**
   * Verificar si una URL es válida para alguna plataforma
   */
  isValidUrl(url: string): boolean {
    return this.detectPlatform(url) !== null;
  }

  /**
   * Verificar si una URL es de playlist
   */
  isPlaylistUrl(url: string): boolean {
    const platform = this.detectPlatform(url);
    return platform ? platform.isPlaylistUrl(url) : false;
  }

  /**
   * Verificar si una URL es de stream en vivo
   */
  isLiveStream(url: string): boolean {
    const platform = this.detectPlatform(url);
    return platform ? platform.isLiveStream(url) : false;
  }

  /**
   * Obtener información de video
   */
  async getVideoInfo(url: string) {
    const platform = this.detectPlatform(url);

    if (!platform) {
      throw new Error(`No platform found for URL: ${url}`);
    }

    diagnosticService.log(
      platform.type,
      'info',
      'Fetching video info',
      { url }
    );

    try {
      const info = await platform.getVideoInfo(url);
      diagnosticService.log(
        platform.type,
        'info',
        'Video info retrieved successfully',
        { title: info.title }
      );
      return info;
    } catch (error) {
      diagnosticService.log(
        platform.type,
        'error',
        `Failed to get video info: ${error}`,
        { url, error: String(error) }
      );
      throw error;
    }
  }

  /**
   * Obtener información de playlist
   */
  async getPlaylistInfo(url: string) {
    const platform = this.detectPlatform(url);

    if (!platform) {
      throw new Error(`No platform found for URL: ${url}`);
    }

    if (!platform.isPlaylistUrl(url)) {
      throw new Error(`URL is not a playlist: ${url}`);
    }

    diagnosticService.log(
      platform.type,
      'info',
      'Fetching playlist info',
      { url }
    );

    try {
      const info = await platform.getPlaylistInfo(url);
      diagnosticService.log(
        platform.type,
        'info',
        'Playlist info retrieved successfully',
        { title: info.title, videoCount: info.videoCount }
      );
      return info;
    } catch (error) {
      diagnosticService.log(
        platform.type,
        'error',
        `Failed to get playlist info: ${error}`,
        { url, error: String(error) }
      );
      throw error;
    }
  }

  /**
   * Obtener estadísticas de todas las plataformas
   */
  getStats() {
    return diagnosticService.getAllStats();
  }

  /**
   * Obtener resumen de todas las plataformas
   */
  getSummary() {
    return {
      total: this.platforms.size,
      enabled: this.getEnabledPlatforms().length,
      platforms: this.getAllPlatforms().map(p => ({
        type: p.type,
        name: p.getDisplayName(),
        icon: p.getIcon(),
        enabled: p.isEnabled(),
        supportsPlaylists: p.config.supportsPlaylists,
        supportsSubtitles: p.config.supportsSubtitles
      })),
      stats: diagnosticService.getStatsSummary()
    };
  }

  /**
   * Inicializar servicio
   */
  initialize(): void {
    if (this.initialized) {
      console.warn('PlatformService already initialized');
      return;
    }

    console.log('🚀 Initializing PlatformService...');

    // Las plataformas se registrarán dinámicamente
    // desde sus propios módulos

    this.initialized = true;
    console.log('✅ PlatformService initialized');
  }

  /**
   * Verificar si está inicializado
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Limpiar todas las plataformas (útil para testing)
   */
  clear(): void {
    this.platforms.clear();
    this.initialized = false;
    console.log('PlatformService cleared');
  }

  /**
   * Obtener configuración de una plataforma
   */
  getPlatformConfig(type: PlatformType) {
    return PLATFORM_CONFIGS[type];
  }

  /**
   * Obtener todas las configuraciones
   */
  getAllConfigs() {
    return { ...PLATFORM_CONFIGS };
  }
}

// Singleton
export const platformService = new PlatformService();

// Inicializar automáticamente
if (typeof window !== 'undefined') {
  platformService.initialize();
}
