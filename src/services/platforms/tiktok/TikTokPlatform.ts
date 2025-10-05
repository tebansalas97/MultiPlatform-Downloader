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
 * 🎵 TikTok Platform Implementation
 *
 * Soporte para:
 * - Videos individuales de TikTok
 * - Videos con y sin marca de agua
 * - Extracción de metadata
 */
export class TikTokPlatform extends BasePlatform {
  readonly type: PlatformType = 'tiktok';
  readonly config: PlatformConfig = PLATFORM_CONFIGS.tiktok;

  readonly urlPatterns: RegExp[] = [
    /(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@[\w.-]+\/video\/\d+/i,
    /(?:https?:\/\/)?(?:www\.)?tiktok\.com\/.*\/video\/\d+/i,
    /(?:https?:\/\/)?vm\.tiktok\.com\/[\w-]+/i,
    /(?:https?:\/\/)?vt\.tiktok\.com\/[\w-]+/i
  ];

  readonly capabilities: PlatformCapabilities = {
    maxQuality: '1080p',
    supportedFormats: ['mp4', 'webm', 'mp3', 'm4a'],
    hasAudioOnly: true,
    hasVideoOnly: true,
    hasLiveStreams: true,
    hasStories: false,
    hasReels: false,
    requiresFFmpeg: true
  };

  // ========================================
  // URL Validation
  // ========================================

  validateUrl(url: string): URLValidationResult {
    this.log('debug', 'Validating TikTok URL', { url });

    if (!this.isValidUrl(url)) {
      return {
        isValid: false,
        platform: this.type,
        reason: 'Invalid TikTok URL format',
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
    // TikTok no tiene playlists públicas soportadas por yt-dlp
    return false;
  }

  isLiveStream(url: string): boolean {
    // TikTok tiene lives pero requieren detección en tiempo real
    // Por ahora retornamos false, se puede mejorar con API de yt-dlp
    return false;
  }

  // ========================================
  // Video Information
  // ========================================

  async getVideoInfo(url: string): Promise<PlatformVideoInfo> {
    this.log('info', 'Fetching TikTok video info', { url });

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
              title: this.sanitizeTitle(videoData.title || videoData.description || 'TikTok Video'),
              duration: this.formatDuration(videoData.duration || 0),
              thumbnail: videoData.thumbnail || this.buildThumbnailUrl(videoData.id),
              uploader: videoData.uploader || videoData.creator || 'Unknown',
              fileSize: this.formatFileSize(videoData.filesize || videoData.filesize_approx),
              formats: videoData.formats?.map((format: any) => ({
                format_id: format.format_id,
                ext: format.ext,
                quality: format.height ? `${format.height}p` : 'audio',
                filesize: format.filesize
              })) || [],
              platformSpecific: {
                videoId: this.extractVideoId(url) || videoData.id,
                description: videoData.description || '',
                views: videoData.view_count || 0,
                likes: videoData.like_count || 0,
                uploadDate: videoData.upload_date || '',
                url: url
              }
            };

            this.log('info', 'TikTok video info retrieved successfully', {
              title: videoInfo.title,
              uploader: videoInfo.uploader,
              duration: videoInfo.duration
            });

            resolve(videoInfo);
          } catch (parseError) {
            this.log('error', 'Failed to parse TikTok video data', {
              error: parseError instanceof Error ? parseError.message : 'Unknown',
              output: output.substring(0, 200)
            });
            reject(new Error('Failed to parse TikTok video information'));
          }
        } else {
          this.log('error', 'yt-dlp failed to fetch TikTok video', {
            code,
            error: errorOutput.substring(0, 200)
          });
          reject(new Error(errorOutput || 'Failed to get TikTok video information'));
        }
      });

      childProc.on('error', (error: Error) => {
        this.log('error', 'Failed to spawn yt-dlp process', { error: error.message });
        reject(new Error(`Failed to start yt-dlp process: ${error.message}`));
      });

      setTimeout(() => {
        childProc.kill('SIGTERM');
        this.log('warn', 'TikTok info request timed out', { url });
        reject(new Error('Request timed out'));
      }, 30000);
    });
  }

  // ========================================
  // Playlist (Not Supported)
  // ========================================

  async getPlaylistInfo(url: string): Promise<PlatformPlaylistInfo> {
    this.log('warn', 'TikTok playlists are not supported', { url });
    throw new Error('TikTok playlists are not supported');
  }

  // ========================================
  // Download Arguments
  // ========================================

  buildDownloadArgs(job: DownloadJob, ffmpegPath?: string): string[] {
    this.log('info', 'Building TikTok download args', {
      jobId: job.id,
      type: job.type,
      quality: job.quality
    });

    const args: string[] = [];

    // FFmpeg location
    if (ffmpegPath) {
      args.push('--ffmpeg-location', ffmpegPath);
    }

    // Tipo de descarga
    if (job.type === 'video-audio') {
      // Video con audio (mejor calidad)
      // Descargar sin conversión, el post-procesamiento se hará después
      args.push('-f', 'best[ext=mp4]/best');
      args.push('--merge-output-format', 'mp4');
    } else if (job.type === 'video') {
      // Solo video (sin audio)
      args.push('-f', 'bestvideo[ext=mp4]/bestvideo');
      args.push('--merge-output-format', 'mp4');
    } else if (job.type === 'audio') {
      // Solo audio
      args.push('-f', 'bestaudio');
      args.push('-x'); // Extract audio
      args.push('--audio-format', 'mp3');
      args.push('--audio-quality', '192');
    }

    // Calidad específica (solo si es válida)
    if (job.type !== 'audio') {
      const height = this.parseQualityHeight(job.quality);

      if (height) {
        args.push('-f', `best[height<=${height}]`);
      }
    }

    // Output template
    const outputTemplate = '%(title).200s.%(ext)s';
    args.push('-o', `${job.folder}/${outputTemplate}`);

    // Opciones adicionales de TikTok
    args.push('--no-warnings');
    args.push('--no-check-certificate'); // Algunos videos de TikTok pueden tener problemas de certificado

    // URL
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

    this.log('debug', 'TikTok download args built', { args: args.length });

    return args;
  }

  // ========================================
  // Helper Methods
  // ========================================

  buildThumbnailUrl(videoId: string): string {
    // TikTok no tiene un patrón de thumbnail predecible
    // yt-dlp lo extrae automáticamente
    return '';
  }

  extractVideoId(url: string): string | null {
    // Extraer ID de video de diferentes formatos de URL de TikTok
    const patterns = [
      /\/video\/(\d+)/i,
      /vm\.tiktok\.com\/([\w-]+)/i,
      /vt\.tiktok\.com\/([\w-]+)/i
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
export const tiktokPlatform = new TikTokPlatform();
