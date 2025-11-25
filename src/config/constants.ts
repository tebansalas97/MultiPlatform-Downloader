/**
 * Constantes de la aplicación
 * Centraliza todos los valores mágicos y configuraciones
 */

// ============================================
// CONFIGURACIÓN DE DESCARGAS
// ============================================

export const DOWNLOAD = {
  /** Número máximo de descargas simultáneas */
  MAX_CONCURRENT: 3,
  
  /** Número máximo de reintentos por descarga */
  MAX_RETRIES: 3,
  
  /** Tiempo de espera entre reintentos (ms) */
  RETRY_DELAY: 2000,
  
  /** Timeout para obtener información del video (ms) */
  INFO_TIMEOUT: 30000,
  
  /** Timeout para descargas (ms) */
  DOWNLOAD_TIMEOUT: 3600000, // 1 hora
  
  /** Tamaño de chunk para progreso (bytes) */
  PROGRESS_CHUNK_SIZE: 1024 * 1024, // 1 MB
  
  /** Intervalo de actualización de progreso (ms) */
  PROGRESS_UPDATE_INTERVAL: 500
} as const;

// ============================================
// CONFIGURACIÓN DE BANDWIDTH
// ============================================

export const BANDWIDTH = {
  /** Velocidad mínima (KB/s) */
  MIN_SPEED: 50,
  
  /** Velocidad máxima por defecto (KB/s) */
  DEFAULT_MAX_SPEED: 0, // 0 = sin límite
  
  /** Intervalo de monitoreo (ms) */
  MONITOR_INTERVAL: 1000,
  
  /** Historial de velocidad (muestras) */
  SPEED_HISTORY_SIZE: 60,
  
  /** Umbral de congestión (porcentaje) */
  CONGESTION_THRESHOLD: 0.8,
  
  /** Factor de reducción en congestión */
  CONGESTION_REDUCTION_FACTOR: 0.7
} as const;

// ============================================
// CONFIGURACIÓN DE MEMORIA
// ============================================

export const MEMORY = {
  /** Límite de memoria para advertencia (MB) */
  WARNING_THRESHOLD: 500,
  
  /** Límite crítico de memoria (MB) */
  CRITICAL_THRESHOLD: 800,
  
  /** Intervalo de monitoreo de memoria (ms) */
  MONITOR_INTERVAL: 5000,
  
  /** Intervalo de limpieza de caché (ms) */
  CACHE_CLEANUP_INTERVAL: 60000
} as const;

// ============================================
// CONFIGURACIÓN DE CACHÉ
// ============================================

export const CACHE = {
  /** Máximo de elementos en caché */
  MAX_ITEMS: 100,
  
  /** Tiempo de vida del caché de video info (ms) */
  VIDEO_INFO_TTL: 3600000, // 1 hora
  
  /** Tiempo de vida del caché de playlist (ms) */
  PLAYLIST_TTL: 1800000, // 30 minutos
  
  /** Prefijo para claves de localStorage */
  STORAGE_PREFIX: 'ytdl_cache_'
} as const;

// ============================================
// CONFIGURACIÓN DE LOGGING
// ============================================

export const LOGGING = {
  /** Máximo de logs en memoria */
  MAX_LOGS: 1000,
  
  /** Máximo de logs por plataforma */
  MAX_LOGS_PER_PLATFORM: 200,
  
  /** Tiempo de retención de logs (ms) */
  LOG_RETENTION: 86400000, // 24 horas
  
  /** Niveles de log */
  LEVELS: {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
  }
} as const;

// ============================================
// CONFIGURACIÓN DE UI
// ============================================

export const UI = {
  /** Duración de animaciones (ms) */
  ANIMATION_DURATION: 200,
  
  /** Duración de notificaciones (ms) */
  NOTIFICATION_DURATION: 5000,
  
  /** Duración de toast de error (ms) */
  ERROR_TOAST_DURATION: 8000,
  
  /** Máximo de items en historial visible */
  MAX_HISTORY_VISIBLE: 50,
  
  /** Máximo de caracteres en título truncado */
  MAX_TITLE_LENGTH: 100,
  
  /** Intervalo de actualización de UI (ms) */
  UI_UPDATE_INTERVAL: 250
} as const;

// ============================================
// CONFIGURACIÓN DE RED
// ============================================

