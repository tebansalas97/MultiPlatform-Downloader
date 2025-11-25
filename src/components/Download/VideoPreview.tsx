import React, { useState, useEffect, useCallback } from 'react';
import { 
  XMarkIcon, 
  ScissorsIcon, 
  PlayIcon,
  ClockIcon,
  UserIcon,
  EyeIcon,
  HeartIcon,
  CalendarIcon,
  FilmIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { VideoInfo } from '../../types';
import { platformService } from '../../services/platforms/PlatformService';
import { PlatformIcon } from '../ui/PlatformIcon';
import { VideoPlayer } from './VideoPlayer';

interface VideoPreviewProps {
  videoInfo: VideoInfo;
  url: string;
  onClose: () => void;
  onDownload: (url: string, startTime?: number, endTime?: number) => void;
}

// Colores por plataforma - Diseño más limpio
const PLATFORM_STYLES: Record<string, { bg: string; accent: string; border: string }> = {
  youtube: { bg: 'bg-red-500/10', accent: 'bg-red-600', border: 'border-red-500/30' },
  tiktok: { bg: 'bg-gray-500/10', accent: 'bg-gray-700', border: 'border-gray-500/30' },
  twitter: { bg: 'bg-blue-500/10', accent: 'bg-blue-500', border: 'border-blue-500/30' },
  instagram: { bg: 'bg-pink-500/10', accent: 'bg-pink-600', border: 'border-pink-500/30' },
  reddit: { bg: 'bg-orange-500/10', accent: 'bg-orange-600', border: 'border-orange-500/30' },
  twitch: { bg: 'bg-purple-500/10', accent: 'bg-purple-600', border: 'border-purple-500/30' },
  facebook: { bg: 'bg-blue-600/10', accent: 'bg-blue-600', border: 'border-blue-600/30' },
  default: { bg: 'bg-gray-500/10', accent: 'bg-gray-600', border: 'border-gray-500/30' }
};

export function VideoPreview({ videoInfo, url, onClose, onDownload }: VideoPreviewProps) {
  // Estados principales
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [clipEnabled, setClipEnabled] = useState(false);
  const [clipStart, setClipStart] = useState(0);
  const [clipEnd, setClipEnd] = useState(0);
  const [startInput, setStartInput] = useState('0:00');
  const [endInput, setEndInput] = useState('0:00');
  const [currentVideoTime, setCurrentVideoTime] = useState(0);

  // Detectar plataforma
  const platform = platformService.detectPlatform(url);
  const platformType = platform?.type || 'default';
  const styles = PLATFORM_STYLES[platformType] || PLATFORM_STYLES.default;

  // Callback cuando el video actualiza el tiempo
  const handleVideoTimeUpdate = useCallback((time: number, duration: number) => {
    setCurrentVideoTime(time);
  }, []);

  // Callback cuando el reproductor está listo
  const handleVideoReady = useCallback((duration: number) => {
    setTotalSeconds(duration);
    setClipEnd(duration);
    setEndInput(formatSecondsToTime(duration));
  }, []);

  // Parsear duración inicial (backup si el video no carga)
  useEffect(() => {
    if (videoInfo.duration && totalSeconds === 0) {
      const seconds = parseTimeToSeconds(videoInfo.duration);
      setTotalSeconds(seconds);
      setClipEnd(seconds);
      setEndInput(formatSecondsToTime(seconds));
    }
  }, [videoInfo.duration, totalSeconds]);

  // Usar tiempo actual del video para establecer clip
  const setClipStartFromVideo = useCallback(() => {
    setClipStart(currentVideoTime);
    setStartInput(formatSecondsToTime(currentVideoTime));
  }, [currentVideoTime]);

  const setClipEndFromVideo = useCallback(() => {
    setClipEnd(currentVideoTime);
    setEndInput(formatSecondsToTime(currentVideoTime));
  }, [currentVideoTime]);

  // Funciones de utilidad
  function parseTimeToSeconds(timeStr: string): number {
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }
    return parseInt(timeStr) || 0;
  }

  function formatSecondsToTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  function formatNumber(num: number | undefined): string {
    if (!num) return '—';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  }

  // Validar y actualizar tiempo de inicio
  const handleStartTimeChange = useCallback((value: string) => {
    setStartInput(value);
    const seconds = parseTimeToSeconds(value);
    if (!isNaN(seconds) && seconds >= 0 && seconds < clipEnd) {
      setClipStart(seconds);
    }
  }, [clipEnd]);

  // Validar y actualizar tiempo de fin
  const handleEndTimeChange = useCallback((value: string) => {
    setEndInput(value);
    const seconds = parseTimeToSeconds(value);
    if (!isNaN(seconds) && seconds > clipStart && seconds <= totalSeconds) {
      setClipEnd(seconds);
    }
  }, [clipStart, totalSeconds]);

  // Al cambiar slider de inicio
  const handleStartSlider = useCallback((value: number) => {
    setClipStart(value);
    setStartInput(formatSecondsToTime(value));
    // Si inicio >= fin, ajustar fin
    if (value >= clipEnd) {
      const newEnd = Math.min(value + 1, totalSeconds);
      setClipEnd(newEnd);
      setEndInput(formatSecondsToTime(newEnd));
    }
  }, [clipEnd, totalSeconds]);

  // Al cambiar slider de fin
  const handleEndSlider = useCallback((value: number) => {
    setClipEnd(value);
    setEndInput(formatSecondsToTime(value));
  }, []);

  // Reset clip cuando se desactiva
  useEffect(() => {
    if (!clipEnabled) {
      setClipStart(0);
      setClipEnd(totalSeconds);
      setStartInput('0:00');
      setEndInput(formatSecondsToTime(totalSeconds));
    }
  }, [clipEnabled, totalSeconds]);

  // Manejar descarga
  const handleDownload = () => {
    if (clipEnabled && clipStart < clipEnd) {
      console.log(`📹 Descargando clip: ${formatSecondsToTime(clipStart)} - ${formatSecondsToTime(clipEnd)}`);
      onDownload(url, clipStart, clipEnd);
    } else {
      onDownload(url);
    }
    onClose();
  };

  const clipDuration = clipEnd - clipStart;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-gray-800 overflow-hidden">
        
        {/* Header */}
        <div className={`relative ${styles.bg} border-b ${styles.border}`}>
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center">
                <PlatformIcon platform={platformType} size="lg" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-white truncate">{videoInfo.title}</h2>
                <div className="flex items-center space-x-2 text-sm text-gray-400">
                  <span>{platform?.getDisplayName() || 'Video'}</span>
                  {videoInfo.uploader && (
                    <>
                      <span className="text-gray-600">•</span>
                      <span className="truncate">{videoInfo.uploader}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="ml-4 p-2 hover:bg-white/10 rounded-xl transition-colors flex-shrink-0"
            >
              <XMarkIcon className="w-6 h-6 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Contenido scrolleable */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            
            {/* Preview del video - Reproductor funcional */}
            <VideoPlayer
              url={url}
              thumbnail={videoInfo.thumbnail}
              platform={platformType}
              onTimeUpdate={handleVideoTimeUpdate}
              onReady={handleVideoReady}
              className="aspect-video"
            />

            {/* Stats del video */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard 
                icon={<ClockIcon className="w-5 h-5" />}
                label="Duración"
                value={videoInfo.duration || '—'}
              />
              <StatCard 
                icon={<UserIcon className="w-5 h-5" />}
                label="Autor"
                value={videoInfo.uploader || '—'}
              />
              {videoInfo.views !== undefined && (
                <StatCard 
                  icon={<EyeIcon className="w-5 h-5" />}
                  label="Vistas"
                  value={formatNumber(videoInfo.views)}
                />
              )}
              {videoInfo.likes !== undefined && (
                <StatCard 
                  icon={<HeartIcon className="w-5 h-5" />}
                  label="Likes"
                  value={formatNumber(videoInfo.likes)}
                />
              )}
              {videoInfo.fileSize && (
                <StatCard 
                  icon={<FilmIcon className="w-5 h-5" />}
                  label="Tamaño"
                  value={videoInfo.fileSize}
                />
              )}
              {videoInfo.uploadDate && (
                <StatCard 
                  icon={<CalendarIcon className="w-5 h-5" />}
                  label="Fecha"
                  value={videoInfo.uploadDate}
                />
              )}
            </div>

            {/* ============ SECCIÓN DE RECORTE (MEJORADA) ============ */}
            <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 overflow-hidden">
              {/* Header de la sección */}
              <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
                <label className="flex items-center space-x-3 cursor-pointer select-none">
                  <div className={`relative w-12 h-7 rounded-full transition-colors ${clipEnabled ? styles.accent : 'bg-gray-700'}`}>
                    <input
                      type="checkbox"
                      checked={clipEnabled}
                      onChange={(e) => setClipEnabled(e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${clipEnabled ? 'translate-x-5' : ''}`} />
                  </div>
                  <div className="flex items-center space-x-2">
                    <ScissorsIcon className="w-5 h-5 text-gray-400" />
                    <span className="font-medium text-white">Recortar Video (Clip)</span>
                  </div>
                </label>
                
                {clipEnabled && totalSeconds > 0 && (
                  <span className="text-sm bg-gray-700 px-3 py-1 rounded-full text-gray-300">
                    Clip: <span className="text-white font-mono">{formatSecondsToTime(clipDuration)}</span>
                  </span>
                )}
              </div>

              {/* Controles de recorte */}
              {clipEnabled && totalSeconds > 0 && (
                <div className="p-4 space-y-5">
                  {/* Aviso sobre recorte */}
                  <div className="flex items-start space-x-2 text-xs text-amber-400/80 bg-amber-500/10 p-3 rounded-lg">
                    <ExclamationTriangleIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>El recorte se realiza después de la descarga usando FFmpeg. Requiere FFmpeg instalado.</span>
                  </div>

                  {/* Controles de tiempo */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Inicio */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm text-gray-400">Inicio</label>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={setClipStartFromVideo}
                            className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                            title="Usar tiempo actual del video"
                          >
                            Actual
                          </button>
                          <input
                            type="text"
                            value={startInput}
                            onChange={(e) => handleStartTimeChange(e.target.value)}
                            onBlur={() => setStartInput(formatSecondsToTime(clipStart))}
                            placeholder="0:00"
                            className="w-20 bg-gray-900 border border-gray-700 rounded-lg px-2 py-1 text-sm text-white font-mono text-center focus:border-blue-500 focus:outline-none"
                          />
                        </div>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max={totalSeconds}
                        value={clipStart}
                        onChange={(e) => handleStartSlider(parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                      />
                    </div>

                    {/* Fin */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm text-gray-400">Fin</label>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={setClipEndFromVideo}
                            className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                            title="Usar tiempo actual del video"
                          >
                            Actual
                          </button>
                          <input
                            type="text"
                            value={endInput}
                            onChange={(e) => handleEndTimeChange(e.target.value)}
                            onBlur={() => setEndInput(formatSecondsToTime(clipEnd))}
                            placeholder="0:00"
                            className="w-20 bg-gray-900 border border-gray-700 rounded-lg px-2 py-1 text-sm text-white font-mono text-center focus:border-blue-500 focus:outline-none"
                          />
                        </div>
                      </div>
                      <input
                        type="range"
                        min={clipStart}
                        max={totalSeconds}
                        value={clipEnd}
                        onChange={(e) => handleEndSlider(parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                      />
                    </div>
                  </div>

                  {/* Indicador de tiempo actual del video */}
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
                    <PlayIcon className="w-4 h-4" />
                    <span>Tiempo actual: <span className="text-white font-mono">{formatSecondsToTime(currentVideoTime)}</span></span>
                  </div>

                  {/* Barra visual de selección */}
                  <div className="relative">
                    <div className="text-xs text-gray-500 flex justify-between mb-1">
                      <span>0:00</span>
                      <span>{formatSecondsToTime(totalSeconds)}</span>
                    </div>
                    <div className="relative h-10 bg-gray-700 rounded-lg overflow-hidden">
                      {/* Track completo */}
                      <div className="absolute inset-0 bg-gray-700" />
                      
                      {/* Área seleccionada */}
                      <div 
                        className={`absolute h-full ${styles.accent} opacity-60`}
                        style={{
                          left: `${(clipStart / totalSeconds) * 100}%`,
                          width: `${((clipEnd - clipStart) / totalSeconds) * 100}%`
                        }}
                      />
                      
                      {/* Marcador de inicio */}
                      <div 
                        className="absolute top-0 bottom-0 w-1 bg-white rounded shadow-lg cursor-ew-resize"
                        style={{ left: `calc(${(clipStart / totalSeconds) * 100}% - 2px)` }}
                      >
                        <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-white bg-gray-900 px-1 rounded whitespace-nowrap">
                          {formatSecondsToTime(clipStart)}
                        </div>
                      </div>
                      
                      {/* Marcador de fin */}
                      <div 
                        className="absolute top-0 bottom-0 w-1 bg-white rounded shadow-lg cursor-ew-resize"
                        style={{ left: `calc(${(clipEnd / totalSeconds) * 100}% - 2px)` }}
                      >
                        <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-white bg-gray-900 px-1 rounded whitespace-nowrap">
                          {formatSecondsToTime(clipEnd)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Info de duración */}
                  <div className="flex items-center justify-center space-x-4 text-sm">
                    <span className="text-gray-500">
                      Desde <span className="text-white font-mono">{formatSecondsToTime(clipStart)}</span>
                    </span>
                    <span className="text-gray-600">→</span>
                    <span className="text-gray-500">
                      Hasta <span className="text-white font-mono">{formatSecondsToTime(clipEnd)}</span>
                    </span>
                    <span className="text-gray-600">|</span>
                    <span className="text-gray-500">
                      Duración: <span className="text-green-400 font-mono">{formatSecondsToTime(clipDuration)}</span>
                    </span>
                  </div>
                </div>
              )}

              {/* Mensaje cuando no hay duración */}
              {clipEnabled && totalSeconds === 0 && (
                <div className="p-4 text-center text-gray-500 text-sm">
                  No se puede recortar: duración del video desconocida
                </div>
              )}
            </div>

            {/* Formatos disponibles */}
            {videoInfo.formats && videoInfo.formats.length > 0 && (
              <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700/50">
                <h3 className="text-white font-semibold mb-3 flex items-center">
                  <FilmIcon className="w-5 h-5 mr-2 text-gray-400" />
                  Formatos Disponibles
                </h3>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                  {videoInfo.formats.slice(0, 12).map((format, idx) => (
                    <span
                      key={idx}
                      className="bg-gray-700/50 px-3 py-1.5 rounded-lg text-sm text-gray-300 border border-gray-600/50"
                    >
                      {format.quality} <span className="text-gray-500">({format.ext})</span>
                    </span>
                  ))}
                  {videoInfo.formats.length > 12 && (
                    <span className="px-3 py-1.5 text-sm text-gray-500">
                      +{videoInfo.formats.length - 12} más
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer con acciones */}
        <div className="p-4 border-t border-gray-800 flex justify-between items-center bg-gray-900/80">
          <div className="text-sm text-gray-500">
            {platform?.getDisplayName() || 'Video'} • {videoInfo.duration || 'Duración desconocida'}
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl transition-colors border border-gray-700"
            >
              Cancelar
            </button>
            <button
              onClick={handleDownload}
              className={`px-6 py-2.5 ${styles.accent} hover:opacity-90 text-white rounded-xl transition-all font-medium shadow-lg flex items-center space-x-2`}
            >
              {clipEnabled && clipDuration > 0 && clipDuration < totalSeconds ? (
                <>
                  <ScissorsIcon className="w-5 h-5" />
                  <span>Descargar Clip ({formatSecondsToTime(clipDuration)})</span>
                </>
              ) : (
                <>
                  <PlayIcon className="w-5 h-5" />
                  <span>Descargar</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Componente auxiliar para stats
function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-gray-800/50 p-3 rounded-xl border border-gray-700/50">
      <div className="flex items-center space-x-2 text-gray-400 mb-1">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <div className="text-white font-medium truncate">{value}</div>
    </div>
  );
}
