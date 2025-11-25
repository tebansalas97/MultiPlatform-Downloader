import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  PlayIcon,
  PauseIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  ArrowsPointingOutIcon,
  ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/solid';
import { PlatformIcon } from '../ui/PlatformIcon';
import { electronApi } from '../../utils/electronApi';

interface VideoPlayerProps {
  url: string;
  thumbnail?: string;
  platform: string;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onReady?: (duration: number) => void;
  startTime?: number;
  className?: string;
}

// ============================================
// YOUTUBE EMBED (videos regulares y Shorts)
// ============================================
interface YouTubeEmbedProps {
  videoId: string;
  isShort?: boolean;
  onTimeUpdate?: (time: number, duration: number) => void;
  onReady?: (duration: number) => void;
}

function YouTubeEmbed({ videoId, isShort = false, onReady }: YouTubeEmbedProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    onReady?.(0);
  }, [onReady]);

  return (
    <div className="relative w-full h-full bg-black">
      {!isPlaying ? (
        <div 
          className="absolute inset-0 cursor-pointer group"
          onClick={() => setIsPlaying(true)}
        >
          <img
            src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
            alt="Video thumbnail"
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
            }}
          />
          <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors flex items-center justify-center">
            <div className="bg-red-600 p-4 rounded-full group-hover:scale-110 transition-transform shadow-lg">
              <PlayIcon className="w-12 h-12 text-white" />
            </div>
          </div>
          <div className="absolute bottom-3 left-3 flex items-center gap-2 px-3 py-1.5 bg-black/70 rounded-lg">
            <PlatformIcon platform="youtube" size="sm" />
            <span className="text-white text-sm font-medium">
              {isShort ? 'YouTube Short' : 'YouTube'}
            </span>
          </div>
        </div>
      ) : (
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&enablejsapi=1`}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="YouTube video player"
        />
      )}
    </div>
  );
}

// ============================================
// TIKTOK EMBED
// ============================================
function TikTokEmbed({ 
  videoUrl, 
  thumbnail,
  onReady 
}: { 
  videoUrl: string;
  thumbnail?: string;
  onReady?: (duration: number) => void;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoId, setVideoId] = useState<string | null>(null);

  useEffect(() => {
    // Extraer video ID de TikTok URL
    const match = videoUrl.match(/\/video\/(\d+)/);
    if (match) {
      setVideoId(match[1]);
    }
    onReady?.(0);
  }, [videoUrl, onReady]);

  if (!videoId) {
    return <ThumbnailPreview url={videoUrl} thumbnail={thumbnail} platform="tiktok" />;
  }

  return (
    <div className="relative w-full h-full bg-black">
      {!isPlaying ? (
        <div 
          className="absolute inset-0 cursor-pointer group"
          onClick={() => setIsPlaying(true)}
        >
          {thumbnail ? (
            <img src={thumbnail} alt="TikTok thumbnail" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-black">
              <PlatformIcon platform="tiktok" size="xl" className="w-24 h-24 opacity-30" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors flex items-center justify-center">
            <div className="bg-black p-4 rounded-full group-hover:scale-110 transition-transform shadow-lg border-2 border-white/20">
              <PlayIcon className="w-12 h-12 text-white" />
            </div>
          </div>
          <div className="absolute bottom-3 left-3 flex items-center gap-2 px-3 py-1.5 bg-black/70 rounded-lg">
            <PlatformIcon platform="tiktok" size="sm" />
            <span className="text-white text-sm font-medium">TikTok</span>
          </div>
        </div>
      ) : (
        <iframe
          src={`https://www.tiktok.com/embed/v2/${videoId}`}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="TikTok video player"
        />
      )}
    </div>
  );
}