export const NETWORK = {
  /** Timeout para peticiones HTTP (ms) */
  HTTP_TIMEOUT: 10000,
  
  /** Timeout para detección de red (ms) */
  NETWORK_DETECTION_TIMEOUT: 5000,
  
  /** Número de reintentos para peticiones HTTP */
  HTTP_RETRIES: 2,
  
  /** Intervalo entre reintentos HTTP (ms) */
  HTTP_RETRY_DELAY: 1000
} as const;

// ============================================
// CONFIGURACIÓN DE PLATAFORMAS
// ============================================

export const PLATFORMS = {
  /** Plataformas soportadas */
  SUPPORTED: ['youtube', 'tiktok', 'twitter', 'reddit', 'twitch', 'facebook', 'instagram'] as const,
  
  /** Colores por plataforma */
  COLORS: {
    youtube: '#FF0000',
    tiktok: '#000000',
    twitter: '#1DA1F2',
    reddit: '#FF4500',
    twitch: '#9146FF',
    facebook: '#1877F2',
    instagram: '#E4405F'
  },
  
  /** Iconos por plataforma */
  ICONS: {
    youtube: '▶️',
    tiktok: '🎵',
    twitter: '🐦',
    reddit: '🤖',
    twitch: '🎮',
    facebook: '📘',
    instagram: '📸'
  }
} as const;

// ============================================
// CALIDADES DE VIDEO
// ============================================

export const VIDEO_QUALITIES = {
  /** Calidades disponibles */
  OPTIONS: ['best', '2160p', '1440p', '1080p', '720p', '480p', '360p', '240p'] as const,
  
  /** Calidad por defecto */
  DEFAULT: '1080p',
  
  /** Calidad de audio por defecto */
  DEFAULT_AUDIO: '192'
} as const;

// ============================================
// FORMATOS DE ARCHIVO
// ============================================

export const FILE_FORMATS = {
  /** Formatos de video soportados */
  VIDEO: ['mp4', 'webm', 'mkv'] as const,
  
  /** Formatos de audio soportados */
  AUDIO: ['mp3', 'm4a', 'wav', 'flac', 'ogg'] as const,
  
  /** Formato de video por defecto */
  DEFAULT_VIDEO: 'mp4',
  
  /** Formato de audio por defecto */
  DEFAULT_AUDIO: 'mp3'
} as const;

// ============================================
// REGEX PATTERNS
// ============================================

export const PATTERNS = {
  /** Patrón de URL de YouTube */
  YOUTUBE: /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/,
  
  /** Patrón de playlist de YouTube */
  YOUTUBE_PLAYLIST: /[?&]list=([a-zA-Z0-9_-]+)/,
  
  /** Patrón de URL de TikTok */
  TIKTOK: /(?:tiktok\.com\/@[\w.-]+\/video\/|vm\.tiktok\.com\/|tiktok\.com\/t\/)(\d+|[\w-]+)/,
  
  /** Patrón de URL de Twitter/X */
  TWITTER: /(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/,
  
  /** Patrón de URL de Reddit */
  REDDIT: /(?:reddit\.com|redd\.it)\/(?:r\/\w+\/comments\/|[\w]+)/,
  
  /** Patrón de caracteres no válidos en nombre de archivo */
  INVALID_FILENAME_CHARS: /[<>:"/\\|?*]/g
} as const;

// ============================================
// MENSAJES DE ERROR
// ============================================

export const ERROR_MESSAGES = {
  NETWORK_OFFLINE: 'No hay conexión a internet. Por favor verifica tu conexión.',
  DOWNLOAD_FAILED: 'Error durante la descarga. Por favor intenta de nuevo.',
  INVALID_URL: 'URL no válida. Por favor verifica el enlace.',
  PLATFORM_NOT_SUPPORTED: 'Esta plataforma no está soportada.',
  FFMPEG_NOT_FOUND: 'FFmpeg no está instalado. Es necesario para combinar video y audio.',
  YTDLP_NOT_FOUND: 'yt-dlp no está instalado. Es necesario para descargar videos.',
  RATE_LIMITED: 'Demasiadas solicitudes. Por favor espera un momento.',
  VIDEO_UNAVAILABLE: 'El video no está disponible o es privado.',
  PERMISSION_DENIED: 'No se tienen permisos para escribir en esta carpeta.'
} as const;

export default {
  DOWNLOAD,
  BANDWIDTH,
  MEMORY,
  CACHE,
  LOGGING,
  UI,
  NETWORK,
  PLATFORMS,
  VIDEO_QUALITIES,
  FILE_FORMATS,
  PATTERNS,
  ERROR_MESSAGES
};
