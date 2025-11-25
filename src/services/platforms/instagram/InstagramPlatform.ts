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
 * 📸 Instagram Platform Implementation
 *
 * Soporte para:
 * - Posts con video/imagen de Instagram
 * - Reels
 * - IGTV
 * - Stories (públicas)
 */
export class InstagramPlatform extends BasePlatform {
  readonly type: PlatformType = 'instagram';
  readonly config: PlatformConfig = PLATFORM_CONFIGS.instagram;

  readonly urlPatterns: RegExp[] = [
    /(?:https?:\/\/)?(?:www\.)?instagram\.com\/p\/[\w-]+/i,
    /(?:https?:\/\/)?(?:www\.)?instagram\.com\/reels?\/[\w-]+/i,  // Soporta /reel/ y /reels/
    /(?:https?:\/\/)?(?:www\.)?instagram\.com\/tv\/[\w-]+/i,
    /(?:https?:\/\/)?(?:www\.)?instagram\.com\/stories\/[\w.-]+\/\d+/i,
    /(?:https?:\/\/)?(?:www\.)?instagr\.am\/p\/[\w-]+/i,
    /(?:https?:\/\/)?(?:www\.)?instagr\.am\/reels?\/[\w-]+/i  // Short URLs con reels
  ];

  readonly capabilities: PlatformCapabilities = {
    maxQuality: '1080p',
    supportedFormats: ['mp4', 'jpg', 'mp3'],
    hasAudioOnly: true,
    hasVideoOnly: true,
    hasLiveStreams: false,
    hasStories: true,
    hasReels: true,
    requiresFFmpeg: true
  };

  // ========================================
  // URL Validation
  // ========================================

  validateUrl(url: string): URLValidationResult {
    this.log('debug', 'Validating Instagram URL', { url });

    if (!this.isValidUrl(url)) {
      return {
        isValid: false,
        platform: this.type,
        reason: 'Invalid Instagram URL format',
        contentType: 'unknown'
      };
    }

    // Detectar tipo de contenido
    let contentType: 'video' | 'unknown' = 'video';
    if (url.includes('/reel/') || url.includes('/reels/')) {
      contentType = 'video';
    } else if (url.includes('/tv/')) {
      contentType = 'video';
    } else if (url.includes('/p/')) {
      contentType = 'video'; // Puede ser imagen o video
    }

    return {
      isValid: true,
      platform: this.type,
      contentType: contentType
    };
  }

  isValidUrl(url: string): boolean {
    return this.urlPatterns.some(pattern => pattern.test(url));
  }

  isPlaylistUrl(url: string): boolean {
    // Instagram no tiene playlists
    return false;
  }

  isLiveStream(url: string): boolean {
    // Instagram Live no es soportado por yt-dlp de esta manera
    return false;
  }

  // ========================================
  // Video Information
  // ========================================

  async getVideoInfo(url: string): Promise<PlatformVideoInfo> {
    this.log('info', 'Fetching Instagram video info', { url });

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
              title: this.sanitizeTitle(videoData.title || videoData.description || 'Instagram Video'),
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
              uploadDate: videoData.upload_date || videoData.timestamp,
              description: videoData.description?.substring(0, 500),
              platformSpecific: {
                postId: this.extractVideoId(url) || videoData.id,
                username: videoData.uploader || 'Unknown',
                comments: videoData.comment_count || 0,
                isReel: url.includes('/reel/') || url.includes('/reels/'),
                isIGTV: url.includes('/tv/'),
                isStory: url.includes('/stories/'),
                url: url
              }
            };

            this.log('info', 'Instagram video info retrieved successfully', {
              title: videoInfo.title,
              uploader: videoInfo.uploader,
              duration: videoInfo.duration
            });

            resolve(videoInfo);
          } catch (parseError) {
            this.log('error', 'Failed to parse Instagram video data', {
              error: parseError instanceof Error ? parseError.message : 'Unknown',
              output: output.substring(0, 200)
            });
            reject(new Error('Failed to parse Instagram video information'));
          }
        } else {
          this.log('error', 'yt-dlp failed to fetch Instagram video', {
            code,
            error: errorOutput.substring(0, 200)
          });
          reject(new Error(errorOutput || 'Failed to get Instagram video information'));
        }
      });

      childProc.on('error', (error: Error) => {
        this.log('error', 'Failed to spawn yt-dlp process', { error: error.message });
        reject(new Error(`Failed to start yt-dlp process: ${error.message}`));
      });

      setTimeout(() => {
        childProc.kill('SIGTERM');
        this.log('warn', 'Instagram info request timed out', { url });
        reject(new Error('Request timed out'));
      }, 30000);
    });
  }

  // ========================================
  // Playlist (Not Supported)
  // ========================================

  async getPlaylistInfo(url: string): Promise<PlatformPlaylistInfo> {
    this.log('warn', 'Instagram playlists are not supported', { url });
    throw new Error('Instagram playlists are not supported');
  }

  // ========================================
  // Download Arguments
  // ========================================

  buildDownloadArgs(job: DownloadJob, ffmpegPath?: string): string[] {
    this.log('info', 'Building Instagram download args', {
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
      // Mejor calidad de video + audio
      args.push('-f', 'best[ext=mp4]/best');
      args.push('--merge-output-format', 'mp4');

      if (ffmpegPath) {
        // Re-codificar a H.264 para compatibilidad universal
        args.push('--recode-video', 'mp4');
        args.push('--postprocessor-args', 'ffmpeg:-c:v libx264 -preset fast -crf 23 -c:a aac -b:a 128k');
      }
    } else if (job.type === 'video') {
      // Solo video
      args.push('-f', 'bestvideo[ext=mp4]/bestvideo');
      args.push('--merge-output-format', 'mp4');

      if (ffmpegPath) {
        // Re-codificar a H.264
        args.push('--recode-video', 'mp4');
        args.push('--postprocessor-args', 'ffmpeg:-c:v libx264 -preset fast -crf 23');
      }
    } else if (job.type === 'audio') {
      // Solo audio
      args.push('-f', 'bestaudio');
      args.push('-x');
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

    // Soporte para clips (recorte de video)
    if (job.startTime !== undefined && job.endTime !== undefined && ffmpegPath) {
      args.push('--download-sections', `*${job.startTime}-${job.endTime}`);
      this.log('info', 'Clip mode enabled', { startTime: job.startTime, endTime: job.endTime });
    }

    // Opciones adicionales de Instagram
    args.push('--no-warnings');

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

    this.log('debug', 'Instagram download args built', { args: args.length });

    return args;
  }

  // ========================================
  // Helper Methods
  // ========================================

  buildThumbnailUrl(videoId: string): string {
    // Instagram no tiene un patrón de thumbnail predecible
    return '';
  }

  extractVideoId(url: string): string | null {
    // Extraer ID de post/reel de diferentes formatos de URL de Instagram
    const patterns = [
      /\/p\/([\w-]+)/i,
      /\/reel\/([\w-]+)/i,
      /\/tv\/([\w-]+)/i,
      /\/stories\/[\w.-]+\/(\d+)/i,
      /instagr\.am\/p\/([\w-]+)/i
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
export const instagramPlatform = new InstagramPlatform();
