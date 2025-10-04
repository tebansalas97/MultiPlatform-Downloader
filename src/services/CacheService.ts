import { VideoInfo, PlaylistInfo } from '../types';

interface VideoInfoCache {
  url: string;
  info: VideoInfo;
  timestamp: number;
  expiry: number;
  size: number;
  hits: number;
}

interface PlaylistCache {
  url: string;
  info: PlaylistInfo;
  timestamp: number;
  expiry: number;
  size: number;
  hits: number;
}

interface CacheStats {
  videos: number;
  playlists: number;
  totalSize: string;
  hitRate: number;
  oldestEntry: number;
  newestEntry: number;
}

export class CacheService {
  private videoCache = new Map<string, VideoInfoCache>();
  private playlistCache = new Map<string, PlaylistCache>();
  private readonly DEFAULT_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 horas
  private readonly MAX_CACHE_SIZE = 1000;
  private readonly MAX_MEMORY_SIZE = 50 * 1024 * 1024; // 50MB

  private hitCount = 0;
  private missCount = 0;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.loadCacheFromStorage();
    this.startCleanupTimer();
  }

  /**
   * Obtener información de video desde cache o fetchear
   */
  async getVideoInfo(url: string, forceRefresh = false): Promise<VideoInfo> {
    const cacheKey = this.normalizeUrl(url);
    
    if (!forceRefresh && this.videoCache.has(cacheKey)) {
      const cached = this.videoCache.get(cacheKey)!;
      
      if (Date.now() < cached.expiry) {
        cached.hits++;
        this.hitCount++;
        console.log('Cache hit for video:', url);
        return cached.info;
      } else {
        this.videoCache.delete(cacheKey);
      }
    }

    this.missCount++;
    console.log('Cache miss, fetching video info:', url);
    
    // ✅ Usar VideoInfoService directamente sin importación circular
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Video info request timeout'));
      }, 30000);

      const handler = (event: Event) => {
        const customEvent = event as CustomEvent;
        clearTimeout(timeoutId);
        window.removeEventListener('video-info-response', handler as EventListener);
        
        if (customEvent.detail.error) {
          reject(new Error(customEvent.detail.error));
        } else {
          this.cacheVideoInfo(url, customEvent.detail.info);
          resolve(customEvent.detail.info);
        }
      };
      
      window.addEventListener('video-info-response', handler as EventListener);
      window.dispatchEvent(new CustomEvent('video-info-request', { detail: { url } }));
    });
  }

  /**
   * Obtener información de playlist desde cache o fetchear
   */
  async getPlaylistInfo(url: string, forceRefresh = false): Promise<PlaylistInfo> {
    const cacheKey = this.normalizeUrl(url);
    
    if (!forceRefresh && this.playlistCache.has(cacheKey)) {
      const cached = this.playlistCache.get(cacheKey)!;
      
      if (Date.now() < cached.expiry) {
        cached.hits++;
        this.hitCount++;
        console.log('Cache hit for playlist:', cached.info.title);
        return cached.info;
      } else {
        this.playlistCache.delete(cacheKey);
      }
    }

    this.missCount++;
    console.log('Cache miss, fetching playlist info:', url);
    
    const { playlistService } = await import('./PlaylistService');
    const info = await playlistService.getPlaylistInfo(url);
    
    this.cachePlaylistInfo(url, info);
    return info;
  }

  /**
   * Guardar información de video en cache
   */
  private cacheVideoInfo(url: string, info: VideoInfo): void {
    const cacheKey = this.normalizeUrl(url);
    const now = Date.now();
    const size = this.estimateObjectSize(info);
    
    // Verificar límites de memoria
    if (this.getCurrentMemoryUsage() + size > this.MAX_MEMORY_SIZE) {
      this.performMemoryCleanup();
    }
    
    // Limpiar cache si está lleno
    if (this.videoCache.size >= this.MAX_CACHE_SIZE) {
      this.cleanOldestEntries('video');
    }
    
    this.videoCache.set(cacheKey, {
      url: cacheKey,
      info,
      timestamp: now,
      expiry: now + this.DEFAULT_CACHE_DURATION,
      size,
      hits: 0
    });
    
    this.saveCacheToStorage();
    console.log(`Cached video info: ${info.title} (${this.formatBytes(size)})`);
  }

  /**
   * Guardar información de playlist en cache
   */
  private cachePlaylistInfo(url: string, info: PlaylistInfo): void {
    const cacheKey = this.normalizeUrl(url);
    const now = Date.now();
    const size = this.estimateObjectSize(info);
    
    if (this.getCurrentMemoryUsage() + size > this.MAX_MEMORY_SIZE) {
      this.performMemoryCleanup();
    }
    
    if (this.playlistCache.size >= this.MAX_CACHE_SIZE) {
      this.cleanOldestEntries('playlist');
    }
    
    this.playlistCache.set(cacheKey, {
      url: cacheKey,
      info,
      timestamp: now,
      expiry: now + this.DEFAULT_CACHE_DURATION,
      size,
      hits: 0
    });
    
    this.saveCacheToStorage();
    console.log(`Cached playlist info: ${info.title} (${info.videoCount} videos, ${this.formatBytes(size)})`);
  }

  /**
   * Normalizar URL para usar como clave de cache
   */
  private normalizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const videoId = this.extractVideoId(url);
      
      if (videoId) {
        return `video:${videoId}`;
      }
      
      // Para playlists
      const playlistId = urlObj.searchParams.get('list');
      if (playlistId) {
        return `playlist:${playlistId}`;
      }
      
      return url.toLowerCase();
    } catch {
      return url.toLowerCase();
    }
  }

  /**
   * Extraer ID de video de YouTube
   */
  private extractVideoId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    
    return null;
  }

  /**
   * Limpiar entradas más antiguas del cache (versión mejorada)
   */
  private cleanOldestEntries(type: 'video' | 'playlist'): void {
    if (type === 'video') {
      this.cleanOldestVideoEntries();
    } else {
      this.cleanOldestPlaylistEntries();
    }
  }

  /**
   * Limpiar videos más antiguos
   */
  private cleanOldestVideoEntries(): void {
    const entries = Array.from(this.videoCache.entries());
    entries.sort(([, a], [, b]) => a.timestamp - b.timestamp);
    
    const toRemove = Math.ceil(entries.length * 0.3); // Remover 30%
    for (let i = 0; i < toRemove; i++) {
      this.videoCache.delete(entries[i][0]);
    }
    
    console.log(`Removed ${toRemove} old video cache entries`);
  }

  /**
   * Limpiar playlists más antiguas
   */
  private cleanOldestPlaylistEntries(): void {
    const entries = Array.from(this.playlistCache.entries());
    entries.sort(([, a], [, b]) => a.timestamp - b.timestamp);
    
    const toRemove = Math.ceil(entries.length * 0.3); // Remover 30%
    for (let i = 0; i < toRemove; i++) {
      this.playlistCache.delete(entries[i][0]);
    }
    
    console.log(`Removed ${toRemove} old playlist cache entries`);
  }

  /**
   * Realizar limpieza de memoria
   */
  private performMemoryCleanup(): void {
    console.log('Performing memory cleanup...');
    
    // Limpiar entradas expiradas
    this.cleanExpiredEntries();
    
    // Si aún hay problema de memoria, limpiar entradas menos utilizadas
    if (this.getCurrentMemoryUsage() > this.MAX_MEMORY_SIZE * 0.8) {
      this.cleanLeastUsedEntries();
    }
  }

  /**
   * Limpiar entradas expiradas
   */
  private cleanExpiredEntries(): void {
    const now = Date.now();
    let cleaned = 0;
    
    // Limpiar videos expirados
    for (const [key, entry] of Array.from(this.videoCache.entries())) {
      if (now > entry.expiry) {
        this.videoCache.delete(key);
        cleaned++;
      }
    }
    
    // Limpiar playlists expiradas
    for (const [key, entry] of Array.from(this.playlistCache.entries())) {
      if (now > entry.expiry) {
        this.playlistCache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`Cleaned ${cleaned} expired cache entries`);
    }
  }

  /**
   * Limpiar entradas menos utilizadas (LRU)
   */
  private cleanLeastUsedEntries(): void {
    // Combinar entradas de ambos caches
    const allEntries: Array<[string, VideoInfoCache | PlaylistCache, 'video' | 'playlist']> = [
      ...Array.from(this.videoCache.entries()).map(([k, v]): [string, VideoInfoCache | PlaylistCache, 'video' | 'playlist'] => [k, v, 'video']),
      ...Array.from(this.playlistCache.entries()).map(([k, v]): [string, VideoInfoCache | PlaylistCache, 'video' | 'playlist'] => [k, v, 'playlist'])
    ];
    
    // Ordenar por hits (menos usado primero)
    allEntries.sort(([, a], [, b]) => a.hits - b.hits);
    
    // Remover el 30% menos usado
    const toRemove = Math.ceil(allEntries.length * 0.3);
    for (let i = 0; i < toRemove; i++) {
      const [key, , type] = allEntries[i];
      const cache = type === 'video' ? this.videoCache : this.playlistCache;
      cache.delete(key);
    }
    
    console.log(`Cleaned ${toRemove} least used cache entries`);
  }

  /**
   * Estimar tamaño de objeto en bytes
   */
  private estimateObjectSize(obj: any): number {
    return JSON.stringify(obj).length * 2; // Aproximación simple
  }

  /**
   * Obtener uso actual de memoria
   */
  private getCurrentMemoryUsage(): number {
    let total = 0;
    
    for (const entry of Array.from(this.videoCache.values())) {
      total += entry.size;
    }
    
    for (const entry of Array.from(this.playlistCache.values())) {
      total += entry.size;
    }
    
    return total;
  }

  /**
   * Guardar cache en localStorage (comprimido)
   */
  private saveCacheToStorage(): void {
    try {
      const cacheData = {
        videos: Array.from(this.videoCache.entries()),
        playlists: Array.from(this.playlistCache.entries()),
        stats: { hitCount: this.hitCount, missCount: this.missCount }
      };
      
      const compressed = this.compressData(JSON.stringify(cacheData));
      localStorage.setItem('yt-dl-cache', compressed);
    } catch (error) {
      console.warn('Failed to save cache to storage:', error);
    }
  }

  /**
   * Cargar cache desde localStorage
   */
  private loadCacheFromStorage(): void {
    try {
      const compressed = localStorage.getItem('yt-dl-cache');
      if (!compressed) return;
      
      const decompressed = this.decompressData(compressed);
      const cacheData = JSON.parse(decompressed);
      
      // Restaurar videos
      if (cacheData.videos) {
        this.videoCache = new Map(cacheData.videos);
      }
      
      // Restaurar playlists
      if (cacheData.playlists) {
        this.playlistCache = new Map(cacheData.playlists);
      }
      
      // Restaurar estadísticas
      if (cacheData.stats) {
        this.hitCount = cacheData.stats.hitCount || 0;
        this.missCount = cacheData.stats.missCount || 0;
      }
      
      // Limpiar entradas expiradas después de cargar
      this.cleanExpiredEntries();
      
      console.log(`Loaded cache: ${this.videoCache.size} videos, ${this.playlistCache.size} playlists`);
    } catch (error) {
      console.warn('Failed to load cache from storage:', error);
      this.clearCache();
    }
  }

  /**
   * Comprimir datos usando algoritmo simple
   */
  private compressData(data: string): string {
    // Compresión simple con pares de caracteres repetidos
    return data.replace(/(.)\1+/g, (match, char) => {
      return match.length > 3 ? `${char}${match.length}` : match;
    });
  }

  /**
   * Descomprimir datos
   */
  private decompressData(compressed: string): string {
    try {
      // ✅ Validaciones estrictas
      if (!compressed || typeof compressed !== 'string') {
        return '{}';
      }
      
      if (compressed.length > 500000) { // 500KB limit
        console.warn('⚠️ Compressed data too large');
        return '{}';
      }
      
      // ✅ Algoritmo seguro sin regex
      let result = '';
      let i = 0;
      const maxLength = 1000000; // 1MB max output
      
      while (i < compressed.length) {
        const char = compressed[i];
        let count = 1;
        
        // Contar repeticiones consecutivas (máximo 100)
        while (i + count < compressed.length && 
               compressed[i + count] === char && 
               count < 100) {
          count++;
        }
        
        // Agregar caracteres al resultado
        const repeatCount = Math.min(count, 50);
        result += char.repeat(repeatCount);
        i += count;
        
        // ✅ Protección contra explosión de tamaño
        if (result.length > maxLength) {
          console.error('❌ Decompression size exceeded');
          return '{}';
        }
      }
      
      return result;
    } catch (error) {
      console.error('Decompression error:', error);
      return '{}';
    }
  }

  /**
   * Iniciar timer de limpieza automática
   */
  private startCleanupTimer(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanExpiredEntries();
      this.saveCacheToStorage();
    }, 5 * 60 * 1000); // Cada 5 minutos
  }

  /**
   * Obtener estadísticas del cache
   */
  getCacheStats(): CacheStats {
    const allEntries = [
      ...Array.from(this.videoCache.values()),
      ...Array.from(this.playlistCache.values())
    ];
    
    const totalRequests = this.hitCount + this.missCount;
    
    return {
      videos: this.videoCache.size,
      playlists: this.playlistCache.size,
      totalSize: this.formatBytes(this.getCurrentMemoryUsage()),
      hitRate: totalRequests > 0 ? (this.hitCount / totalRequests) * 100 : 0,
      oldestEntry: allEntries.length > 0 ? Math.min(...allEntries.map(e => e.timestamp)) : 0,
      newestEntry: allEntries.length > 0 ? Math.max(...allEntries.map(e => e.timestamp)) : 0
    };
  }

  /**
   * Formatear bytes a string legible
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  }

  /**
   * Limpiar todo el cache
   */
  clearCache(): void {
    this.videoCache.clear();
    this.playlistCache.clear();
    this.hitCount = 0;
    this.missCount = 0;
    localStorage.removeItem('yt-dl-cache');
    console.log('Cache cleared');
  }

  /**
   * Parar timer de limpieza
   */
  cleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.saveCacheToStorage();
  }
}

// Instancia singleton
export const cacheService = new CacheService();