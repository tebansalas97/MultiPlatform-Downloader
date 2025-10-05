/**
 * Implementación de YouTube
 * Migración del código existente a la nueva arquitectura modular
 */

import { BasePlatform } from '../BasePlatform';
import { electronApi } from '../../../utils/electronApi';
import { DownloadJob } from '../../../types';
import {
  PlatformType,
  PlatformConfig,
  PlatformCapabilities,
  URLValidationResult,
  PlatformVideoInfo,
  PlatformPlaylistInfo,
  PLATFORM_CONFIGS
} from '../../../types/platforms';

export class YouTubePlatform extends BasePlatform {
  readonly type: PlatformType = 'youtube';
  readonly config: PlatformConfig = PLATFORM_CONFIGS.youtube;

  readonly urlPatterns: RegExp[] = [
    /(?:youtube\.com|youtu\.be)/i,
    /youtube\.com\/watch\?v=[\w-]+/i,
    /youtu\.be\/[\w-]+/i,
    /youtube\.com\/playlist\?list=[\w-]+/i,
    /youtube\.com\/shorts\/[\w-]+/i
  ];

  readonly capabilities: PlatformCapabilities = {
    maxQuality: '4320p',
    supportedFormats: ['mp4', 'webm', 'mkv', 'mp3', 'm4a'],
    hasAudioOnly: true,
    hasVideoOnly: true,
    hasLiveStreams: true,
    hasStories: false,
    hasReels: true, // Shorts
    requiresFFmpeg: true
  };

  /**
   * Validación detallada de URL de YouTube
   */
  validateUrl(url: string): URLValidationResult {
    if (!this.isValidUrl(url)) {
      return {
        isValid: false,
        platform: null,
        reason: 'URL does not match YouTube patterns'
      };
    }

    try {
      const urlObj = new URL(url);

      // Detectar tipo de contenido
      if (this.isPlaylistUrl(url)) {
        return {
          isValid: true,
          platform: 'youtube',
          contentType: 'playlist'
        };
      }

      if (this.isLiveStream(url)) {
        return {
          isValid: true,
          platform: 'youtube',
          contentType: 'live'
        };
      }

      return {
        isValid: true,
        platform: 'youtube',
        contentType: 'video'
      };
    } catch (error) {
      return {
        isValid: false,
        platform: null,
        reason: 'Invalid URL format'
      };
    }
  }

