import { electronApi } from '../utils/electronApi';
import { VideoInfo } from '../types';
import { platformService } from './platforms/PlatformService';
import { diagnosticService } from './DiagnosticService';

export class VideoInfoService {
  constructor() {
    // Escuchar requests de video info con tipado correcto
    window.addEventListener('video-info-request', this.handleVideoInfoRequest.bind(this) as EventListener);
  }

  private async handleVideoInfoRequest(event: Event) {
    const customEvent = event as CustomEvent;
    const { url } = customEvent.detail;
    try {
      // 🆕 Usar platformService para obtener info del video
      const info = await this.fetchVideoInfo(url);
      window.dispatchEvent(new CustomEvent('video-info-response', {
        detail: { info }
      }));
    } catch (error) {
      window.dispatchEvent(new CustomEvent('video-info-response', {
        detail: { error: error instanceof Error ? error.message : 'Unknown error' }
      }));
    }
  }

  /**
   * 🆕 Método principal que usa platformService
   */
  async fetchVideoInfo(url: string): Promise<VideoInfo> {
    try {
      const platform = platformService.detectPlatform(url);

      if (!platform) {
        diagnosticService.log('youtube', 'warn', 'No platform detected for URL, using fallback', { url });
        return this.fetchVideoInfoDirect(url);
      }

      diagnosticService.log(platform.type, 'info', 'Fetching video info using platform service', { url });

      const platformInfo = await platformService.getVideoInfo(url);

      // Convertir de PlatformVideoInfo a VideoInfo (legacy)
      const videoInfo: VideoInfo = {
        title: platformInfo.title,
        duration: platformInfo.duration,
        thumbnail: platformInfo.thumbnail,
        uploader: platformInfo.uploader,
        fileSize: platformInfo.fileSize || 'Unknown',
        formats: platformInfo.formats?.map((format: any) => ({
          format_id: format.format_id,
          ext: format.ext,
          quality: format.height ? `${format.height}p` : 'audio',
          filesize: format.filesize
        })) || []
      };

      diagnosticService.log(platform.type, 'info', 'Video info fetched successfully', {
        title: videoInfo.title,
        duration: videoInfo.duration
      });

      return videoInfo;
    } catch (error) {
      diagnosticService.log('youtube', 'error', 'Platform service failed, using fallback', {
        url,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return this.fetchVideoInfoDirect(url);
    }
  }

  async fetchVideoInfoDirect(url: string): Promise<VideoInfo> {
    return new Promise((resolve, reject) => {
      if (!this.isValidYouTubeUrl(url)) {
        reject(new Error('Invalid YouTube URL'));
        return;
      }

      const process = electronApi.spawn('yt-dlp', [
        '--dump-json',
        '--no-download',
        '--no-playlist',
        url
      ]);

      let output = '';
      let errorOutput = '';

      process.stdout.on('data', (data: Buffer) => {
        output += data.toString();
      });

      process.stderr.on('data', (data: Buffer) => {
        errorOutput += data.toString();
      });

      process.on('close', (code: number) => {
        if (code === 0 && output.trim()) {
          try {
            const videoData = JSON.parse(output.split('\n').find(line => line.trim()) || '{}');
            
            const videoInfo: VideoInfo = {
              title: this.sanitizeTitle(videoData.title || 'Unknown Title'),
              duration: this.formatDuration(videoData.duration),
              thumbnail: videoData.thumbnail || '',
              uploader: videoData.uploader || 'Unknown',
              fileSize: this.formatFileSize(videoData.filesize || videoData.filesize_approx),
              formats: videoData.formats?.map((format: any) => ({
                format_id: format.format_id,
                ext: format.ext,
                quality: format.height ? `${format.height}p` : 'audio',
                filesize: format.filesize
              })) || []
            };

            resolve(videoInfo);
          } catch (parseError) {
            reject(new Error('Failed to parse video information'));
          }
        } else {
          reject(new Error(errorOutput || 'Failed to get video information'));
        }
      });

      process.on('error', (error: Error) => {
        reject(new Error(`Failed to start yt-dlp process: ${error.message}`));
      });

      setTimeout(() => {
        process.kill('SIGTERM');
        reject(new Error('Request timed out'));
      }, 30000);
    });
  }

  private isValidYouTubeUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      const validHosts = ['youtube.com', 'www.youtube.com', 'youtu.be', 'music.youtube.com'];
      return validHosts.some(host => urlObj.hostname.includes(host));
    } catch {
      return false;
    }
  }

  private sanitizeTitle(title: string): string {
    return title
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 200);
  }

  private formatDuration(seconds: number): string {
    if (!seconds || isNaN(seconds)) return 'Unknown';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  private formatFileSize(bytes: number): string {
    if (!bytes || isNaN(bytes)) return 'Unknown';
    
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  }
}

// Instancia singleton
export const videoInfoService = new VideoInfoService();