// ============================================
// TWITTER/X EMBED (usando iframe de publish.twitter.com)
// ============================================
function TwitterEmbed({ 
  videoUrl, 
  thumbnail,
  onReady 
}: { 
  videoUrl: string;
  thumbnail?: string;
  onReady?: (duration: number) => void;
}) {
  const [tweetId, setTweetId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  useEffect(() => {
    // Extraer tweet ID - soporta twitter.com y x.com
    const match = videoUrl.match(/(?:twitter\.com|x\.com)\/(?:\w+)\/status\/(\d+)/);
    if (match) {
      setTweetId(match[1]);
    }
    onReady?.(0);
  }, [videoUrl, onReady]);

  if (!tweetId) {
    return <ThumbnailPreview url={videoUrl} thumbnail={thumbnail} platform="twitter" />;
  }

  // URL del embed de Twitter (twttr.com es el dominio oficial de embeds)
  const embedUrl = `https://platform.twitter.com/embed/Tweet.html?id=${tweetId}&theme=dark&hideCard=false&hideThread=false`;

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      {!loaded ? (
        <div 
          className="absolute inset-0 cursor-pointer group"
          onClick={() => setLoaded(true)}
        >
          {thumbnail ? (
            <img src={thumbnail} alt="Twitter thumbnail" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
              <PlatformIcon platform="twitter" size="xl" className="w-24 h-24 opacity-30" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors flex items-center justify-center">
            <div className="bg-black p-4 rounded-full group-hover:scale-110 transition-transform shadow-lg border border-gray-600">
              <PlayIcon className="w-12 h-12 text-white" />
            </div>
          </div>
          <div className="absolute bottom-3 left-3 flex items-center gap-2 px-3 py-1.5 bg-black/70 rounded-lg">
            <PlatformIcon platform="twitter" size="sm" />
            <span className="text-white text-sm font-medium">Twitter/X</span>
          </div>
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-black">
          {!iframeLoaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent" />
            </div>
          )}
          <iframe
            src={embedUrl}
            className="w-full h-full border-0"
            style={{ minHeight: '400px' }}
            allowFullScreen
            allow="autoplay; encrypted-media"
            onLoad={() => setIframeLoaded(true)}
            title="Twitter embed"
          />
        </div>
      )}
    </div>
  );
}

// ============================================
// INSTAGRAM EMBED (usando iframe directo)
// ============================================
function InstagramEmbed({ 
  videoUrl, 
  thumbnail,
  onReady 
}: { 
  videoUrl: string;
  thumbnail?: string;
  onReady?: (duration: number) => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const [postId, setPostId] = useState<string | null>(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  useEffect(() => {
    // Extraer post ID de Instagram (p, reel, reels)
    const match = videoUrl.match(/instagram\.com\/(?:p|reel|reels)\/([A-Za-z0-9_-]+)/);
    if (match) {
      setPostId(match[1]);
    }
    onReady?.(0);
  }, [videoUrl, onReady]);

  if (!postId) {
    return <ThumbnailPreview url={videoUrl} thumbnail={thumbnail} platform="instagram" />;
  }

  // URL del embed de Instagram
  const embedUrl = `https://www.instagram.com/p/${postId}/embed/captioned/`;

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      {!loaded ? (
        <div 
          className="absolute inset-0 cursor-pointer group"
          onClick={() => setLoaded(true)}
        >
          {thumbnail ? (
            <img src={thumbnail} alt="Instagram thumbnail" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900 to-pink-900">
              <PlatformIcon platform="instagram" size="xl" className="w-24 h-24 opacity-30" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors flex items-center justify-center">
            <div className="bg-gradient-to-br from-purple-600 to-pink-500 p-4 rounded-full group-hover:scale-110 transition-transform shadow-lg">
              <PlayIcon className="w-12 h-12 text-white" />
            </div>
          </div>
          <div className="absolute bottom-3 left-3 flex items-center gap-2 px-3 py-1.5 bg-black/70 rounded-lg">
            <PlatformIcon platform="instagram" size="sm" />
            <span className="text-white text-sm font-medium">Instagram</span>
          </div>
          <div className="absolute top-3 right-3 px-2 py-1 bg-yellow-600/90 text-yellow-100 text-xs rounded-lg">
            ⚠️ Puede requerir login
          </div>
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-black overflow-hidden">
          {!iframeLoaded && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-pink-500 border-t-transparent" />
              <p className="text-gray-400 text-sm">Cargando embed de Instagram...</p>
              <p className="text-gray-500 text-xs">Nota: Algunos contenidos requieren login</p>
            </div>
          )}
          {/* Contenedor que escala el iframe para que quepa */}
          <div 
            className="relative flex items-center justify-center"
            style={{ 
              width: '100%',
              height: '100%',
              maxWidth: '400px', // Limitar ancho para videos verticales
              margin: '0 auto'
            }}
          >
            <iframe
              src={embedUrl}
              className="border-0 rounded-lg"
              style={{ 
                width: '100%',
                height: '100%',
                maxHeight: '100%',
                transform: 'scale(0.85)', // Escalar para que quepa
                transformOrigin: 'center center'
              }}
              allowFullScreen
              allow="autoplay; encrypted-media"
              onLoad={() => setIframeLoaded(true)}
              title="Instagram embed"
              scrolling="no"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// NATIVE VIDEO PLAYER (for direct streams)
// ============================================
function NativeVideoPlayer({
  streamUrl,
  thumbnail,
  platform,
  onTimeUpdate,
  onReady
}: {
  streamUrl: string;
  thumbnail?: string;
  platform: string;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onReady?: (duration: number) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, _setVolume] = useState(1); // eslint-disable-line @typescript-eslint/no-unused-vars
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      const videoDuration = videoRef.current.duration;
      setDuration(videoDuration);
      onReady?.(videoDuration);
    }
  }, [onReady]);

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      const time = videoRef.current.currentTime;
      setCurrentTime(time);
      onTimeUpdate?.(time, duration);
    }
  }, [duration, onTimeUpdate]);

  const togglePlay = useCallback(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(err => {
          setError('No se pudo reproducir el video');
          console.error('Play error:', err);
        });
      }
    }
  }, [isPlaying]);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (videoRef.current && duration > 0) {
      const rect = e.currentTarget.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      const newTime = percent * duration;
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  }, [duration]);

  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  }, [isMuted]);

  const toggleFullscreen = useCallback(() => {
    if (containerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        containerRef.current.requestFullscreen();
      }
    }
  }, []);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
    }
  }, [isPlaying]);

  if (error) {
    return <ThumbnailPreview url={streamUrl} thumbnail={thumbnail} platform={platform} error={error} />;
  }

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full bg-black group"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      <video
        ref={videoRef}
        src={streamUrl}
        className="w-full h-full object-contain"
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        onError={() => setError('Error al cargar el video')}
        onClick={togglePlay}
        playsInline
        poster={thumbnail}
      />

      {/* Play/Pause overlay */}
      {!isPlaying && (
        <div 
          className="absolute inset-0 flex items-center justify-center cursor-pointer bg-black/20"
          onClick={togglePlay}
        >
          <div className="bg-white/20 backdrop-blur-sm p-5 rounded-full hover:bg-white/30 transition-all hover:scale-110">
            <PlayIcon className="w-12 h-12 text-white" />
          </div>
        </div>
      )}

      {/* Controls */}
      <div 
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Progress bar */}
        <div 
          className="relative h-1.5 bg-gray-600/50 rounded-full cursor-pointer mb-3 group/progress"
          onClick={handleSeek}
        >
          <div 
            className="absolute h-full bg-blue-500 rounded-full"
            style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
          />
        </div>

        {/* Controls row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={togglePlay} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              {isPlaying ? (
                <PauseIcon className="w-6 h-6 text-white" />
              ) : (
                <PlayIcon className="w-6 h-6 text-white" />
              )}
            </button>

            <button onClick={toggleMute} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              {isMuted || volume === 0 ? (
                <SpeakerXMarkIcon className="w-5 h-5 text-white" />
              ) : (
                <SpeakerWaveIcon className="w-5 h-5 text-white" />
              )}
            </button>

            <div className="text-white text-sm font-mono">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2 py-1 bg-white/10 rounded-lg">
              <PlatformIcon platform={platform} size="sm" />
              <span className="text-white text-xs capitalize">{platform}</span>
            </div>

            <button onClick={toggleFullscreen} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <ArrowsPointingOutIcon className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// THUMBNAIL PREVIEW (Fallback)
// ============================================
function ThumbnailPreview({ 
  url, 
  thumbnail, 
  platform,
  error
}: { 
  url: string; 
  thumbnail?: string; 
  platform: string;
  error?: string;
}) {
  const [imageError, setImageError] = useState(false);
  const [proxyThumbnail, setProxyThumbnail] = useState<string | null>(null);

  // Intentar cargar thumbnail via proxy si es necesario
  useEffect(() => {
    if (thumbnail && electronApi.isElectron) {
      electronApi.fetchImage(thumbnail).then(dataUrl => {
        if (dataUrl) setProxyThumbnail(dataUrl);
      });
    }
  }, [thumbnail]);

  const openInBrowser = () => {
    window.open(url, '_blank');
  };

  const displayThumbnail = proxyThumbnail || thumbnail;

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-gray-800 to-gray-900">
      {displayThumbnail && !imageError ? (
        <img
          src={displayThumbnail}
          alt="Video thumbnail"
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <PlatformIcon platform={platform} size="xl" className="w-24 h-24 opacity-30" />
        </div>
      )}
      
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center cursor-pointer group hover:bg-black/50 transition-colors"
        onClick={openInBrowser}
      >
        <div className="bg-white/20 backdrop-blur-sm p-5 rounded-full group-hover:bg-white/30 transition-all group-hover:scale-110 mb-4">
          <PlayIcon className="w-12 h-12 text-white" />
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-black/60 rounded-lg">
          <ArrowTopRightOnSquareIcon className="w-4 h-4 text-gray-300" />
          <span className="text-white text-sm">Ver en {platform}</span>
        </div>
        {error && (
          <p className="mt-2 text-red-400 text-xs">{error}</p>
        )}
      </div>

      {/* Platform badge */}
      <div className="absolute bottom-3 left-3 flex items-center gap-2 px-3 py-1.5 bg-black/70 rounded-lg">
        <PlatformIcon platform={platform} size="sm" />
        <span className="text-white text-sm font-medium capitalize">{platform}</span>
      </div>
    </div>
  );
}

