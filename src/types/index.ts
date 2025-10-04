export interface DownloadJob {
  id: string;
  url: string;
  title: string;
  status: 'pending' | 'downloading' | 'completed' | 'error' | 'cancelled';
  progress: number;
  type: 'video' | 'audio' | 'video-audio';
  quality: string;
  folder: string;
  thumbnail?: string;
  duration?: string;
  fileSize?: string;
  createdAt: Date;
  completedAt?: Date;
  error?: string;
  // Nuevos campos para recorte
  startTime?: number;
  endTime?: number;
  isClip?: boolean;
}

export interface AppSettings {
  defaultFolder: string;
  defaultQuality: string;
  defaultType: 'video' | 'audio' | 'video-audio';
  theme: 'dark' | 'light' | 'system';
  maxConcurrent: number;
  autoStart: boolean;
  notifications: boolean;
  keepHistory: boolean;
  // Opciones avanzadas agregadas
  customArgs?: string;
  outputTemplate?: string;
  embedSubs?: boolean;
  writeAutoSub?: boolean;
  preferredLanguage?: string;
}

export interface PlaylistInfo {
  id: string;
  title: string;
  videoCount: number;
  uploader: string;
  videos: Array<{
    id: string;
    title: string;
    duration: string;
    thumbnail: string;
  }>;
}

export interface VideoInfo {
  title: string;
  duration: string;
  thumbnail: string;
  uploader: string;
  fileSize?: string;
  formats: Array<{
    format_id: string;
    ext: string;
    quality: string;
    filesize?: number;
  }>;
}

export interface MemoryStats {
  used: number;
  available: number;
  total: number;
  percentage: number;
  cacheSize: number;
  historySize: number;
  activeProcesses: number;
  status: 'normal' | 'warning' | 'critical';
  lastMeasurement: number; // ✅ Esta propiedad ya estaba agregada
}

// También agregar tipos mejorados para el cache:
export interface CacheEntry {
  timestamp: number;
  expiry: number;
  size: number;
  hits: number;
}

export interface VideoInfoCache extends CacheEntry {
  url: string;
  info: VideoInfo;
}

export interface PlaylistCache extends CacheEntry {
  url: string;
  info: PlaylistInfo;
}