import React, { useEffect } from 'react';
import { 
  PlayIcon, 
  XMarkIcon, 
  ClockIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { useDownloadStore } from '../../stores/downloadStore';
import { downloadService } from '../../services/DownloadService';
import { DownloadJob } from '../../types';
import { ProxyImage } from '../ui';

interface DownloadQueueProps {
  isVisible: boolean;
  onToggle: () => void;
}

export function DownloadQueue({ isVisible, onToggle }: DownloadQueueProps) {
  const { jobs, updateJob, removeJob, clearQueue } = useDownloadStore();
  const [isMinimized, setIsMinimized] = React.useState(false);
  
  // Auto-procesar cola cuando hay jobs pendientes
  useEffect(() => {
    const pendingJobs = jobs.filter(job => job.status === 'pending');
    if (pendingJobs.length > 0) {
      downloadService.processQueue();
    }
  }, [jobs]);

  const handleCancelDownload = (jobId: string) => {
    downloadService.cancelDownload(jobId);
  };

  const handleRetryDownload = (jobId: string) => {
    updateJob(jobId, { status: 'pending', progress: 0 });
    downloadService.processQueue();
  };

  const handleRemoveJob = (jobId: string) => {
    // Cancelar si está descargando
    if (downloadService.getActiveDownloads().includes(jobId)) {
      downloadService.cancelDownload(jobId);
    }
    removeJob(jobId);
  };

  const getStatusIcon = (job: DownloadJob) => {
    switch (job.status) {
      case 'pending':
        return <ClockIcon className="w-5 h-5 text-yellow-400" />;
      case 'downloading':
        return <ArrowPathIcon className="w-5 h-5 text-blue-400 animate-spin" />;
      case 'completed':
        return <CheckCircleIcon className="w-5 h-5 text-green-400" />;
      case 'error':
        return <ExclamationCircleIcon className="w-5 h-5 text-red-400" />;
      case 'cancelled':
        return <XMarkIcon className="w-5 h-5 text-gray-400" />;
      default:
        return <ClockIcon className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: DownloadJob['status']) => {
    switch (status) {
      case 'pending': return 'border-yellow-500/50 bg-yellow-900/20';
      case 'downloading': return 'border-blue-500/50 bg-blue-900/20';
      case 'completed': return 'border-green-500/50 bg-green-900/20';
      case 'error': return 'border-red-500/50 bg-red-900/20';
      case 'cancelled': return 'border-gray-500/50 bg-gray-900/20';
      default: return 'border-gray-600 bg-gray-800';
    }
  };

  // Función de utilidad para formateo de tamaño (disponible para uso futuro)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _formatFileSize = (sizeStr: string | undefined) => {
    return sizeStr || 'Unknown size';
  };

  if (!isVisible) return null;

  const activeDownloads = jobs.filter(j => j.status === 'downloading').length;
  const pendingCount = jobs.filter(j => j.status === 'pending').length;

  return (
    <div className={`fixed bottom-4 right-4 bg-gray-800 border border-gray-700 rounded-lg shadow-2xl z-50 transition-all ${
      isMinimized ? 'w-80' : 'w-96'
    }`}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-gray-700 cursor-pointer hover:bg-gray-750"
        onClick={() => setIsMinimized(!isMinimized)}
      >
        <div className="flex items-center space-x-3">
          <h3 className="text-white font-medium text-sm">Download Queue</h3>
          <div className="flex items-center space-x-2">
            {activeDownloads > 0 && (
              <span className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                {activeDownloads} active
              </span>
            )}
            {pendingCount > 0 && (
              <span className="px-2 py-0.5 bg-yellow-600 text-white text-xs rounded-full">
                {pendingCount} pending
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {jobs.length > 0 && !isMinimized && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                clearQueue();
              }}
              className="px-2 py-1 text-xs text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded transition-colors"
            >
              Clear
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            className="p-1 text-gray-400 hover:text-white rounded"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Queue Items */}
      {!isMinimized && (
        <div className="max-h-96 overflow-y-auto">
        {jobs.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <ClockIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No downloads in queue</p>
          </div>
        ) : (
          <div className="p-3 space-y-2">
            {jobs.map((job) => (
              <div
                key={job.id}
                className={`border rounded-lg p-3 transition-all ${getStatusColor(job.status)}`}
              >
                <div className="flex items-start space-x-3">
                  {/* Thumbnail */}
                  <div className="flex-shrink-0 w-12 h-9 rounded overflow-hidden">
                    <ProxyImage
                      src={job.thumbnail}
                      alt={job.title}
                      platform={job.platform}
                      className="w-full h-full object-cover"
                      fallbackIcon={<PlayIcon className="w-5 h-5 text-gray-500" />}
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0 pr-2">
                        <h4 className="text-white text-sm font-medium truncate">
                          {job.title}
                        </h4>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {job.type} • {job.quality}
                        </div>
                      </div>

                      {/* Status Icon */}
                      <div className="flex-shrink-0">
                        {getStatusIcon(job)}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {job.status === 'downloading' && (
                      <div className="mt-2">
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                          <span>Downloading...</span>
                          <span>{job.progress}%</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-1.5">
                          <div
                            className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${job.progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Status Message */}
                    {job.status === 'error' && job.error && (
                      <div className="mt-1 text-xs text-red-400 truncate">
                        {job.error}
                      </div>
                    )}

                    {/* Actions - Solo mostrar botones esenciales */}
                    <div className="flex items-center space-x-1 mt-2">
                      {job.status === 'error' && (
                        <button
                          onClick={() => handleRetryDownload(job.id)}
                          className="flex items-center space-x-1 px-2 py-1 bg-yellow-600 hover:bg-yellow-700 text-white text-xs rounded transition-colors"
                        >
                          <ArrowPathIcon className="w-3 h-3" />
                          <span>Retry</span>
                        </button>
                      )}

                      {job.status === 'downloading' && (
                        <button
                          onClick={() => handleCancelDownload(job.id)}
                          className="flex items-center space-x-1 px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors"
                        >
                          <XMarkIcon className="w-3 h-3" />
                          <span>Cancel</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleRemoveJob(job.id)}
                        className="ml-auto flex items-center space-x-1 px-2 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded transition-colors"
                      >
                        <XMarkIcon className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        </div>
      )}
    </div>
  );
}