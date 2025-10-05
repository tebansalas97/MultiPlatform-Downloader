import { useDownloadStore } from '../stores/downloadStore';
import { electronApi } from '../utils/electronApi';
import { DownloadJob, VideoInfo } from '../types';
import { cacheService } from './CacheService';
import { bandwidthService } from './BandwidthService';
import { proxyService } from './ProxyService';
import { memoryService } from './MemoryService';
import { notificationService } from './NotificationService';
import { platformService } from './platforms/PlatformService';
import { diagnosticService } from './DiagnosticService';

interface SpawnResult {
  code: number;
  stdout: string;
  stderr: string;
}

export class DownloadService {
  private activeDownloads = new Map<string, any>();
  private maxConcurrent = 3;
  private retryAttempts = new Map<string, number>();
  private maxRetries = 3;
  private ffmpegPath: string | null = null;
  private isInitialized = false;
  
  private downloadStartTimes = new Map<string, number>();
  private downloadSizes = new Map<string, number>();
  private downloadProgress = new Map<string, number>();

  constructor() {
    this.initializeService();
  }

  private async initializeService(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      console.log('🔧 Initializing DownloadService...');
      
      this.ffmpegPath = await this.detectFFmpegPath();
      
      if (this.ffmpegPath) {
        console.log('✅ FFmpeg initialized successfully:', this.ffmpegPath);
        console.log('🎬 Video+Audio merge is ENABLED');
      } else {
        console.error('❌ CRITICAL: FFmpeg not found!');
        console.error('⚠️ Video+Audio downloads will NOT work properly');
        if (electronApi.isElectron) {
          this.showFFmpegInstallGuide();
        }
      }
      
      this.isInitialized = true;
    } catch (error) {
      console.error('❌ Failed to initialize DownloadService:', error);
    }
  }

  private async detectFFmpegPath(): Promise<string | null> {
    if (!electronApi.isElectron) {
      console.warn('Not running in Electron - FFmpeg detection skipped');
      return null;
    }

    console.log('🔍 Detecting FFmpeg...');

    // Paso 1: Buscar con where/which primero (más confiable en Windows)
    try {
      const whereCmd = process.platform === 'win32' ? 'where' : 'which';
      console.log(`Testing: ${whereCmd} ffmpeg`);
      const whereResult = await this.executeCommand(whereCmd, ['ffmpeg']);

      if (whereResult.code === 0 && whereResult.stdout.trim()) {
        // Tomar la primera ruta encontrada
        const ffmpegPath = whereResult.stdout.trim().split('\n')[0].trim();
        console.log('Found FFmpeg path from where:', ffmpegPath);

        // Verificar que la ruta funciona
        try {
          const testResult = await this.executeCommand(ffmpegPath, ['-version']);
          if (testResult.code === 0 && testResult.stdout.includes('ffmpeg version')) {
            console.log('✅ FFmpeg verified at:', ffmpegPath);
            return ffmpegPath;
          }
        } catch (error) {
          console.warn('⚠️ FFmpeg path verification failed, trying next method');
        }
      }
    } catch (error) {
      console.warn('⚠️ where/which search failed:', error);
    }

    // Paso 2: Probar rutas comunes específicas
    const commonPaths = [
      'C:\\Users\\Esteban\\Documents\\bin\\bin\\ffmpeg.exe',
      'C:\\Path-yt-dlp\\ffmpeg.exe',
      'C:\\Users\\Esteban\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.0-full_build\\bin\\ffmpeg.exe',
      'C:\\ffmpeg\\bin\\ffmpeg.exe',
      'C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe',
      '/usr/local/bin/ffmpeg',
      '/usr/bin/ffmpeg'
    ];

    console.log('🔍 Testing common FFmpeg paths...');
    for (const testPath of commonPaths) {
      try {
        const result = await this.executeCommand(testPath, ['-version']);
        if (result.code === 0 && result.stdout.includes('ffmpeg version')) {
          console.log('✅ FFmpeg found at:', testPath);
          return testPath;
        }
      } catch (error) {
        // Continuar con la siguiente ruta
        continue;
      }
    }

    // Paso 3: Como último recurso, probar comando directo 'ffmpeg'
    try {
      console.log('Testing: ffmpeg -version (direct)');
      const directTest = await this.executeCommand('ffmpeg', ['-version']);
      if (directTest.code === 0 && directTest.stdout.includes('ffmpeg version')) {
        console.log('✅ FFmpeg found in PATH: ffmpeg');
        return 'ffmpeg';
      }
    } catch (error) {
      console.warn('⚠️ Direct ffmpeg command failed');
    }

    console.error('❌ FFmpeg not found in any location!');
    console.error('💡 Please install FFmpeg using: winget install --id=Gyan.FFmpeg -e');
    return null;
  }

  private showFFmpegInstallGuide(): void {
    const instructions = `🔧 CRITICAL: FFmpeg is Required!

You have FFmpeg installed but it's not being detected properly.

Quick Fix:
1. Restart the application
2. If problem persists, run: winget install --id=Gyan.FFmpeg -e
3. Restart your computer

Current FFmpeg locations found:
- C:\\Users\\Esteban\\Documents\\bin\\bin\\ffmpeg.exe
- C:\\Path-yt-dlp\\ffmpeg.exe
- WinGet installation path`;

    console.error(instructions);
    
    if (typeof window !== 'undefined') {
      const notification = document.createElement('div');
      notification.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-red-600 text-white p-6 rounded-lg shadow-2xl max-w-lg';
      notification.innerHTML = `
        <div class="space-y-3">
          <div class="flex items-start space-x-3">
            <span class="text-3xl">🔥</span>
            <div class="flex-1">
              <div class="font-bold text-lg mb-2">FFmpeg Detection Issue</div>
              <div class="text-sm opacity-90">
                FFmpeg is installed but not detected. Video+Audio merge will not work.
              </div>
            </div>
            <button onclick="this.parentElement.parentElement.parentElement.remove()" 
                    class="text-white hover:text-red-200 text-2xl leading-none">&times;</button>
          </div>
          <button onclick="alert(\`${instructions.replace(/`/g, '\\`').replace(/\n/g, '\\n')}\`)" 
                  class="w-full bg-white text-red-600 py-2 px-4 rounded font-semibold hover:bg-red-50 transition-colors">
            Show Fix Instructions
          </button>
        </div>
      `;
      
      document.body.appendChild(notification);
    }
  }

  private getFormatString(quality: string, type: 'video' | 'audio' | 'video-audio'): string {
    switch (type) {
      case 'audio':
        return 'bestaudio/best';
      case 'video':
        return quality === 'best' 
          ? 'bestvideo[ext=mp4]' 
          : `bestvideo[height<=${quality.replace('p', '')}][ext=mp4]`;
      case 'video-audio':
      default:
        if (quality === 'best') {
          return 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best';
        } else {
          const height = quality.replace('p', '');
          return `bestvideo[height<=${height}][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=${height}]+bestaudio/best`;
        }
    }
  }

  private buildYtDlpArgs(job: DownloadJob, startTime?: number, endTime?: number): string[] {
    // 🆕 Detectar plataforma y usar su implementación
    const platform = platformService.detectPlatform(job.url);

    if (platform) {
      // Usar args específicos de la plataforma
      diagnosticService.log(
        platform.type,
        'info',
        'Building download args using platform implementation',
        { jobId: job.id, url: job.url }
      );

      const platformArgs = platform.buildDownloadArgs(job, this.ffmpegPath || undefined);

      // Agregar proxy args si están configurados
      const proxyArgs = proxyService.buildProxyArgs(
        proxyService.getCurrentProxy() || { enabled: false, type: 'http', host: '', port: 0 }
      );

      // Agregar speed limit args si están configurados
      const speedArgs = bandwidthService.buildSpeedLimitArgs();

      // Combinar args: platformArgs ya incluye la URL al final
      // Insertar proxy y speed antes de la URL
      const urlIndex = platformArgs.indexOf(job.url);
      if (urlIndex > -1) {
        platformArgs.splice(urlIndex, 0, ...proxyArgs, ...speedArgs);
      } else {
        platformArgs.push(...proxyArgs, ...speedArgs);
      }

      console.log(`📦 [${platform.getIcon()} ${platform.getDisplayName()}] yt-dlp command:`, `yt-dlp ${platformArgs.join(' ')}`);

      return platformArgs;
    }

    // Fallback: usar lógica genérica (no debería llegar aquí si las plataformas están bien configuradas)
    console.warn('⚠️ No platform detected, using generic args');
    return this.buildGenericArgs(job, startTime, endTime);
  }

  /**
   * Fallback: args genéricos cuando no se detecta plataforma
   */
  private buildGenericArgs(job: DownloadJob, startTime?: number, endTime?: number): string[] {
    const args: string[] = [];

    if (this.ffmpegPath) {
      args.push('--ffmpeg-location', this.ffmpegPath);
    }

    args.push(
      '--no-warnings',
      '--no-check-certificate',
      '--prefer-insecure',
      '--no-playlist',
      '--continue',
      '--no-overwrites',
      '--newline'
    );

    if (job.type === 'video-audio') {
      args.push('--merge-output-format', 'mp4', '--remux-video', 'mp4');
      if (this.ffmpegPath) {
        args.push('--postprocessor-args', 'ffmpeg:-c:v copy -c:a aac -b:a 192k -ar 44100');
      }
    } else if (job.type === 'audio') {
      args.push('--extract-audio', '--audio-format', 'mp3', '--audio-quality', '0');
      if (this.ffmpegPath) {
        args.push('--postprocessor-args', 'ffmpeg:-q:a 0');
      }
    }

    const formatString = this.getFormatString(job.quality, job.type);
    args.push('--format', formatString);

    const outputPath = this.buildOutputPath(job);
    args.push('-o', outputPath);

    if (startTime !== undefined && endTime !== undefined && this.ffmpegPath) {
      args.push('--download-sections', `*${startTime}-${endTime}`);
    }

    const proxyArgs = proxyService.buildProxyArgs(
      proxyService.getCurrentProxy() || { enabled: false, type: 'http', host: '', port: 0 }
    );
    args.push(...proxyArgs);

    const speedArgs = bandwidthService.buildSpeedLimitArgs();
    args.push(...speedArgs);

    args.push(job.url);

    console.log('📦 [Generic] yt-dlp command:', `yt-dlp ${args.join(' ')}`);

    return args;
  }

  private buildOutputPath(job: DownloadJob): string {
    const settings = useDownloadStore.getState().settings;
    const template = settings.outputTemplate || '%(title).200s.%(ext)s';
    return `${job.folder}/${template}`;
  }

  private async executeDownload(jobId: string, args: string[]): Promise<SpawnResult> {
    return new Promise((resolve, reject) => {
      const process = electronApi.spawn('yt-dlp', args);
      let stdout = '';
      let stderr = '';
      let hasCompleted = false;

      this.activeDownloads.set(jobId, process);

      const cleanup = () => {
        if (hasCompleted) return;
        hasCompleted = true;
        
        this.activeDownloads.delete(jobId);
        this.downloadStartTimes.delete(jobId);
        this.downloadSizes.delete(jobId);
        this.downloadProgress.delete(jobId);
        
        memoryService.updateProcessStatus(jobId, 'completed');
        
        console.log(`✅ Cleaned up download: ${jobId}`);
      };

      process.stdout.on('data', (data: Buffer) => {
        const line = data.toString();
        stdout += line;
        
        if (line.includes('[download]') && line.includes('%')) {
          const progressMatch = line.match(/(\d+\.?\d*)%/);
          if (progressMatch) {
            const progress = parseFloat(progressMatch[1]);
            this.updateJobProgress(jobId, progress);
          }

          const speedMatch = line.match(/(\d+\.?\d*)(KiB|MiB|GiB)\/s/);
          if (speedMatch) {
            const speed = parseFloat(speedMatch[1]);
            const unit = speedMatch[2];
            console.log(`⬇️ Download speed: ${speed} ${unit}/s`);
          }
        }

        if (line.includes('[Merger]') || line.includes('[ffmpeg]') || line.includes('Merging formats')) {
          console.log('🔄 FFmpeg merging video+audio:', line.trim());
        }
      });

      process.stderr.on('data', (data: Buffer) => {
        const errorLine = data.toString();
        stderr += errorLine;
        
        if (errorLine.includes('ffmpeg') && errorLine.includes('not found')) {
          console.error('❌ CRITICAL ERROR: FFmpeg not found during download!');
        }
        
        if (errorLine.includes('WARNING') || errorLine.includes('ERROR')) {
          console.warn('⚠️ yt-dlp output:', errorLine.trim());
        }
      });

      process.on('close', (code: number) => {
        cleanup();
        resolve({ code, stdout, stderr });
      });

      process.on('error', (error: Error) => {
        cleanup();
        reject(error);
      });

      const timeoutId = setTimeout(() => {
        if (!hasCompleted && this.activeDownloads.has(jobId)) {
          console.warn(`⏱️ Download timeout: ${jobId}`);
          try {
            process.kill('SIGTERM');
          } catch (e) {
            console.warn('Failed to kill process:', e);
          }
          cleanup();
          reject(new Error('Download timeout after 1 hour'));
        }
      }, 3600000);

      process.on('close', () => clearTimeout(timeoutId));
      process.on('error', () => clearTimeout(timeoutId));
    });
  }

  private updateJobProgress(jobId: string, progress: number): void {
    const { updateJob } = useDownloadStore.getState();
    
    this.downloadProgress.set(jobId, progress);
    
    updateJob(jobId, { 
      status: 'downloading', 
      progress: Math.min(100, Math.max(0, progress))
    });

    const startTime = this.downloadStartTimes.get(jobId);
    if (startTime) {
      const estimatedSize = this.downloadSizes.get(jobId) || 0;
      const bytesDownloaded = (estimatedSize * progress) / 100;
      bandwidthService.trackDownloadProgress(jobId, bytesDownloaded, progress);
    }
  }

  private trackDownloadStart(jobId: string, estimatedSize?: number): void {
    this.downloadStartTimes.set(jobId, Date.now());
    if (estimatedSize) {
      this.downloadSizes.set(jobId, estimatedSize);
    }
    bandwidthService.trackDownloadStart(jobId, estimatedSize);
  }

  private trackDownloadEnd(jobId: string, success: boolean = true): void {
    bandwidthService.trackDownloadEnd(jobId, success);
    
    this.downloadStartTimes.delete(jobId);
    this.downloadSizes.delete(jobId);
    this.downloadProgress.delete(jobId);
  }

  async startDownload(jobId: string): Promise<void> {
    const { updateJob } = useDownloadStore.getState();
    const job = useDownloadStore.getState().jobs.find(j => j.id === jobId);

    if (!job) {
      console.error('Job not found:', jobId);
      return;
    }

    await this.initializeService();

    // 🆕 Detectar plataforma
    const platform = platformService.detectPlatform(job.url);

    if (!platform) {
      const error = 'Unsupported platform or invalid URL';
      console.error(error);
      updateJob(jobId, { status: 'error', error });
      notificationService.showDownloadError(job.title, error);
      return;
    }

    // 🆕 Registrar inicio en DiagnosticService
    diagnosticService.recordDownloadStart(platform.type, jobId);

    // ✅ VALIDACIÓN CRÍTICA - Verificar FFmpeg para operaciones que lo requieren
    if (!this.ffmpegPath && platform.capabilities.requiresFFmpeg) {
      if (job.type === 'video-audio') {
        const error = `❌ FFmpeg is required for ${platform.getDisplayName()} Video+Audio downloads but was not detected. Please install FFmpeg and restart the app.`;
        console.error(error);
        updateJob(jobId, { status: 'error', error });
        notificationService.showDownloadError(job.title, error);
        diagnosticService.recordDownloadFailure(platform.type, jobId, error);
        return;
      } else if (job.type === 'audio') {
        const warning = `⚠️ FFmpeg not detected - ${platform.getDisplayName()} audio extraction may fail`;
        console.warn(warning);
        diagnosticService.log(platform.type, 'warn', warning, { jobId });
      }
    }

    console.log(`🚀 [${platform.getIcon()} ${platform.getDisplayName()}] Starting download: ${job.title}`);
    console.log(`📋 Type: ${job.type}, Quality: ${job.quality}`);
    console.log(`💾 Output: ${job.folder}`);
    console.log(`🎬 FFmpeg: ${this.ffmpegPath || 'NOT DETECTED'}`);

    updateJob(jobId, { status: 'downloading', progress: 0 });

    memoryService.registerProcess(jobId, 'download');

    this.trackDownloadStart(jobId, this.estimateFileSize(job.fileSize));

    const downloadStartTime = Date.now();

    try {
      const args = this.buildYtDlpArgs(job, job.startTime, job.endTime);
      const result = await this.executeDownload(jobId, args);

      await this.handleDownloadResult(result, job, jobId, platform, downloadStartTime);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Download error:', errorMessage);
      this.handleDownloadError(jobId, errorMessage);
      this.trackDownloadEnd(jobId, false);

      // 🆕 Registrar fallo en DiagnosticService
      diagnosticService.recordDownloadFailure(platform.type, jobId, errorMessage);
    }
  }

  private async handleDownloadResult(
    result: SpawnResult,
    job: DownloadJob,
    jobId: string,
    platform?: any,
    downloadStartTime?: number
  ): Promise<void> {
    const { updateJob, moveToHistory } = useDownloadStore.getState();
    const { code, stdout, stderr } = result;

    const downloadCompleted = stdout.includes('100%') || stdout.includes('has already been downloaded');
    const mergeSuccess = stdout.includes('[Merger]') || stdout.includes('Merging formats') || stdout.includes('[ffmpeg]');
    const hasFileError = stderr.includes('Unable to rename file') || stderr.includes('No such file or directory');
    const ffmpegError = stderr.includes('ffmpeg') && (stderr.includes('not found') || stderr.includes('does not exist'));
    const ffmpegWarning = stderr.includes('WARNING') && stderr.includes('ffmpeg');

    console.log('📊 Download result analysis:', {
      downloadCompleted,
      mergeSuccess,
      hasFileError,
      ffmpegError,
      ffmpegWarning,
      exitCode: code,
      jobType: job.type
    });

    // ✅ Para video+audio, verificar que el merge se haya realizado
    if (job.type === 'video-audio' && downloadCompleted && !mergeSuccess && !ffmpegError) {
      console.warn('⚠️ Video downloaded but merge not confirmed in logs');
    }

    if (downloadCompleted && !hasFileError && !ffmpegError) {
      console.log('✅ Download completed successfully:', job.title);

      // 🔥 POST-PROCESAMIENTO: Convertir HEVC a H.264 si es necesario
      if (platform && (platform.type === 'tiktok' || platform.type === 'instagram' || platform.type === 'facebook')) {
        await this.convertHEVCToH264IfNeeded(job, jobId);
      }

      // 🆕 Registrar éxito en DiagnosticService
      if (platform && downloadStartTime) {
        const duration = Date.now() - downloadStartTime;
        diagnosticService.recordDownloadSuccess(platform.type, jobId, duration);
      }

      updateJob(jobId, {
        status: 'completed',
        progress: 100,
        completedAt: new Date()
      });

      moveToHistory(jobId);
      this.trackDownloadEnd(jobId, true);

      notificationService.showDownloadComplete(job.title, {
        thumbnail: job.thumbnail,
        duration: job.duration,
        folder: job.folder
      });
    } else {
      let errorMsg = 'Download failed';

      if (ffmpegError) {
        errorMsg = '❌ FFmpeg error: Unable to merge video and audio. Check FFmpeg installation.';
        console.error(errorMsg);
        console.error('FFmpeg path was:', this.ffmpegPath || 'NOT SET');
      } else if (hasFileError) {
        errorMsg = 'File system error during download';
      } else {
        errorMsg = `Download incomplete (exit code: ${code})`;
      }

      const error = this.analyzeError(stderr);

      if (error.isRecoverable && this.shouldRetry(stderr) && !ffmpegError) {
        const attempts = (this.retryAttempts.get(jobId) || 0) + 1;
        this.retryAttempts.set(jobId, attempts);

        if (attempts < this.maxRetries) {
          console.log(`🔄 Retrying download (${attempts}/${this.maxRetries}):`, jobId);
          if (platform) {
            diagnosticService.log(platform.type, 'warn', `Retrying download (${attempts}/${this.maxRetries})`, { jobId });
          }
          await this.retryWithBasicArgs(jobId);
          return;
        }
      }

      // 🆕 Registrar fallo en DiagnosticService
      if (platform) {
        diagnosticService.recordDownloadFailure(platform.type, jobId, ffmpegError ? errorMsg : error.message);
      }

      this.handleDownloadError(jobId, ffmpegError ? errorMsg : error.message);
      this.trackDownloadEnd(jobId, false);
    }
  }

  private estimateFileSize(sizeStr?: string): number {
    if (!sizeStr || sizeStr === 'Unknown') return 0;
    
    const match = sizeStr.match(/(\d+\.?\d*)\s*(MB|GB|KB)/i);
    if (!match) return 0;
    
    const size = parseFloat(match[1]);
    const unit = match[2].toUpperCase();
    
    switch (unit) {
      case 'GB': return size * 1024 * 1024 * 1024;
      case 'MB': return size * 1024 * 1024;
      case 'KB': return size * 1024;
      default: return 0;
    }
  }

  private analyzeError(stderr: string): { isRecoverable: boolean; message: string } {
    // Errores específicos de plataformas
    if (stderr.includes('[twitter]') && stderr.includes('No video could be found')) {
      return {
        isRecoverable: false,
        message: '❌ Twitter/X: Video not accessible. This may be due to:\n' +
                 '• Private or protected account\n' +
                 '• Deleted tweet\n' +
                 '• Age-restricted content\n' +
                 '• Video removed by Twitter\n\n' +
                 '💡 Try: Login to Twitter with cookies or use a different tweet'
      };
    }

    if (stderr.includes('[twitter]') && stderr.includes('Login required')) {
      return {
        isRecoverable: false,
        message: '🔒 Twitter/X requires authentication.\n' +
                 '💡 Solution: Export cookies from your browser and configure them in Settings'
      };
    }

    if (stderr.includes('[instagram]') && stderr.includes('Login required')) {
      return {
        isRecoverable: false,
        message: '🔒 Instagram requires authentication.\n' +
                 '💡 Solution: Export cookies from your browser and configure them in Settings'
      };
    }

    if (stderr.includes('[tiktok]') && stderr.includes('Unable to download')) {
      return {
        isRecoverable: true,
        message: '⚠️ TikTok download failed - trying alternative method'
      };
    }

    if (stderr.includes('This video is unavailable')) {
      return {
        isRecoverable: false,
        message: '❌ Video unavailable (deleted, private, or region-restricted)'
      };
    }

    if (stderr.includes('Private video')) {
      return {
        isRecoverable: false,
        message: '🔒 This is a private video and cannot be downloaded'
      };
    }

    if (stderr.includes('Video unavailable')) {
      return {
        isRecoverable: false,
        message: '❌ Video unavailable (may be deleted or restricted)'
      };
    }

    if (stderr.includes('Sign in to confirm your age')) {
      return {
        isRecoverable: false,
        message: '🔞 Age-restricted content. Login with cookies required.'
      };
    }

    // Errores de red
    if (stderr.includes('HTTP Error 403')) {
      return { isRecoverable: true, message: '⚠️ Access forbidden - trying different settings' };
    }

    if (stderr.includes('HTTP Error 429')) {
      return { isRecoverable: false, message: '⏱️ Rate limited. Please wait a few minutes and try again.' };
    }

    if (stderr.includes('HTTP Error 404')) {
      return { isRecoverable: false, message: '❌ Video not found (404)' };
    }

    if (stderr.includes('Unable to download')) {
      return { isRecoverable: true, message: '⚠️ Download failed - retrying' };
    }

    if (stderr.includes('Connection reset')) {
      return { isRecoverable: true, message: '⚠️ Connection lost - retrying' };
    }

    if (stderr.includes('timeout')) {
      return { isRecoverable: true, message: '⏱️ Connection timeout - retrying' };
    }

    // Errores de FFmpeg
    if (stderr.includes('ffmpeg') && stderr.includes('not found')) {
      return {
        isRecoverable: false,
        message: '❌ FFmpeg not found - cannot merge video and audio.\n' +
                 '💡 Solution: Install FFmpeg and configure the path in Settings'
      };
    }

    // Errores de formato
    if (stderr.includes('Unsupported URL') || stderr.includes('is not a valid URL')) {
      return { isRecoverable: false, message: '❌ Invalid or unsupported URL' };
    }

    if (stderr.includes('No video formats found')) {
      return { isRecoverable: false, message: '❌ No downloadable video formats available' };
    }

    // Error genérico
    return { isRecoverable: false, message: 'Download failed. Check the URL and try again.' };
  }

  private shouldRetry(error: string): boolean {
    const retryableErrors = [
      'HTTP Error 403',
      'Connection reset',
      'Unable to download',
      'timeout'
    ];
    return retryableErrors.some(err => error.includes(err));
  }

  private async retryWithBasicArgs(jobId: string): Promise<void> {
    const job = useDownloadStore.getState().jobs.find(j => j.id === jobId);
    if (!job) return;

    const basicArgs = [
      '--no-warnings',
      '--format', 'best',
      '-o', `${job.folder}/%(title)s.%(ext)s`,
      job.url
    ];

    try {
      const result = await this.executeDownload(jobId, basicArgs);
      await this.handleDownloadResult(result, job, jobId);
    } catch (error) {
      this.handleDownloadError(jobId, 'Retry failed');
    }
  }

  private handleDownloadError(jobId: string, error: string): void {
    const { updateJob } = useDownloadStore.getState();
    const job = useDownloadStore.getState().jobs.find(j => j.id === jobId);
    
    updateJob(jobId, { 
      status: 'error', 
      error: error
    });

    if (job) {
      notificationService.showDownloadError(job.title, error);
    }
  }

  async getVideoInfo(url: string, useCache = true): Promise<VideoInfo> {
    // 🆕 Usar platformService para obtener info del video
    try {
      if (useCache) {
        return await cacheService.getVideoInfo(url);
      }

      const videoInfo = await platformService.getVideoInfo(url);
      return videoInfo;
    } catch (error) {
      // Fallback al método directo si hay error
      console.warn('Platform service failed, using direct method:', error);
      return await this.getVideoInfoDirect(url);
    }
  }

  private async getVideoInfoDirect(url: string): Promise<VideoInfo> {
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
            resolve({
              title: videoData.title || 'Unknown',
              duration: this.formatDuration(videoData.duration),
              thumbnail: videoData.thumbnail || '',
              uploader: videoData.uploader || 'Unknown',
              fileSize: this.formatFileSize(videoData.filesize || videoData.filesize_approx),
              formats: videoData.formats?.map((f: any) => ({
                format_id: f.format_id,
                ext: f.ext,
                quality: f.height ? `${f.height}p` : 'audio',
                filesize: f.filesize
              })) || []
            });
          } catch (error) {
            reject(new Error('Failed to parse video info'));
          }
        } else {
          reject(new Error('Failed to get video info'));
        }
      });

      process.on('error', () => reject(new Error('Process error')));
    });
  }

  private formatDuration(seconds: number): string {
    if (!seconds) return 'Unknown';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return h > 0 ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}` 
                 : `${m}:${s.toString().padStart(2, '0')}`;
  }

  private formatFileSize(bytes: number): string {
    if (!bytes) return 'Unknown';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  }

  cancelDownload(jobId: string): void {
    const process = this.activeDownloads.get(jobId);
    if (process) {
      try {
        process.kill('SIGTERM');
        console.log(`Cancelled download: ${jobId}`);
      } catch (e) {
        console.warn('Failed to cancel:', e);
      }
    }
    
    const { updateJob } = useDownloadStore.getState();
    updateJob(jobId, { status: 'cancelled' });
    
    this.trackDownloadEnd(jobId, false);
  }

  processQueue(): void {
    const { jobs } = useDownloadStore.getState();
    const activeCount = this.activeDownloads.size;
    
    if (activeCount >= this.maxConcurrent) return;
    
    const pendingJobs = jobs.filter(j => j.status === 'pending');
    const toStart = pendingJobs.slice(0, this.maxConcurrent - activeCount);
    
    toStart.forEach(job => this.startDownload(job.id));
  }

  getActiveDownloads(): string[] {
    return Array.from(this.activeDownloads.keys());
  }

  /**
   * 🔥 Convertir HEVC a H.264 si es necesario para compatibilidad con Windows
   */
  private async convertHEVCToH264IfNeeded(job: DownloadJob, jobId: string): Promise<void> {
    if (!this.ffmpegPath || job.type === 'audio') return;

    try {
      // Buscar el archivo descargado
      const { getState } = useDownloadStore;
      const folder = job.folder;
      const sanitizedTitle = job.title.replace(/[<>:"/\\|?*]/g, '_').substring(0, 200);

      // Posibles extensiones
      const possibleFiles = [
        `${folder}/${sanitizedTitle}.mp4`,
        `${folder}/${sanitizedTitle}.webm`,
        `${folder}/${sanitizedTitle}.mkv`
      ];

      let videoPath: string | null = null;

      // Buscar el archivo que existe
      const fs = electronApi.getFs();
      if (!fs) return;

      for (const filePath of possibleFiles) {
        if (fs.existsSync(filePath)) {
          videoPath = filePath;
          break;
        }
      }

      if (!videoPath) {
        console.warn('⚠️ No se encontró el archivo descargado para post-procesar');
        return;
      }

      console.log(`🔍 Verificando códec de: ${videoPath}`);

      // Detectar si es HEVC usando ffprobe
      const { stdout } = await this.executeCommand(this.ffmpegPath.replace('ffmpeg.exe', 'ffprobe.exe'), [
        '-v', 'error',
        '-select_streams', 'v:0',
        '-show_entries', 'stream=codec_name',
        '-of', 'default=noprint_wrappers=1:nokey=1',
        videoPath
      ]);

      const codec = stdout.trim();

      if (codec === 'hevc' || codec === 'h265') {
        console.log('🔥 Detectado HEVC! Convirtiendo a H.264...');

        const tempPath = videoPath.replace('.mp4', '.temp.mp4');

        // Convertir a H.264
        await this.executeCommand(this.ffmpegPath, [
          '-i', videoPath,
          '-c:v', 'libx264',
          '-preset', 'veryfast',
          '-crf', '23',
          '-c:a', 'aac',
          '-b:a', '128k',
          '-movflags', '+faststart',
          '-y',
          tempPath
        ]);

        // Reemplazar el archivo original
        fs.unlinkSync(videoPath);
        fs.renameSync(tempPath, videoPath);

        console.log('✅ Video convertido exitosamente a H.264');
      } else {
        console.log(`✅ Video ya está en ${codec}, no requiere conversión`);
      }
    } catch (error) {
      console.error('❌ Error al convertir HEVC:', error);
      // No fallar la descarga por un error de conversión
    }
  }

  private async executeCommand(command: string, args: string[]): Promise<SpawnResult> {
    return new Promise((resolve, reject) => {
      const process = electronApi.spawn(command, args);
      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      process.on('close', (code: number) => {
        resolve({ code, stdout, stderr });
      });

      process.on('error', (error: Error) => {
        reject(error);
      });
    });
  }

  cleanup(): void {
    console.log('🧹 Cleaning up DownloadService...');
    
    for (const [jobId, process] of this.activeDownloads.entries()) {
      try {
        process.kill('SIGTERM');
        console.log(`Killed process: ${jobId}`);
      } catch (e) {
        console.warn(`Failed to kill process ${jobId}:`, e);
      }
    }
    
    this.activeDownloads.clear();
    this.downloadStartTimes.clear();
    this.downloadSizes.clear();
    this.downloadProgress.clear();
    this.retryAttempts.clear();
    
    console.log('✅ DownloadService cleanup complete');
  }

  /**
   * Validar URL usando el sistema de plataformas
   * @deprecated Use platformService.isValidUrl() instead
   */
  static isValidYouTubeUrl(url: string): boolean {
    return platformService.isValidUrl(url);
  }

  /**
   * Verificar si una URL es válida para cualquier plataforma soportada
   */
  static isValidUrl(url: string): boolean {
    return platformService.isValidUrl(url);
  }

  /**
   * Detectar plataforma desde URL
   */
  static detectPlatform(url: string) {
    return platformService.detectPlatform(url);
  }
}

export const downloadService = new DownloadService();