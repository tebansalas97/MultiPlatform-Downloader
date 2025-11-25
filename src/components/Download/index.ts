export { DownloadQueue } from './DownloadQueue';
export { PlaylistPreview } from './PlaylistPreview';
export { VideoPreview } from './VideoPreview';
export { VideoPlayer } from './VideoPlayer';
export { SubtitleSelector } from './SubtitleSelector';

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
  // Opciones avanzadas
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