import React, { useState, useEffect } from 'react';
import { useDownloadStore } from '../../stores/downloadStore';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { downloadService } from '../../services/DownloadService';
import { playlistService } from '../../services/PlaylistService';
import { electronApi } from '../../utils/electronApi';
import { DropZone, PlatformIcon } from '../ui';
import { VideoPreview, PlaylistPreview, SubtitleSelector } from '../Download';
import { FolderSelector } from '../ui/FolderSelector';
import {
  LinkIcon,
  PlusIcon,
  VideoCameraIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

export function DownloadView() {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customFolder, setCustomFolder] = useState('');
  const [showSubtitleSelector, setShowSubtitleSelector] = useState(false);
  const [showPlaylistPreview, setShowPlaylistPreview] = useState(false);
  const [showVideoPreview, setShowVideoPreview] = useState(false);
  const [currentVideoInfo, setCurrentVideoInfo] = useState<any>(null);
  const [currentPlaylistInfo, setCurrentPlaylistInfo] = useState<any>(null);
  
  const { addJob, settings, updateSettings, clearQueue } = useDownloadStore();

  useKeyboardShortcuts({
    onPasteUrl: (pastedUrl) => setUrl(pastedUrl),
    onClearQueue: () => clearQueue()
  });

  // Solicitar permisos de notificación al cargar
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Listeners para eventos personalizados
  useEffect(() => {
    const handlePreviewVideo = () => {
      if (url.trim()) {
        processUrl(url);
      }
    };

    const handleCaptureVideoInfo = () => {
      if (url.trim()) {
        console.log('Video URL:', url);
        console.log('Current video info:', currentVideoInfo);
      }
    };

    window.addEventListener('preview-video', handlePreviewVideo);
    window.addEventListener('capture-video-info', handleCaptureVideoInfo);

    return () => {
      window.removeEventListener('preview-video', handlePreviewVideo);
      window.removeEventListener('capture-video-info', handleCaptureVideoInfo);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  const handleUrlDrop = async (urls: string[]) => {
    if (urls.length > 0) {
      const firstUrl = urls[0];
      setUrl(firstUrl);
      await processUrl(firstUrl);
    }
  };

  const processUrl = async (inputUrl: string) => {
    if (!inputUrl.trim()) return;

    setIsLoading(true);
    setError(null);
    setShowVideoPreview(false);
    setShowPlaylistPreview(false);
    setCurrentVideoInfo(null);
    setCurrentPlaylistInfo(null);

    try {
      // Usar método estático para evitar imports circulares
      if (playlistService.isPlaylistUrl(inputUrl)) {
        console.log('Processing playlist:', inputUrl);
        const playlistInfo = await playlistService.getPlaylistInfo(inputUrl);
        setCurrentPlaylistInfo(playlistInfo);
        setShowPlaylistPreview(true);
      } else {
        console.log('Processing video:', inputUrl);
        const videoInfo = await downloadService.getVideoInfo(inputUrl, false); // No usar cache en preview
        setCurrentVideoInfo(videoInfo);
        setShowVideoPreview(true);
      }
    } catch (err) {
      console.error('Error processing URL:', err);
      setError(err instanceof Error ? err.message : 'Failed to get video information');
    } finally {
      setIsLoading(false);
    }
  };

  // Detectar plataforma para mostrar indicador
  const detectPlatform = (inputUrl: string): string | null => {
    if (!inputUrl) return null;
    if (inputUrl.includes('youtube.com') || inputUrl.includes('youtu.be')) return 'youtube';
    if (inputUrl.includes('tiktok.com')) return 'tiktok';
    if (inputUrl.includes('twitter.com') || inputUrl.includes('x.com')) return 'twitter';
    if (inputUrl.includes('instagram.com')) return 'instagram';
    if (inputUrl.includes('reddit.com')) return 'reddit';
    if (inputUrl.includes('twitch.tv')) return 'twitch';
    if (inputUrl.includes('facebook.com') || inputUrl.includes('fb.watch')) return 'facebook';
    return null;
  };

  const handleAddToQueue = async (inputUrl?: string) => {
    const targetUrl = inputUrl || url;
    
    if (!targetUrl.trim()) {
      setError('Please enter a valid YouTube URL');
      return;
    }

    if (!currentFolder) {
      setError('Please select a download folder');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Detectar si es playlist
      if (playlistService.isPlaylistUrl(targetUrl)) {
        const playlistInfo = await playlistService.getPlaylistInfo(targetUrl);
        setCurrentPlaylistInfo(playlistInfo);
        setShowPlaylistPreview(true);
      } else {
        // Video individual
        const platform = detectPlatform(targetUrl);
        const videoInfo = await downloadService.getVideoInfo(targetUrl);
        setCurrentVideoInfo(videoInfo);
        
        // Agregar directamente a la cola
        addJob({
          url: targetUrl,
          title: videoInfo.title,
          type: settings.defaultType,
          quality: settings.defaultQuality,
          folder: currentFolder,
          thumbnail: videoInfo.thumbnail,
          duration: videoInfo.duration,
          fileSize: videoInfo.fileSize,
          platform: platform || undefined
        });

        // Limpiar URL después de agregar
        setUrl('');
        setCurrentVideoInfo(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process URL');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVideoDownload = (videoUrl: string, startTime?: number, endTime?: number) => {
    const platform = detectPlatform(videoUrl);
    addJob({
      url: videoUrl,
      title: currentVideoInfo?.title || 'Video Download',
      type: settings.defaultType,
      quality: settings.defaultQuality,
      folder: currentFolder,
      thumbnail: currentVideoInfo?.thumbnail,
      duration: currentVideoInfo?.duration,
      fileSize: currentVideoInfo?.fileSize,
      platform: platform || undefined,
      startTime,
      endTime,
      isClip: startTime !== undefined && endTime !== undefined
    });

    setUrl('');
    setCurrentVideoInfo(null);
  };

  const handlePlaylistDownload = async (selectedUrls: string[]) => {
    // Mostrar loading o notificación
    console.log(`Adding ${selectedUrls.length} videos from playlist to queue...`);

    // Cerrar el modal inmediatamente
    setUrl('');
    setCurrentPlaylistInfo(null);
    setShowPlaylistPreview(false);

    // Obtener info de cada video y agregarlo a la cola
    for (const videoUrl of selectedUrls) {
      try {
        const platform = detectPlatform(videoUrl);
        // Buscar la info del video en currentPlaylistInfo si está disponible
        const videoId = videoUrl.split('v=')[1]?.split('&')[0];
        const playlistVideoInfo = currentPlaylistInfo?.videos.find((v: any) => v.id === videoId);

        if (playlistVideoInfo) {
          // Usar la info de la playlist que ya tenemos
          addJob({
            url: videoUrl,
            title: playlistVideoInfo.title,
            type: settings.defaultType,
            quality: settings.defaultQuality,
            folder: currentFolder,
            thumbnail: playlistVideoInfo.thumbnail,
            duration: playlistVideoInfo.duration,
            fileSize: 'Unknown',
            platform: platform || undefined
          });
        } else {
          // Fallback: obtener info individual (más lento)
          const videoInfo = await downloadService.getVideoInfo(videoUrl, true);
          addJob({
            url: videoUrl,
            title: videoInfo.title,
            type: settings.defaultType,
            quality: settings.defaultQuality,
            folder: currentFolder,
            thumbnail: videoInfo.thumbnail,
            duration: videoInfo.duration,
            fileSize: videoInfo.fileSize,
            platform: platform || undefined
          });
        }
      } catch (error) {
        console.error(`Failed to get info for ${videoUrl}:`, error);
        const platform = detectPlatform(videoUrl);
        // Agregar con info mínima si falla
        addJob({
          url: videoUrl,
          title: 'Video from Playlist',
          type: settings.defaultType,
          quality: settings.defaultQuality,
          folder: currentFolder,
          thumbnail: '',
          duration: 'Unknown',
          fileSize: 'Unknown',
          platform: platform || undefined
        });
      }
    }

    console.log(`${selectedUrls.length} videos added to queue`);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddToQueue();
    }
  };

  const clearError = () => setError(null);
  const currentFolder = customFolder || settings.defaultFolder;

  const detectedPlatform = detectPlatform(url);

  const platformColors: Record<string, string> = {
    youtube: 'border-red-500 ring-red-500/20',
    tiktok: 'border-pink-500 ring-pink-500/20',
    twitter: 'border-blue-400 ring-blue-400/20',
    instagram: 'border-purple-500 ring-purple-500/20',
    reddit: 'border-orange-500 ring-orange-500/20',
    twitch: 'border-violet-500 ring-violet-500/20',
    facebook: 'border-blue-600 ring-blue-600/20',
  };

  // Colores de gradiente para el botón Add to Queue según plataforma
  const platformButtonGradients: Record<string, string> = {
    youtube: 'from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 shadow-red-500/25 hover:shadow-red-500/40',
    tiktok: 'from-black to-gray-900 hover:from-gray-900 hover:to-black shadow-white/10 hover:shadow-white/20 ring-1 ring-white/20',
    twitter: 'from-gray-800 to-black hover:from-gray-700 hover:to-gray-900 shadow-gray-500/25 hover:shadow-gray-500/40',
    instagram: 'from-pink-600 via-purple-600 to-orange-500 hover:from-pink-500 hover:via-purple-500 hover:to-orange-400 shadow-pink-500/25 hover:shadow-pink-500/40',
    reddit: 'from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 shadow-orange-500/25 hover:shadow-orange-500/40',
    twitch: 'from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 shadow-purple-500/25 hover:shadow-purple-500/40',
    facebook: 'from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 shadow-blue-500/25 hover:shadow-blue-500/40',
  };
  
  const defaultButtonGradient = 'from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 shadow-blue-500/25 hover:shadow-blue-500/40';

  return (
    <DropZone onDrop={handleUrlDrop} className="flex-1">
      <div className="flex-1 p-6 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="max-w-4xl mx-auto">
          {/* Header mejorado */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-2xl font-bold text-white">
                Download Videos
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-gray-400 text-sm">Supported platforms:</span>
              <div className="flex items-center gap-2">
                <PlatformIcon platform="youtube" size="sm" />
                <PlatformIcon platform="tiktok" size="sm" />
                <PlatformIcon platform="twitter" size="sm" />
                <PlatformIcon platform="instagram" size="sm" />
                <PlatformIcon platform="reddit" size="sm" />
                <PlatformIcon platform="twitch" size="sm" />
                <PlatformIcon platform="facebook" size="sm" />
              </div>
            </div>
          </div>

          {/* URL Input con diseño mejorado */}
          <div className={`bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 mb-6 border-2 border-dashed transition-all duration-300 ${
            detectedPlatform 
              ? `${platformColors[detectedPlatform]} ring-4` 
              : 'border-gray-600 hover:border-gray-500'
          }`}>
            <div className="space-y-4">
              {/* Platform indicator */}
              {detectedPlatform && (
                <div className="flex items-center gap-2 text-sm">
                  <PlatformIcon platform={detectedPlatform} size="md" />
                  <span className="text-gray-300 capitalize font-medium">
                    {detectedPlatform} Video Detected
                  </span>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="bg-red-900/30 border border-red-500/50 rounded-xl p-4 flex items-center justify-between backdrop-blur-sm">
                  <span className="text-red-300 text-sm">{error}</span>
                  <button
                    onClick={clearError}
                    className="text-red-400 hover:text-red-300 transition-colors"
                  >
                    ×
                  </button>
                </div>
              )}

              {/* URL Field */}
              <div className="flex space-x-4">
                <div className="flex-1 relative group">
                  <LinkIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-400 transition-colors" />
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="Paste video URL here (YouTube, TikTok, Instagram, Twitter...)"
                    className={`w-full bg-gray-900/80 border-2 rounded-xl pl-12 pr-4 py-4 text-white placeholder-gray-500 focus:outline-none transition-all duration-300 ${
                      error 
                        ? 'border-red-500 focus:border-red-400 focus:ring-4 focus:ring-red-500/20' 
                        : detectedPlatform
                          ? `${platformColors[detectedPlatform]?.split(' ')[0]} focus:ring-4`
                          : 'border-gray-600 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20'
                    }`}
                    onKeyPress={handleKeyPress}
                    disabled={isLoading}
                  />
                </div>
                <button 
                  onClick={() => handleAddToQueue()}
                  disabled={isLoading || !url.trim() || !currentFolder}
                  className={`px-8 py-4 rounded-xl font-semibold transition-all duration-300 flex items-center space-x-2 shadow-lg ${
                    isLoading || !url.trim() || !currentFolder
                      ? 'bg-gray-700 text-gray-400 cursor-not-allowed shadow-none'
                      : `bg-gradient-to-r ${detectedPlatform ? platformButtonGradients[detectedPlatform] : defaultButtonGradient} text-white hover:scale-105`
                  }`}
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                      <span>Analyzing...</span>
                    </>
                  ) : (
                    <>
                      <PlusIcon className="w-5 h-5" />
                      <span>Add to Queue</span>
                    </>
                  )}
                </button>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center space-x-3 pt-2">
                <button
                  onClick={() => setShowSubtitleSelector(true)}
                  disabled={!url.trim()}
                  className="flex items-center space-x-2 px-4 py-2.5 bg-purple-600/80 hover:bg-purple-600 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl text-sm font-medium transition-all duration-200 hover:scale-105"
                >
                  <DocumentTextIcon className="w-4 h-4" />
                  <span>Subtitles</span>
                </button>

                <button
                  onClick={() => processUrl(url)}
                  disabled={!url.trim() || isLoading}
                  className="flex items-center space-x-2 px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg text-sm transition-colors"
                >
                  <VideoCameraIcon className="w-4 h-4" />
                  <span>Preview</span>
                </button>
              </div>

              {/* Folder Selector */}
              <div>
                <FolderSelector
                  value={currentFolder}
                  onChange={(folder) => {
                    setCustomFolder(folder);
                    updateSettings({ defaultFolder: folder });
                  }}
                  placeholder="Select download folder..."
                />
              </div>
            </div>
          </div>

          {/* Quick Settings */}
          <div className="bg-gray-800 rounded-lg p-6 mb-6 border border-gray-700">
            <h3 className="text-white font-medium mb-4">Quick Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Download Type</label>
                <select
                  value={settings.defaultType}
                  onChange={(e) => updateSettings({ defaultType: e.target.value as any })}
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white"
                >
                  <option value="video-audio">Video + Audio</option>
                  <option value="video">Video Only</option>
                  <option value="audio">Audio Only</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Quality</label>
                <select
                  value={settings.defaultQuality}
                  onChange={(e) => updateSettings({ defaultQuality: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white"
                >
                  <option value="best">Best Available</option>
                  <option value="1080p">1080p</option>
                  <option value="720p">720p</option>
                  <option value="480p">480p</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Max Concurrent</label>
                <select
                  value={settings.maxConcurrent}
                  onChange={(e) => updateSettings({ maxConcurrent: parseInt(e.target.value) })}
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white"
                >
                  <option value="1">1 Download</option>
                  <option value="2">2 Downloads</option>
                  <option value="3">3 Downloads</option>
                  <option value="4">4 Downloads</option>
                </select>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-blue-900/20 border border-blue-500/50 rounded-lg p-4">
            <h4 className="text-blue-300 font-medium mb-2">Tips</h4>
            <ul className="text-blue-200 text-sm space-y-1">
              <li>• Copy YouTube URLs and paste them with Ctrl+V</li>
              <li>• Drag URLs directly from your browser address bar</li>
              <li>• Supports individual videos and playlists</li>
              <li>• Use keyboard shortcuts to speed up your workflow</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showSubtitleSelector && (
        <SubtitleSelector
          videoUrl={url}
          isVisible={showSubtitleSelector}
          onClose={() => setShowSubtitleSelector(false)}
          onSelect={async (languages, options) => {
            console.log('Selected subtitles:', languages, options);

            if (!currentFolder) {
              setError('Please select a download folder first');
              return;
            }

            // Crear argumentos para yt-dlp
            const subtitleArgs: string[] = ['--skip-download'];

            // Especificar idiomas
            if (languages.length > 0) {
              subtitleArgs.push('--sub-langs', languages.join(','));
            }

            // Escribir subtítulos
            if (options.downloadSeparate) {
              subtitleArgs.push('--write-subs');
              if (options.autoGenerated) {
                subtitleArgs.push('--write-auto-subs');
              }
              subtitleArgs.push('--sub-format', options.format);
            }

            // Output path
            subtitleArgs.push('-o', `${currentFolder}/%(title)s.%(ext)s`);
            subtitleArgs.push(url);

            try {
              // Ejecutar descarga de subtítulos
              const process = electronApi.spawn('yt-dlp', subtitleArgs);

              process.on('close', (code: number) => {
                if (code === 0) {
                  console.log('✅ Subtitles downloaded successfully');
                } else {
                  console.error('❌ Subtitle download failed');
                }
              });

              setShowSubtitleSelector(false);
              setUrl('');
            } catch (error) {
              console.error('Error downloading subtitles:', error);
              setError('Failed to download subtitles');
            }
          }}
        />
      )}

      {showPlaylistPreview && currentPlaylistInfo && (
        <PlaylistPreview
          playlistInfo={currentPlaylistInfo}
          onClose={() => setShowPlaylistPreview(false)}
          onAddToQueue={handlePlaylistDownload}
        />
      )}

      {showVideoPreview && currentVideoInfo && (
        <VideoPreview
          videoInfo={currentVideoInfo}
          url={url}
          onClose={() => setShowVideoPreview(false)}
          onDownload={handleVideoDownload}
        />
      )}
    </DropZone>
  );
}