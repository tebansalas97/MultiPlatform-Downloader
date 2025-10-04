import React, { useState, useRef, useEffect } from 'react';
import { XMarkIcon, ScissorsIcon } from '@heroicons/react/24/outline';
import { VideoInfo } from '../../types';

interface VideoPreviewProps {
  videoInfo: VideoInfo;
  url: string;
  onClose: () => void;
  onDownload: (url: string, startTime?: number, endTime?: number) => void;
}

export function VideoPreview({ videoInfo, url, onClose, onDownload }: VideoPreviewProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [startTime, setStartTime] = useState<number | undefined>(undefined);
  const [endTime, setEndTime] = useState<number | undefined>(undefined);
  const [isClipping, setIsClipping] = useState(false);
  const playerRef = useRef<HTMLIFrameElement>(null);

  const videoId = extractVideoId(url);
  const embedUrl = `https://www.youtube.com/embed/${videoId}?enablejsapi=1`;

  useEffect(() => {
    if (videoInfo.duration) {
      const parts = videoInfo.duration.split(':').map(Number);
      let seconds = 0;
      if (parts.length === 3) {
        seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
      } else if (parts.length === 2) {
        seconds = parts[0] * 60 + parts[1];
      }
      setDuration(seconds);
    }
  }, [videoInfo.duration]);

  function extractVideoId(url: string): string {
    const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    return match ? match[1] : '';
  }

  const handleDownload = () => {
    if (isClipping && startTime !== undefined && endTime !== undefined) {
      onDownload(url, startTime, endTime);
    } else {
      onDownload(url);
    }
    onClose();
  };

  const formatTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return h > 0 
      ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
      : `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-700 flex-shrink-0">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-white truncate">{videoInfo.title}</h2>
            <p className="text-sm text-gray-400 truncate">{videoInfo.uploader}</p>
          </div>
          <button
            onClick={onClose}
            className="ml-4 p-2 hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0"
          >
            <XMarkIcon className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            <div className="aspect-video bg-black rounded-lg overflow-hidden">
              <iframe
                ref={playerRef}
                src={embedUrl}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="Video Preview"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-gray-900 p-3 rounded-lg">
                <span className="text-gray-400">Duration:</span>
                <span className="ml-2 text-white font-medium">{videoInfo.duration}</span>
              </div>
              <div className="bg-gray-900 p-3 rounded-lg">
                <span className="text-gray-400">File Size:</span>
                <span className="ml-2 text-white font-medium">{videoInfo.fileSize}</span>
              </div>
            </div>

            <div className="bg-gray-900 p-4 rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <label className="flex items-center space-x-2 text-white cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isClipping}
                    onChange={(e) => setIsClipping(e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                  />
                  <ScissorsIcon className="w-5 h-5" />
                  <span>Enable Video Clipping</span>
                </label>
              </div>

              {isClipping && (
                <div className="space-y-4 pt-2">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">
                      Start Time: {startTime !== undefined ? formatTime(startTime) : '0:00'}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max={duration}
                      value={startTime || 0}
                      onChange={(e) => setStartTime(parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-2">
                      End Time: {endTime !== undefined ? formatTime(endTime) : formatTime(duration)}
                    </label>
                    <input
                      type="range"
                      min={startTime || 0}
                      max={duration}
                      value={endTime || duration}
                      onChange={(e) => setEndTime(parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                    />
                  </div>

                  {startTime !== undefined && endTime !== undefined && (
                    <div className="bg-gray-800 p-3 rounded text-center">
                      <span className="text-gray-400">Clip Duration: </span>
                      <span className="text-white font-medium">
                        {formatTime(endTime - startTime)}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {videoInfo.formats && videoInfo.formats.length > 0 && (
              <div className="bg-gray-900 p-4 rounded-lg">
                <h3 className="text-white font-semibold mb-3">Available Formats</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                  {videoInfo.formats.map((format, idx) => (
                    <div
                      key={idx}
                      className="bg-gray-800 px-3 py-2 rounded text-sm text-gray-300"
                    >
                      {format.quality} ({format.ext})
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-gray-700 flex justify-end space-x-3 flex-shrink-0 bg-gray-800">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDownload}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
          >
            {isClipping ? 'Download Clip' : 'Download Full Video'}
          </button>
        </div>
      </div>
    </div>
  );
}