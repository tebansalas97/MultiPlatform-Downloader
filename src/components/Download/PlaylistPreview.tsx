import React, { useState } from 'react';
import {
  PlayIcon,
  CheckIcon,
  XMarkIcon,
  ListBulletIcon,
  ClockIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import { PlaylistInfo } from '../../types';
import { useDownloadStore } from '../../stores/downloadStore';
import { downloadService } from '../../services/DownloadService';

interface PlaylistPreviewProps {
  playlistInfo: PlaylistInfo;
  onClose: () => void;
  onAddToQueue: (selectedVideos: string[]) => void;
}

export function PlaylistPreview({ playlistInfo, onClose, onAddToQueue }: PlaylistPreviewProps) {
  const [selectedVideos, setSelectedVideos] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(true);
  const { settings } = useDownloadStore();

  // Inicializar con todos seleccionados
  React.useEffect(() => {
    setSelectedVideos(new Set(playlistInfo.videos.map(v => v.id)));
  }, [playlistInfo]);

  const handleToggleVideo = (videoId: string) => {
    const newSelected = new Set(selectedVideos);
    if (newSelected.has(videoId)) {
      newSelected.delete(videoId);
    } else {
      newSelected.add(videoId);
    }
    setSelectedVideos(newSelected);
    setSelectAll(newSelected.size === playlistInfo.videos.length);
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedVideos(new Set());
    } else {
      setSelectedVideos(new Set(playlistInfo.videos.map(v => v.id)));
    }
    setSelectAll(!selectAll);
  };

  const handleAddSelected = () => {
    const selectedVideoIds = Array.from(selectedVideos);
    const videoUrls = selectedVideoIds.map(id => 
      `https://www.youtube.com/watch?v=${id}`
    );
    onAddToQueue(videoUrls);
    onClose();
  };

  const estimatedTime = () => {
    const avgDownloadTime = 2; // minutos por video estimado
    return `~${Math.ceil(selectedVideos.size * avgDownloadTime)} min`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[80vh] flex flex-col border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
              <ListBulletIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{playlistInfo.title}</h2>
              <p className="text-gray-400 text-sm flex items-center space-x-4">
                <span className="flex items-center space-x-1">
                  <UserIcon className="w-4 h-4" />
                  <span>{playlistInfo.uploader}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <PlayIcon className="w-4 h-4" />
                  <span>{playlistInfo.videoCount} videos</span>
                </span>
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Stats and Controls */}
        <div className="p-4 bg-gray-750 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="text-sm text-gray-400">
                <span className="text-blue-400 font-medium">{selectedVideos.size}</span> of {playlistInfo.videoCount} selected
              </div>
              <div className="text-sm text-gray-400">
                Estimated time: <span className="text-yellow-400">{estimatedTime()}</span>
              </div>
              <div className="text-sm text-gray-400">
                Format: <span className="text-green-400">{settings.defaultType} • {settings.defaultQuality}</span>
              </div>
            </div>
            
            <button
              onClick={handleSelectAll}
              className="flex items-center space-x-2 px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm transition-colors"
            >
              <CheckIcon className="w-4 h-4" />
              <span>{selectAll ? 'Deselect All' : 'Select All'}</span>
            </button>
          </div>
        </div>

        {/* Videos List */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {playlistInfo.videos.map((video, index) => {
              const isSelected = selectedVideos.has(video.id);
              
              return (
                <div
                  key={video.id}
                  className={`flex items-center space-x-3 p-3 rounded-lg border transition-all cursor-pointer ${
                    isSelected 
                      ? 'border-blue-500 bg-blue-900/20' 
                      : 'border-gray-600 hover:border-gray-500'
                  }`}
                  onClick={() => handleToggleVideo(video.id)}
                >
                  {/* Checkbox */}
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                    isSelected 
                      ? 'border-blue-500 bg-blue-500' 
                      : 'border-gray-400'
                  }`}>
                    {isSelected && <CheckIcon className="w-3 h-3 text-white" />}
                  </div>

                  {/* Index */}
                  <div className="w-8 text-center text-sm text-gray-400">
                    {index + 1}
                  </div>

                  {/* Thumbnail */}
                  <div className="flex-shrink-0 w-20 h-15 bg-gray-700 rounded overflow-hidden">
                    {video.thumbnail ? (
                      <img 
                        src={video.thumbnail} 
                        alt={video.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <PlayIcon className="w-6 h-6 text-gray-500" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-white font-medium line-clamp-1">
                      {video.title}
                    </h4>
                    <div className="flex items-center space-x-2 mt-1 text-sm text-gray-400">
                      <ClockIcon className="w-4 h-4" />
                      <span>{video.duration}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-700">
          <div className="text-sm text-gray-400">
            {selectedVideos.size > 0 ? (
              `Ready to download ${selectedVideos.size} video${selectedVideos.size > 1 ? 's' : ''}`
            ) : (
              'Select videos to download'
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAddSelected}
              disabled={selectedVideos.size === 0}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                selectedVideos.size > 0
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
            >
              Add {selectedVideos.size} to Queue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}