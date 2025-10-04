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
 * 📘 Facebook Platform Implementation
 *
 * Soporte para:
 * - Videos públicos de Facebook
 * - Videos de páginas
 * - Watch videos
 * - Reels de Facebook
 */
export class FacebookPlatform extends BasePlatform {
  readonly type: PlatformType = 'facebook';
  readonly config: PlatformConfig = PLATFORM_CONFIGS.facebook;

  readonly urlPatterns: RegExp[] = [
    /(?:https?:\/\/)?(?:www\.)?facebook\.com\/[\w.-]+\/videos\/\d+/i,
    /(?:https?:\/\/)?(?:www\.)?facebook\.com\/watch\/?\?v=\d+/i,
    /(?:https?:\/\/)?(?:www\.)?facebook\.com\/reel\/\d+/i,
    /(?:https?:\/\/)?(?:www\.)?fb\.watch\/[\w-]+/i,
    /(?:https?:\/\/)?(?:www\.)?facebook\.com\/[\w.-]+\/posts\/\d+/i
  ];

  readonly capabilities: PlatformCapabilities = {
    maxQuality: '1080p',
    supportedFormats: ['mp4', 'webm', 'mp3'],
    hasAudioOnly: true,
    hasVideoOnly: true,
    hasLiveStreams: true,
    hasStories: false,
    hasReels: true,
    requiresFFmpeg: true
  };

  // ========================================
  // URL Validation
  // ========================================

  validateUrl(url: string): URLValidationResult {
    this.log('debug', 'Validating Facebook URL', { url });

    if (!this.isValidUrl(url)) {
      return {
        isValid: false,
        platform: this.type,
        reason: 'Invalid Facebook URL format',
        contentType: 'unknown'
      };
    }

    const contentType = url.includes('/reel/') ? 'video' : 'video';

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
    // Facebook no tiene playlists públicas soportadas
    return false;
  }

  isLiveStream(url: string): boolean {
    // Detección básica de live streams
    return url.includes('/live/');
  }

  // ========================================
  // Video Information
  // ========================================

  async getVideoInfo(url: string): Promise<PlatformVideoInfo> {
    this.log('info', 'Fetching Facebook video info', { url });

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
              title: this.sanitizeTitle(videoData.title || videoData.description || 'Facebook Video'),
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
              platformSpecific: {
                videoId: this.extractVideoId(url) || videoData.id,
                description: videoData.description || '',
                views: videoData.view_count || 0,
                likes: videoData.like_count || 0,
                uploadDate: videoData.upload_date || videoData.timestamp,
                isReel: url.includes('/reel/'),
                url: url
              }
            };

            this.log('info', 'Facebook video info retrieved successfully', {
              title: videoInfo.title,
              uploader: videoInfo.uploader,
              duration: videoInfo.duration
            });

            resolve(videoInfo);
          } catch (parseError) {
            this.log('error', 'Failed to parse Facebook video data', {
              error: parseError instanceof Error ? parseError.message : 'Unknown',
              output: output.substring(0, 200)
            });
            reject(new Error('Failed to parse Facebook video information'));
          }
        } else {
          this.log('error', 'yt-dlp failed to fetch Facebook video', {
            code,
            error: errorOutput.substring(0, 200)
          });
          reject(new Error(errorOutput || 'Failed to get Facebook video information'));
        }
      });

      childProc.on('error', (error: Error) => {
        this.log('error', 'Failed to spawn yt-dlp process', { error: error.message });
        reject(new Error(`Failed to start yt-dlp process: ${error.message}`));
      });

      setTimeout(() => {
        childProc.kill('SIGTERM');
        this.log('warn', 'Facebook info request timed out', { url });
        reject(new Error('Request timed out'));
      }, 30000);
    });
  }

  // ========================================
  // Playlist (Not Supported)
  // ========================================

  async getPlaylistInfo(url: string): Promise<PlatformPlaylistInfo> {
    this.log('warn', 'Facebook playlists are not supported', { url });
    throw new Error('Facebook playlists are not supported');
  }

  // ========================================
  // Download Arguments
  // ========================================

  buildDownloadArgs(job: DownloadJob, ffmpegPath?: string): string[] {
    this.log('info', 'Building Facebook download args', {
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
        args.push('--postprocessor-args', 'ffmpeg:-c:v copy -c:a aac -b:a 128k');
      }
    } else if (job.type === 'video') {
      // Solo video
      args.push('-f', 'bestvideo[ext=mp4]/bestvideo');
      args.push('--merge-output-format', 'mp4');
    } else if (job.type === 'audio') {
      // Solo audio
      args.push('-f', 'bestaudio');
      args.push('-x');
      args.push('--audio-format', 'mp3');
      args.push('--audio-quality', '192');
    }

    // Calidad específica
    if (job.quality && job.type !== 'audio') {
      const height = parseInt(job.quality.replace('p', ''));
      args.push('-f', `best[height<=${height}]/bestvideo[height<=${height}]+bestaudio`);
    }

    // Output template
    const outputTemplate = '%(title).200s.%(ext)s';
    args.push('-o', `${job.folder}/${outputTemplate}`);

    // Opciones adicionales de Facebook
    args.push('--no-warnings');

    // URL
    args.push(job.url);

    this.log('debug', 'Facebook download args built', { args: args.length });

    return args;
  }

  // ========================================
  // Helper Methods
  // ========================================

  buildThumbnailUrl(videoId: string): string {
    // Facebook no tiene un patrón de thumbnail predecible
    return '';
  }

  extractVideoId(url: string): string | null {
    // Extraer ID de video de diferentes formatos de URL de Facebook
    const patterns = [
      /\/videos\/(\d+)/i,
      /[?&]v=(\d+)/i,
      /\/reel\/(\d+)/i,
      /fb\.watch\/([\w-]+)/i,
      /\/posts\/(\d+)/i
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
export const facebookPlatform = new FacebookPlatform();
