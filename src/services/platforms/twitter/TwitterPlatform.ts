import { BasePlatform } from '../BasePlatform';
import {
  PlatformType,
  PlatformConfig,
  PlatformCapabilities,
  URLValidationResult,
  PlatformVideoInfo,
  PlatformPlaylistInfo,
  PLATFORM_CONFIGS
} from '../../../types/platforms';
import { DownloadJob } from '../../../types';
import { electronApi } from '../../../utils/electronApi';

/**
 * 🐦 Twitter/X Platform Implementation
 *
 * Soporte para:
 * - Videos individuales de Twitter/X
 * - GIFs y imágenes en movimiento
 * - Extracción de metadata
 */
export class TwitterPlatform extends BasePlatform {
  readonly type: PlatformType = 'twitter';
  readonly config: PlatformConfig = PLATFORM_CONFIGS.twitter;

  readonly urlPatterns: RegExp[] = [
    /(?:https?:\/\/)?(?:www\.)?twitter\.com\/\w+\/status\/\d+/i,
    /(?:https?:\/\/)?(?:www\.)?x\.com\/\w+\/status\/\d+/i,
    /(?:https?:\/\/)?t\.co\/[\w-]+/i
  ];

  readonly capabilities: PlatformCapabilities = {
    maxQuality: '1080p',
    supportedFormats: ['mp4', 'gif', 'mp3', 'm4a'],
    hasAudioOnly: true,
    hasVideoOnly: true,
    hasLiveStreams: false,
    hasStories: false,
    hasReels: false,
    requiresFFmpeg: true
  };

  // ========================================
  // URL Validation
  // ========================================

  validateUrl(url: string): URLValidationResult {
    this.log('debug', 'Validating Twitter URL', { url });

    if (!this.isValidUrl(url)) {
      return {
        isValid: false,
        platform: this.type,
        reason: 'Invalid Twitter/X URL format',
        contentType: 'unknown'
      };
    }

    return {
      isValid: true,
      platform: this.type,
      contentType: 'video'
    };
  }

  isValidUrl(url: string): boolean {
    return this.urlPatterns.some(pattern => pattern.test(url));
  }

  isPlaylistUrl(url: string): boolean {
    // Twitter no tiene playlists
    return false;
  }

  isLiveStream(url: string): boolean {
    // Twitter Spaces no son soportados por yt-dlp de esta manera
    return false;
  }

  // ========================================
  // Video Information
  // ========================================

  async getVideoInfo(url: string): Promise<PlatformVideoInfo> {
    this.log('info', 'Fetching Twitter video info', { url });

    return new Promise((resolve, reject) => {
      const childProc = electronApi.spawn('yt-dlp', [
        '--dump-json',
        '--no-download',
        '--no-warnings',
        url
      ]);

      let output = '';
      let errorOutput = '';

      childProc.stdout.on('data', (data: Buffer) => {
        output += data.toString();
      });

      childProc.stderr.on('data', (data: Buffer) => {
        errorOutput += data.toString();
      });

      childProc.on('close', (code: number) => {
        if (code === 0 && output.trim()) {
          try {
            const videoData = JSON.parse(output.split('\n').find(line => line.trim()) || '{}');

            const videoInfo: PlatformVideoInfo = {
              platform: this.type,
              title: this.sanitizeTitle(videoData.title || videoData.description || 'Twitter Video'),
              duration: this.formatDuration(videoData.duration || 0),
              thumbnail: videoData.thumbnail || this.buildThumbnailUrl(videoData.id),
              uploader: videoData.uploader || videoData.uploader_id || 'Unknown',
              fileSize: this.formatFileSize(videoData.filesize || videoData.filesize_approx),
              formats: videoData.formats?.map((format: any) => ({
                format_id: format.format_id,
                ext: format.ext,
                quality: format.height ? `${format.height}p` : 'audio',
                filesize: format.filesize
              })) || [],
              // Campos a nivel raíz
              views: videoData.view_count || 0,
              likes: videoData.like_count || 0,
              uploadDate: videoData.upload_date || '',
              description: videoData.description?.substring(0, 500),
              platformSpecific: {
                tweetId: this.extractVideoId(url) || videoData.id,
                retweets: videoData.repost_count || 0,
                url: url
              }
            };

            this.log('info', 'Twitter video info retrieved successfully', {
              title: videoInfo.title,
              uploader: videoInfo.uploader,
              duration: videoInfo.duration
            });

            resolve(videoInfo);
          } catch (parseError) {
            this.log('error', 'Failed to parse Twitter video data', {
              error: parseError instanceof Error ? parseError.message : 'Unknown',
              output: output.substring(0, 200)
            });
            reject(new Error('Failed to parse Twitter video information'));
          }
        } else {
          this.log('error', 'yt-dlp failed to fetch Twitter video', {
            code,
            error: errorOutput.substring(0, 200)
          });
          reject(new Error(errorOutput || 'Failed to get Twitter video information'));
        }
      });

      childProc.on('error', (error: Error) => {
        this.log('error', 'Failed to spawn yt-dlp process', { error: error.message });
        reject(new Error(`Failed to start yt-dlp process: ${error.message}`));
      });

      setTimeout(() => {
        childProc.kill('SIGTERM');
        this.log('warn', 'Twitter info request timed out', { url });
        reject(new Error('Request timed out'));
      }, 30000);
    });
  }

