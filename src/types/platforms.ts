/**
 * Tipos y interfaces para el sistema de plataformas multi-sitio
 */

import { DownloadJob, VideoInfo, PlaylistInfo } from './index';

/**
 * Plataformas soportadas
 */
export type PlatformType = 'youtube' | 'tiktok' | 'twitter' | 'reddit' | 'twitch' | 'facebook' | 'instagram';

/**
 * Configuración de una plataforma
 */
export interface PlatformConfig {
  name: string;
  displayName: string;
  icon: string;
  color: string;
  enabled: boolean;
  supportsPlaylists: boolean;
  supportsSubtitles: boolean;
  requiresAuth: boolean;
}

/**
 * Resultado de detección de plataforma
 */
export interface PlatformDetectionResult {
  platform: PlatformType | null;
  confidence: number;
  url: string;
}

/**
 * Argumentos específicos para yt-dlp por plataforma
 */
export interface PlatformDownloadArgs {
  baseArgs: string[];
  formatArgs: string[];
  outputArgs: string[];
  extraArgs: string[];
}

/**
 * Estadísticas de una plataforma
 */
export interface PlatformStats {
  totalDownloads: number;
  successfulDownloads: number;
  failedDownloads: number;
  totalErrors: number;
  lastUsed: number;
  averageDownloadTime: number;
}

/**
 * Log de diagnóstico
 */
export interface PlatformLog {
  id: string;
  platform: PlatformType;
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  metadata?: {
    url?: string;
    jobId?: string;
    error?: string;
    duration?: number;
    [key: string]: any;
  };
}

/**
 * Resultado de validación de URL
 */
export interface URLValidationResult {
  isValid: boolean;
  platform: PlatformType | null;
  reason?: string;
  contentType?: 'video' | 'playlist' | 'live' | 'unknown';
}

/**
 * Capacidades de una plataforma
 */
export interface PlatformCapabilities {
  maxQuality: string;
  supportedFormats: string[];
  hasAudioOnly: boolean;
  hasVideoOnly: boolean;
  hasLiveStreams: boolean;
  hasStories: boolean;
  hasReels: boolean;
  requiresFFmpeg: boolean;
}

/**
 * Información extendida de video con datos de plataforma
 */
export interface PlatformVideoInfo extends VideoInfo {
  platform: PlatformType;
  platformSpecific?: {
    views?: number;
    likes?: number;
    uploadDate?: string;
    channelId?: string;
    isLive?: boolean;
    [key: string]: any;
  };
}

/**
 * Información extendida de playlist con datos de plataforma
 */
export interface PlatformPlaylistInfo extends PlaylistInfo {
  platform: PlatformType;
  platformSpecific?: {
    description?: string;
    visibility?: 'public' | 'unlisted' | 'private';
    [key: string]: any;
  };
}

/**
 * Feature flags para habilitar/deshabilitar plataformas
 */
export interface PlatformFeatureFlags {
  youtube: boolean;
  tiktok: boolean;
  twitter: boolean;
  reddit: boolean;
  twitch: boolean;
  facebook: boolean;
  instagram: boolean;
}

/**
 * Constantes de plataformas
 */
export const PLATFORM_CONFIGS: Record<PlatformType, PlatformConfig> = {
  youtube: {
    name: 'youtube',
    displayName: 'YouTube',
    icon: '🎬',
    color: '#FF0000',
    enabled: true,
    supportsPlaylists: true,
    supportsSubtitles: true,
    requiresAuth: false
  },
  tiktok: {
    name: 'tiktok',
    displayName: 'TikTok',
    icon: '🎵',
    color: '#000000',
    enabled: true,
    supportsPlaylists: false,
    supportsSubtitles: false,
    requiresAuth: false
  },
  twitter: {
    name: 'twitter',
    displayName: 'Twitter/X',
    icon: '🐦',
    color: '#1DA1F2',
    enabled: true,
    supportsPlaylists: false,
    supportsSubtitles: false,
    requiresAuth: false
  },
  reddit: {
    name: 'reddit',
    displayName: 'Reddit',
    icon: '🤖',
    color: '#FF4500',
    enabled: true,
    supportsPlaylists: false,
    supportsSubtitles: false,
    requiresAuth: false
  },
  twitch: {
    name: 'twitch',
    displayName: 'Twitch',
    icon: '🎮',
    color: '#9146FF',
    enabled: true,
    supportsPlaylists: false,
    supportsSubtitles: false,
    requiresAuth: false
  },
  facebook: {
    name: 'facebook',
    displayName: 'Facebook',
    icon: '📘',
    color: '#1877F2',
    enabled: true,
    supportsPlaylists: false,
    supportsSubtitles: false,
    requiresAuth: false
  },
  instagram: {
    name: 'instagram',
    displayName: 'Instagram',
    icon: '📸',
    color: '#E4405F',
    enabled: true,
    supportsPlaylists: false,
    supportsSubtitles: false,
    requiresAuth: false
  }
};

/**
 * Feature flags por defecto
 */
export const DEFAULT_PLATFORM_FLAGS: PlatformFeatureFlags = {
  youtube: true,
  tiktok: true,
  twitter: true,
  reddit: true,
  twitch: true,
  facebook: true,
  instagram: true
};