  /**
   * Detectar si es playlist
   */
  isPlaylistUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.searchParams.has('list') || url.includes('/playlist?');
    } catch {
      return false;
    }
  }

  /**
   * Detectar si es stream en vivo
   */
  isLiveStream(url: string): boolean {
    // YouTube lives tienen /live/ en la URL o están marcados como tal
    return url.includes('/live/');
  }

  /**
   * Extraer video ID
   */
  extractVideoId(url: string): string | null {
    try {
      const urlObj = new URL(url);

      // youtube.com/watch?v=VIDEO_ID
      const vParam = urlObj.searchParams.get('v');
      if (vParam) return vParam;

      // youtu.be/VIDEO_ID
      if (urlObj.hostname === 'youtu.be') {
        return urlObj.pathname.slice(1);
      }

      // youtube.com/shorts/VIDEO_ID
      const shortsMatch = url.match(/\/shorts\/([\w-]+)/);
      if (shortsMatch) return shortsMatch[1];

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Construir thumbnail URL
   */
  buildThumbnailUrl(videoId: string): string {
    // Usar maxresdefault para mejor calidad
    return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  }

  /**
   * Obtener información del video
   */
  async getVideoInfo(url: string): Promise<PlatformVideoInfo> {
    this.log('info', 'Fetching video info', { url });

    return new Promise((resolve, reject) => {
      const process = electronApi.spawn('yt-dlp', [
        '--dump-json',
        '--no-download',
        '--no-playlist',
        url
      ]);

      let output = '';

      process.stdout.on('data', (data: Buffer) => {
        output += data.toString();
      });

      process.on('close', (code: number) => {
        if (code === 0 && output.trim()) {
          try {
            const videoData = JSON.parse(output);
            const videoId = this.extractVideoId(url);

            const videoInfo: PlatformVideoInfo = {
              title: videoData.title || 'Unknown',
              duration: this.formatDuration(videoData.duration),
              thumbnail: videoData.thumbnail || (videoId ? this.buildThumbnailUrl(videoId) : ''),
              uploader: videoData.uploader || 'Unknown',
              fileSize: this.formatFileSize(videoData.filesize || videoData.filesize_approx),
              formats: videoData.formats?.map((f: any) => ({
                format_id: f.format_id,
                ext: f.ext,
                quality: f.height ? `${f.height}p` : 'audio',
                filesize: f.filesize
              })) || [],
              platform: 'youtube',
              platformSpecific: {
                views: videoData.view_count,
                likes: videoData.like_count,
                uploadDate: videoData.upload_date,
                channelId: videoData.channel_id,
                isLive: videoData.is_live
              }
            };

            this.log('info', 'Video info retrieved', { title: videoInfo.title });
            resolve(videoInfo);
          } catch (error) {
            this.log('error', 'Failed to parse video info', { error: String(error) });
            reject(new Error('Failed to parse video info'));
          }
        } else {
          this.log('error', 'yt-dlp failed', { code });
          reject(new Error('Failed to get video info'));
        }
      });

      process.on('error', (error: Error) => {
        this.log('error', 'Process error', { error: error.message });
        reject(error);
      });
    });
  }

  /**
   * Obtener información de playlist
   */
  async getPlaylistInfo(url: string): Promise<PlatformPlaylistInfo> {
    this.log('info', 'Fetching playlist info', { url });

    return new Promise((resolve, reject) => {
      const process = electronApi.spawn('yt-dlp', [
        '--dump-json',
        '--flat-playlist',
        '--ignore-errors',
        url
      ]);

      let output = '';

      process.stdout.on('data', (data: Buffer) => {
        output += data.toString();
      });

      process.on('close', (code: number) => {
        if (code === 0 && output.trim()) {
          try {
            const lines = output.split('\n').filter(line => line.trim());
            const playlistData = lines.map(line => JSON.parse(line));

            const firstVideo = playlistData[0];
            const playlistInfo: PlatformPlaylistInfo = {
              id: this.extractPlaylistId(url),
              title: firstVideo.playlist_title || 'Unknown Playlist',
              videoCount: playlistData.length,
              uploader: firstVideo.playlist_uploader || 'Unknown',
              videos: playlistData.map((video: any) => ({
                id: video.id,
                title: video.title || 'Unknown Title',
                duration: this.formatDuration(video.duration),
                thumbnail: video.thumbnail || this.buildThumbnailUrl(video.id)
              })),
              platform: 'youtube'
            };

            this.log('info', 'Playlist info retrieved', {
              title: playlistInfo.title,
              videoCount: playlistInfo.videoCount
            });
            resolve(playlistInfo);
          } catch (error) {
            this.log('error', 'Failed to parse playlist info', { error: String(error) });
            reject(new Error('Failed to parse playlist information'));
          }
        } else {
          this.log('error', 'yt-dlp failed for playlist', { code });
          reject(new Error('Failed to get playlist information'));
        }
      });

      process.on('error', (error: Error) => {
        this.log('error', 'Process error', { error: error.message });
        reject(error);
      });
    });
  }

  /**
   * Extraer playlist ID
   */
  private extractPlaylistId(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.searchParams.get('list') || 'unknown';
    } catch {
      const match = url.match(/[?&]list=([^&]+)/);
      return match ? match[1] : 'unknown';
    }
  }

  /**
   * Construir argumentos para yt-dlp
   */
  buildDownloadArgs(job: DownloadJob, ffmpegPath?: string): string[] {
    this.log('info', 'Building download args', { jobId: job.id, type: job.type });

    const args: string[] = [];

    // FFmpeg location
    if (ffmpegPath) {
      args.push('--ffmpeg-location', ffmpegPath);
    }

    // Args base
    args.push(
      '--no-warnings',
      '--no-check-certificate',
      '--prefer-insecure',
      '--no-playlist',
      '--continue',
      '--no-overwrites',
      '--newline'
    );

    // Tipo específico
    if (job.type === 'video-audio') {
      args.push('--merge-output-format', 'mp4', '--remux-video', 'mp4');

      if (ffmpegPath) {
        args.push('--postprocessor-args', 'ffmpeg:-c:v copy -c:a aac -b:a 192k -ar 44100');
      }
    } else if (job.type === 'audio') {
      args.push('--extract-audio', '--audio-format', 'mp3', '--audio-quality', '0');

      if (ffmpegPath) {
        args.push('--postprocessor-args', 'ffmpeg:-q:a 0');
      }
    }

    // Formato
    const formatString = this.getFormatString(job.quality, job.type);
    args.push('--format', formatString);

    // Output
    const outputTemplate = '%(title).200s.%(ext)s';
    args.push('-o', `${job.folder}/${outputTemplate}`);

    // Clips (si tiene tiempos)
    if (job.startTime !== undefined && job.endTime !== undefined && ffmpegPath) {
      args.push('--download-sections', `*${job.startTime}-${job.endTime}`);
    }

    args.push(job.url);

    // Validar y sanitizar argumentos
    const validation = this.validateDownloadArgs(args);
    if (!validation.valid) {
      this.log('error', 'Invalid download arguments detected', {
        errors: validation.errors,
        jobId: job.id
      });

      const sanitizedArgs = this.sanitizeDownloadArgs(args);
      this.log('warn', 'Arguments sanitized', {
        original: args.length,
        sanitized: sanitizedArgs.length
      });

      return sanitizedArgs;
    }

    this.log('debug', 'Download args built', { argsCount: args.length });

    return args;
  }

  /**
   * Obtener format string para yt-dlp
   */
  private getFormatString(quality: string, type: 'video' | 'audio' | 'video-audio'): string {
    switch (type) {
      case 'audio':
        return 'bestaudio/best';
      case 'video': {
        const height = this.parseQualityHeight(quality);
        return height
          ? `bestvideo[height<=${height}][ext=mp4]/bestvideo[ext=mp4]`
          : 'bestvideo[ext=mp4]/bestvideo';
      }
      case 'video-audio':
      default: {
        const height = this.parseQualityHeight(quality);
        if (height) {
          return `bestvideo[height<=${height}][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=${height}]+bestaudio/best`;
        } else {
          return 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best';
        }
      }
    }
  }
}
