import { electronApi } from '../utils/electronApi';
import { PlaylistInfo } from '../types';
import { platformService } from './platforms/PlatformService';

export class PlaylistService {
  /**
   * Detectar si una URL es una playlist
   */
  static isPlaylistUrl(url: string): boolean {
    // 🆕 Usar platformService
    return platformService.isPlaylistUrl(url);
  }

  /**
   * Método de instancia para compatibilidad
   */
  isPlaylistUrl(url: string): boolean {
    return PlaylistService.isPlaylistUrl(url);
  }

  /**
   * Obtener información de la playlist
   */
  async getPlaylistInfo(url: string): Promise<PlaylistInfo> {
    // 🆕 Usar platformService para obtener info de playlist
    try {
      const playlistInfo = await platformService.getPlaylistInfo(url);
      return playlistInfo;
    } catch (error) {
      // Fallback al método directo si hay error
      console.warn('Platform service failed for playlist, using direct method:', error);
      return this.getPlaylistInfoDirect(url);
    }
  }

  /**
   * Método directo de fallback
   */
  private async getPlaylistInfoDirect(url: string): Promise<PlaylistInfo> {
    return new Promise((resolve, reject) => {
      const process = electronApi.spawn('yt-dlp', [
        '--dump-json',
        '--flat-playlist',
        '--ignore-errors',
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
            const lines = output.split('\n').filter(line => line.trim());
            const playlistData = lines.map(line => JSON.parse(line));
            
            const firstVideo = playlistData[0];
            const playlistInfo: PlaylistInfo = {
              id: this.extractPlaylistId(url),
              title: firstVideo.playlist_title || 'Unknown Playlist',
              videoCount: playlistData.length,
              uploader: firstVideo.playlist_uploader || 'Unknown',
              videos: playlistData.map((video: any) => ({
                id: video.id,
                title: video.title || 'Unknown Title',
                duration: this.formatDuration(video.duration),
                // ✅ Construir thumbnail URL desde el ID del video
                thumbnail: video.thumbnail ||
                          (video.id ? `https://img.youtube.com/vi/${video.id}/mqdefault.jpg` : '')
              }))
            };

            resolve(playlistInfo);
          } catch (parseError) {
            reject(new Error('Failed to parse playlist information'));
          }
        } else {
          reject(new Error(errorOutput || 'Failed to get playlist information'));
        }
      });

      // ✅ CORREGIDO: El evento 'error' recibe un Error, no un number
      process.on('error', (error: Error) => {
        reject(new Error(`Failed to start yt-dlp process: ${error.message}`));
      });

      // Timeout después de 45 segundos para playlists
      setTimeout(() => {
        process.kill('SIGTERM');
        reject(new Error('Request timed out while getting playlist information'));
      }, 45000);
    });
  }

  /**
   * Extraer ID de playlist de la URL
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
   * Formatear duración en segundos a MM:SS
   */
  private formatDuration(seconds: number): string {
    if (!seconds || isNaN(seconds)) return 'Unknown';
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  /**
   * Generar URLs individuales de videos de la playlist
   */
  generateVideoUrls(playlistInfo: PlaylistInfo): string[] {
    return playlistInfo.videos.map(video => 
      `https://www.youtube.com/watch?v=${video.id}`
    );
  }
}

// Instancia singleton del servicio
export const playlistService = new PlaylistService();