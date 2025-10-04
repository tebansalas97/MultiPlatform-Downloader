import React, { useState, useEffect } from 'react';
import { 
  ArrowDownTrayIcon, 
  ClockIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  XMarkIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { DownloadJob } from '../../types';

interface ProgressIndicatorProps {
  job: DownloadJob;
  detailed?: boolean;
}

interface DownloadStats {
  speed: string;
  eta: string;
  downloaded: string;
  total: string;
  percentage: number;
}

export function ProgressIndicator({ job, detailed = false }: ProgressIndicatorProps) {
  const [stats, setStats] = useState<DownloadStats>({
    speed: '0 KB/s',
    eta: 'Calculating...',
    downloaded: '0 MB',
    total: job.fileSize || 'Unknown',
    percentage: job.progress
  });

  const [history, setHistory] = useState<number[]>([]);

  useEffect(() => {
    // 📊 Simular cálculo de estadísticas en tiempo real
    if (job.status === 'downloading') {
      const interval = setInterval(() => {
        updateStats();
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [job.status, job.progress]);

  const updateStats = () => {
    // 📈 Agregar progreso actual al historial
    setHistory((prev: number[]) => {
      const newHistory = [...prev, job.progress].slice(-10); // Mantener últimos 10 valores
      
      // 🏃‍♂️ Calcular velocidad basada en cambios de progreso
      if (newHistory.length >= 2) {
        const progressDiff = newHistory[newHistory.length - 1] - newHistory[newHistory.length - 2];
        const speed = calculateSpeed(progressDiff);
        const eta = calculateETA(job.progress, progressDiff);
        
        setStats((prevStats: DownloadStats) => ({
          ...prevStats,
          speed,
          eta,
          percentage: job.progress,
          downloaded: calculateDownloaded(job.progress, job.fileSize)
        }));
      }
      
      return newHistory;
    });
  };

  const calculateSpeed = (progressDiff: number): string => {
    if (progressDiff <= 0) return '0 KB/s';
    
    // 🎯 Estimación simplificada basada en progreso
    const estimatedSpeed = progressDiff * 100; // KB/s aproximado
    
    if (estimatedSpeed >= 1024) {
      return `${(estimatedSpeed / 1024).toFixed(1)} MB/s`;
    }
    return `${estimatedSpeed.toFixed(0)} KB/s`;
  };

  const calculateETA = (currentProgress: number, progressRate: number): string => {
    if (progressRate <= 0 || currentProgress >= 100) return 'Unknown';
    
    const remainingProgress = 100 - currentProgress;
    const estimatedSeconds = (remainingProgress / progressRate);
    
    if (estimatedSeconds < 60) {
      return `${Math.round(estimatedSeconds)}s`;
    } else if (estimatedSeconds < 3600) {
      return `${Math.round(estimatedSeconds / 60)}m`;
    } else {
      const hours = Math.floor(estimatedSeconds / 3600);
      const minutes = Math.round((estimatedSeconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  };

  const calculateDownloaded = (progress: number, fileSize?: string): string => {
    if (!fileSize || fileSize === 'Unknown') return 'Unknown';
    
    // Extraer números del fileSize string
    const match = fileSize.match(/(\d+\.?\d*)\s*(MB|GB|KB)/i);
    if (match) {
      const size = parseFloat(match[1]);
      const unit = match[2].toUpperCase();
      const downloaded = (size * progress) / 100;
      return `${downloaded.toFixed(1)} ${unit}`;
    }
    
    return 'Unknown';
  };

  const getStatusColor = (): string => {
    switch (job.status) {
      case 'pending': return 'text-yellow-400';
      case 'downloading': return 'text-blue-400';
      case 'completed': return 'text-green-400';
      case 'error': return 'text-red-400';
      case 'cancelled': return 'text-gray-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = () => {
    switch (job.status) {
      case 'pending':
        return <ClockIcon className="w-4 h-4" />;
      case 'downloading':
        return <ArrowPathIcon className="w-4 h-4 animate-spin" />;
      case 'completed':
        return <CheckCircleIcon className="w-4 h-4" />;
      case 'error':
        return <ExclamationCircleIcon className="w-4 h-4" />;
      case 'cancelled':
        return <XMarkIcon className="w-4 h-4" />;
      default:
        return <ClockIcon className="w-4 h-4" />;
    }
  };

  if (!detailed) {
    // 📱 Vista simple
    return (
      <div className="flex items-center space-x-2">
        <div className={getStatusColor()}>
          {getStatusIcon()}
        </div>
        <div className="flex-1 bg-gray-700 rounded-full h-2">
          <div 
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${Math.max(0, Math.min(100, job.progress))}%` }}
          />
        </div>
        <span className={`text-sm ${getStatusColor()}`}>
          {job.progress}%
        </span>
      </div>
    );
  }

  // 🖥️ Vista detallada
  return (
    <div className="space-y-3">
      {/* 📊 Barra de progreso principal */}
      <div className="relative">
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span className="flex items-center space-x-1">
            <span className={getStatusColor()}>{getStatusIcon()}</span>
            <span>{job.status === 'downloading' ? 'Downloading' : job.status}</span>
          </span>
          <span>{stats.percentage.toFixed(1)}%</span>
        </div>
        
        <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
          <div 
            className="bg-gradient-to-r from-blue-500 to-blue-400 h-3 rounded-full transition-all duration-500 relative"
            style={{ width: `${Math.max(0, Math.min(100, stats.percentage))}%` }}
          >
            <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
          </div>
        </div>
      </div>

      {/* 📊 Estadísticas detalladas */}
      {job.status === 'downloading' && (
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="space-y-1">
            <div className="flex items-center space-x-1 text-gray-400">
              <ArrowDownTrayIcon className="w-3 h-3" />
              <span>Speed</span>
            </div>
            <div className="text-blue-400 font-mono">{stats.speed}</div>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center space-x-1 text-gray-400">
              <ClockIcon className="w-3 h-3" />
              <span>ETA</span>
            </div>
            <div className="text-green-400 font-mono">{stats.eta}</div>
          </div>
          
          <div className="space-y-1">
            <div className="text-gray-400">Downloaded</div>
            <div className="text-yellow-400 font-mono">{stats.downloaded}</div>
          </div>
          
          <div className="space-y-1">
            <div className="text-gray-400">Total Size</div>
            <div className="text-purple-400 font-mono">{stats.total}</div>
          </div>
        </div>
      )}

      {/* 📈 Mini gráfico de progreso histórico */}
      {history.length > 1 && job.status === 'downloading' && (
        <div className="flex items-end space-x-1 h-8">
          {history.map((value, index) => (
            <div
              key={index}
              className="bg-blue-500/50 rounded-t flex-1 transition-all duration-300"
              style={{ height: `${(value / 100) * 100}%` }}
            />
          ))}
        </div>
      )}
    </div>
  );
}