  // ========================================
  // Playlist (Not Supported)
  // ========================================

  async getPlaylistInfo(url: string): Promise<PlatformPlaylistInfo> {
    this.log('warn', 'Twitter playlists are not supported', { url });
    throw new Error('Twitter playlists are not supported');
  }

  // ========================================
  // Download Arguments
  // ========================================

  buildDownloadArgs(job: DownloadJob, ffmpegPath?: string): string[] {
    this.log('info', 'Building Twitter download args', {
      jobId: job.id,
      type: job.type,
      quality: job.quality
    });

    const args: string[] = [];

    // FFmpeg location
    if (ffmpegPath) {
      args.push('--ffmpeg-location', ffmpegPath);
    }

    // Opciones de autenticación para Twitter (si están configuradas)
    // TODO: Agregar soporte para cookies desde configuración
    // if (cookiesPath) {
    //   args.push('--cookies', cookiesPath);
    // }

    // Opciones específicas de Twitter para mejor compatibilidad
    args.push('--no-warnings');
    args.push('--no-check-certificate');

    // Agregar user-agent para evitar bloqueos
    args.push('--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Agregar referer para Twitter
    args.push('--add-header', 'Referer:https://twitter.com/');

    // Tipo de descarga
    if (job.type === 'video-audio') {
      // Video con audio (mejor calidad)
      // Twitter generalmente tiene video y audio separados, necesitamos formato que los combine
      const height = this.parseQualityHeight(job.quality);

      if (height) {
        // Con calidad específica
        args.push('-f', `bestvideo[height<=${height}][ext=mp4]+bestaudio[ext=m4a]/best[height<=${height}][ext=mp4]/best[ext=mp4]`);
      } else {
        // Mejor calidad disponible
        args.push('-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best');
      }

      args.push('--merge-output-format', 'mp4');

      if (ffmpegPath) {
        args.push('--postprocessor-args', 'ffmpeg:-c:v copy -c:a aac -b:a 128k');
      }
    } else if (job.type === 'video') {
      // Solo video
      const height = this.parseQualityHeight(job.quality);

      if (height) {
        args.push('-f', `bestvideo[height<=${height}][ext=mp4]/bestvideo[ext=mp4]`);
      } else {
        args.push('-f', 'bestvideo[ext=mp4]/bestvideo');
      }

      args.push('--merge-output-format', 'mp4');
    } else if (job.type === 'audio') {
      // Solo audio
      args.push('-f', 'bestaudio/best');
      args.push('-x');
      args.push('--audio-format', 'mp3');
      args.push('--audio-quality', '192');
    }

    // Output template
    const outputTemplate = '%(title).200s.%(ext)s';
    args.push('-o', `${job.folder}/${outputTemplate}`);

    // Soporte para clips (recorte de video)
    if (job.startTime !== undefined && job.endTime !== undefined && ffmpegPath) {
      args.push('--download-sections', `*${job.startTime}-${job.endTime}`);
      this.log('info', 'Clip mode enabled', { startTime: job.startTime, endTime: job.endTime });
    }

    // URL
    args.push(job.url);

    // Validar y sanitizar argumentos antes de retornar
    const validation = this.validateDownloadArgs(args);
    if (!validation.valid) {
      this.log('error', 'Invalid download arguments detected', {
        errors: validation.errors,
        jobId: job.id
      });

      // Sanitizar y continuar
      const sanitizedArgs = this.sanitizeDownloadArgs(args);
      this.log('warn', 'Arguments sanitized', {
        original: args.length,
        sanitized: sanitizedArgs.length
      });

      return sanitizedArgs;
    }

    this.log('debug', 'Twitter download args built', { args: args.length });

    return args;
  }

  // ========================================
  // Helper Methods
  // ========================================

  buildThumbnailUrl(videoId: string): string {
    // Twitter no tiene un patrón de thumbnail predecible
    // yt-dlp lo extrae automáticamente
    return '';
  }

  extractVideoId(url: string): string | null {
    // Extraer ID de tweet de diferentes formatos de URL
    const patterns = [
      /\/status\/(\d+)/i,
      /t\.co\/([\w-]+)/i
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  }

  protected sanitizeTitle(title: string): string {
    return title
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 200);
  }

  protected formatDuration(seconds: number): string {
    if (!seconds || isNaN(seconds)) return 'Unknown';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  protected formatFileSize(bytes: number): string {
    if (!bytes || isNaN(bytes)) return 'Unknown';

    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));

    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  }
}

// Exportar instancia singleton
export const twitterPlatform = new TwitterPlatform();
