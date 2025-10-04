import React, { useState } from 'react';
import { 
  ClockIcon, 
  FolderOpenIcon, 
  ArrowDownTrayIcon,
  MagnifyingGlassIcon,
  TrashIcon,
  PlayIcon,
  DocumentDuplicateIcon
} from '@heroicons/react/24/outline';
import { useDownloadStore } from '../../stores/downloadStore';
import { downloadService } from '../../services/DownloadService';
import { DownloadJob } from '../../types';

const { shell } = window.require ? window.require('electron') : { shell: null };

export function HistoryView() {
  const { history, clearHistory, removeFromHistory, addJob } = useDownloadStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'duration'>('date');
  const [filterType, setFilterType] = useState<'all' | 'video' | 'audio' | 'video-audio'>('all');

  // Filtrar y ordenar historial
  const filteredHistory = history
    .filter(item => {
      const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filterType === 'all' || item.type === filterType;
      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'title':
          return a.title.localeCompare(b.title);
        case 'duration':
          return (b.duration || '').localeCompare(a.duration || '');
        default:
          return 0;
      }
    });

  const handleOpenFolder = async (folderPath: string) => {
    if (shell) {
      await shell.openPath(folderPath);
    } else {
      console.log('Open folder:', folderPath);
    }
  };

  const handleDownloadAgain = (item: DownloadJob) => {
    // Crear nuevo job basado en el historial
    addJob({
      url: item.url,
      title: item.title,
      type: item.type,
      quality: item.quality,
      folder: item.folder,
      thumbnail: item.thumbnail,
      duration: item.duration,
      fileSize: item.fileSize
    });

    // Auto-iniciar descarga
    setTimeout(() => {
      downloadService.processQueue();
    }, 100);
  };

  const handleCopyUrl = (url: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'audio':
        return '🎵';
      case 'video':
        return '🎥';
      case 'video-audio':
        return '📺';
      default:
        return '📄';
    }
  };

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">Download History</h2>
          <p className="text-gray-400">
            View and manage your completed downloads
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6 border border-gray-700">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search downloads..."
                className="w-full bg-gray-900 border border-gray-600 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'title' | 'duration')}
              className="bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="date">Sort by Date</option>
              <option value="title">Sort by Title</option>
              <option value="duration">Sort by Duration</option>
            </select>

            {/* Filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as 'all' | 'video' | 'audio' | 'video-audio')}
              className="bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Types</option>
              <option value="video-audio">Video + Audio</option>
              <option value="video">Video Only</option>
              <option value="audio">Audio Only</option>
            </select>

            {/* Clear History */}
            {history.length > 0 && (
              <button
                onClick={clearHistory}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center space-x-2"
              >
                <TrashIcon className="w-4 h-4" />
                <span>Clear All</span>
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        {history.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="text-2xl font-bold text-blue-400">{history.length}</div>
              <div className="text-sm text-gray-400">Total Downloads</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="text-2xl font-bold text-green-400">
                {history.filter(h => h.type === 'video-audio').length}
              </div>
              <div className="text-sm text-gray-400">Videos</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="text-2xl font-bold text-purple-400">
                {history.filter(h => h.type === 'audio').length}
              </div>
              <div className="text-sm text-gray-400">Audio Files</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="text-2xl font-bold text-yellow-400">
                {new Set(history.map(h => h.folder)).size}
              </div>
              <div className="text-sm text-gray-400">Folders Used</div>
            </div>
          </div>
        )}

        {/* History List */}
        {filteredHistory.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <ClockIcon className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">
              {history.length === 0 ? 'No downloads yet' : 'No results found'}
            </h3>
            <p className="text-gray-400">
              {history.length === 0 
                ? 'Completed downloads will appear here'
                : 'Try adjusting your search or filters'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredHistory.map((item) => (
              <div
                key={item.id}
                className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors"
              >
                <div className="flex items-start space-x-4">
                  {/* Thumbnail */}
                  <div className="flex-shrink-0 w-20 h-15 bg-gray-700 rounded overflow-hidden">
                    {item.thumbnail ? (
                      <img 
                        src={item.thumbnail} 
                        alt={item.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <PlayIcon className="w-8 h-8 text-gray-500" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-white font-medium mb-1 line-clamp-2">
                          {item.title}
                        </h4>
                        <div className="flex items-center space-x-4 text-sm text-gray-400 mb-2">
                          <span className="flex items-center space-x-1">
                            <span>{getTypeIcon(item.type)}</span>
                            <span>{item.type} • {item.quality}</span>
                          </span>
                          <span>{item.duration}</span>
                          <span>{item.fileSize}</span>
                        </div>
                        <div className="text-xs text-gray-500">
                          Downloaded: {formatDate(item.createdAt)}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2 mt-3">
                      <button
                        onClick={() => handleOpenFolder(item.folder)}
                        className="flex items-center space-x-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
                      >
                        <FolderOpenIcon className="w-4 h-4" />
                        <span>Open Folder</span>
                      </button>

                      <button
                        onClick={() => handleDownloadAgain(item)}
                        className="flex items-center space-x-1 px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition-colors"
                      >
                        <ArrowDownTrayIcon className="w-4 h-4" />
                        <span>Download Again</span>
                      </button>

                      <button
                        onClick={() => handleCopyUrl(item.url)}
                        className="flex items-center space-x-1 px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded transition-colors"
                      >
                        <DocumentDuplicateIcon className="w-4 h-4" />
                        <span>Copy URL</span>
                      </button>

                      <button
                        onClick={() => removeFromHistory(item.id)}
                        className="flex items-center space-x-1 px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
                      >
                        <TrashIcon className="w-4 h-4" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}