// ============================================
// PROXY VIDEO PLAYER (loads via Electron)
// ============================================
function ProxyVideoPlayer({
  url,
  thumbnail,
  platform,
  onTimeUpdate,
  onReady
}: {
  url: string;
  thumbnail?: string;
  platform: string;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onReady?: (duration: number) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadStream = async () => {
      setLoading(true);
      setError(null);

      try {
        // Primero obtener la URL del stream
        console.log('🎬 Getting stream URL for:', url);
        const streamResult = await electronApi.getStreamUrl(url);

        if (!mounted) return;

        if (streamResult.success && streamResult.videoUrl) {
          console.log('✅ Got stream URL, attempting proxy...');
          
          // Intentar hacer proxy del stream
          const proxyResult = await electronApi.proxyVideoStream(streamResult.videoUrl);

          if (!mounted) return;

          if (proxyResult.success && proxyResult.dataUrl) {
            console.log('✅ Video proxied successfully, size:', proxyResult.size);
            setStreamUrl(proxyResult.dataUrl);
          } else {
            // Si el proxy falla, usar URL directa (puede no funcionar por CORS)
            console.log('⚠️ Proxy failed, trying direct URL');
            setStreamUrl(streamResult.videoUrl);
          }
        } else {
          setError(streamResult.error || 'No se pudo obtener el stream');
        }
      } catch (err) {
        if (mounted) {
          console.error('Error loading stream:', err);
          setError('Error al cargar el video');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    if (electronApi.isElectron) {
      loadStream();
    } else {
      setLoading(false);
      setError('Reproducción solo disponible en la app de escritorio');
    }

    return () => {
      mounted = false;
    };
  }, [url]);

  if (loading) {
    return (
      <div className="relative w-full h-full bg-black flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mb-4" />
        <p className="text-gray-400 text-sm">Cargando video...</p>
        <p className="text-gray-500 text-xs mt-1">Obteniendo stream de {platform}</p>
      </div>
    );
  }

  if (error || !streamUrl) {
    return <ThumbnailPreview url={url} thumbnail={thumbnail} platform={platform} error={error || undefined} />;
  }

  return (
    <NativeVideoPlayer
      streamUrl={streamUrl}
      thumbnail={thumbnail}
      platform={platform}
      onTimeUpdate={onTimeUpdate}
      onReady={onReady}
    />
  );
}

// ============================================
// REDDIT EMBED
// ============================================
function RedditEmbed({ 
  videoUrl, 
  thumbnail,
  onReady 
}: { 
  videoUrl: string;
  thumbnail?: string;
  onReady?: (duration: number) => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  useEffect(() => {
    onReady?.(0);
  }, [onReady]);

  // Extraer pathname de la URL de Reddit
  const getRedditPath = () => {
    try {
      const url = new URL(videoUrl);
      return url.pathname;
    } catch {
      return videoUrl;
    }
  };

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      {!loaded ? (
        <div 
          className="absolute inset-0 cursor-pointer group"
          onClick={() => setLoaded(true)}
        >
          {thumbnail ? (
            <img src={thumbnail} alt="Reddit thumbnail" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-900 to-red-900">
              <PlatformIcon platform="reddit" size="xl" className="w-24 h-24 opacity-30" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors flex items-center justify-center">
            <div className="bg-orange-500 p-4 rounded-full group-hover:scale-110 transition-transform shadow-lg">
              <PlayIcon className="w-12 h-12 text-white" />
            </div>
          </div>
          <div className="absolute bottom-3 left-3 flex items-center gap-2 px-3 py-1.5 bg-black/70 rounded-lg">
            <PlatformIcon platform="reddit" size="sm" />
            <span className="text-white text-sm font-medium">Reddit</span>
          </div>
          <div className="absolute top-3 right-3 px-2 py-1 bg-orange-600/90 text-orange-100 text-xs rounded-lg">
            Click para abrir embed
          </div>
        </div>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 to-black">
          {!iframeLoaded && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-500 border-t-transparent" />
              <p className="text-gray-400 text-sm">Cargando Reddit...</p>
            </div>
          )}
          {/* Reddit embed iframe */}
          <iframe
            src={`https://www.redditmedia.com${getRedditPath()}?ref_source=embed&embed=true`}
            className="w-full h-full border-0"
            style={{ minHeight: '400px' }}
            sandbox="allow-scripts allow-same-origin allow-popups"
            allowFullScreen
            onLoad={() => setIframeLoaded(true)}
            onError={() => {
              // Si falla el embed, abrir en navegador
              setIframeLoaded(true);
            }}
            title="Reddit embed"
          />
          {/* Botón alternativo para abrir en navegador */}
          <div className="absolute bottom-3 right-3">
            <button
              onClick={() => window.open(videoUrl, '_blank')}
              className="flex items-center gap-2 px-3 py-2 bg-orange-600 hover:bg-orange-500 text-white text-sm rounded-lg transition-colors"
            >
              <ArrowTopRightOnSquareIcon className="w-4 h-4" />
              Ver en Reddit
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// MAIN VIDEO PLAYER COMPONENT
// ============================================
export function VideoPlayer({
  url,
  thumbnail,
  platform,
  onTimeUpdate,
  onReady,
  className = ''
}: VideoPlayerProps) {
  
  // Detectar tipo de contenido
  const isYouTube = platform === 'youtube' || url.includes('youtube.com') || url.includes('youtu.be');
  const isYouTubeShort = url.includes('/shorts/');
  const isTikTok = platform === 'tiktok' || url.includes('tiktok.com');
  const isTwitter = platform === 'twitter' || url.includes('twitter.com') || url.includes('x.com');
  const isInstagram = platform === 'instagram' || url.includes('instagram.com');
  const isReddit = platform === 'reddit' || url.includes('reddit.com') || url.includes('redd.it');
  
  // Extraer YouTube video ID
  const extractYouTubeId = (videoUrl: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    ];
    for (const pattern of patterns) {
      const match = videoUrl.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const youtubeId = isYouTube ? extractYouTubeId(url) : null;

  // Determinar aspect ratio - Instagram y TikTok son verticales
  const isVerticalContent = isInstagram || isTikTok || isYouTubeShort;
  const aspectClass = isVerticalContent ? 'aspect-[9/16] max-h-[450px] mx-auto' : 'aspect-video';

  return (
    <div className={`relative bg-black rounded-xl overflow-hidden ${className}`}>
      <div className={aspectClass}>
        {/* YouTube (incluyendo Shorts) */}
        {isYouTube && youtubeId ? (
          <YouTubeEmbed 
            videoId={youtubeId} 
            isShort={isYouTubeShort}
            onTimeUpdate={onTimeUpdate}
            onReady={onReady}
          />
        ) : isTikTok ? (
          <TikTokEmbed 
            videoUrl={url}
            thumbnail={thumbnail}
            onReady={onReady}
          />
        ) : isTwitter ? (
          <TwitterEmbed 
            videoUrl={url}
            thumbnail={thumbnail}
            onReady={onReady}
          />
        ) : isInstagram ? (
          <InstagramEmbed 
            videoUrl={url}
            thumbnail={thumbnail}
            onReady={onReady}
          />
        ) : isReddit ? (
          <RedditEmbed 
            videoUrl={url}
            thumbnail={thumbnail}
            onReady={onReady}
          />
        ) : electronApi.isElectron ? (
          /* Para otras plataformas, intentar proxy */
          <ProxyVideoPlayer 
            url={url}
            thumbnail={thumbnail}
            platform={platform}
            onTimeUpdate={onTimeUpdate}
            onReady={onReady}
          />
        ) : (
          /* Fallback a thumbnail */
          <ThumbnailPreview 
            url={url} 
            thumbnail={thumbnail} 
            platform={platform} 
          />
        )}
      </div>
    </div>
  );
}

export default VideoPlayer;
