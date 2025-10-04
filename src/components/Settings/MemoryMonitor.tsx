import React, { useState, useEffect } from 'react';
import { 
  CpuChipIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  TrashIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { memoryService } from '../../services/MemoryService';

export function MemoryMonitor() {
  const [stats, setStats] = useState<any>(null);
  const [config, setConfig] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 3000);
    return () => clearInterval(interval);
  }, []);

  const loadData = () => {
    setStats(memoryService.getStats());
    setConfig(memoryService.getConfig());
    setHealth(memoryService.getHealthStatus());
    setSuggestions(memoryService.getOptimizationSuggestions());
  };

  const handleClearCache = () => {
    setShowClearConfirm(true);
  };

  const confirmClearCache = () => {
    window.dispatchEvent(new CustomEvent('clear-all-cache'));
    setShowClearConfirm(false);
    setTimeout(loadData, 1000);
  };

  const handleGarbageCollection = () => {
    // Trigger manual GC
    window.dispatchEvent(new CustomEvent('manual-gc'));
    setTimeout(loadData, 1000);
  };

  const handleUpdateConfig = (newConfig: any) => {
    memoryService.updateConfig(newConfig);
    loadData();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-400';
      case 'warning': return 'text-yellow-400';
      case 'critical': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircleIcon className="w-5 h-5" />;
      case 'warning': return <ExclamationTriangleIcon className="w-5 h-5" />;
      case 'critical': return <ExclamationTriangleIcon className="w-5 h-5" />;
      default: return <CpuChipIcon className="w-5 h-5" />;
    }
  };

  if (!stats || !config || !health) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-700 rounded"></div>
            <div className="h-3 bg-gray-700 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Memory Status Overview */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center">
            <CpuChipIcon className="w-5 h-5 mr-2" />
            Memory Monitor
          </h3>
          
          <div className={`flex items-center space-x-2 ${getStatusColor(health.status)}`}>
            {getStatusIcon(health.status)}
            <span className="font-medium capitalize">{health.status}</span>
            <span className="text-sm">({health.score}/100)</span>
          </div>
        </div>

        {/* Memory Usage Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-400 mb-2">
            <span>Memory Usage</span>
            <span>{memoryService.formatMemorySize(stats.used)} / {memoryService.formatMemorySize(stats.total)}</span>
          </div>
          
          <div className="w-full bg-gray-700 rounded-full h-3">
            <div 
              className={`h-3 rounded-full transition-all duration-500 ${
                stats.percentage > 80 ? 'bg-red-500' :
                stats.percentage > 60 ? 'bg-yellow-500' :
                'bg-green-500'
              }`}
              style={{ width: `${Math.min(100, stats.percentage)}%` }}
            />
          </div>
          
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0%</span>
            <span className="font-medium">{stats.percentage}%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-gray-900 rounded-lg p-3 text-center">
            <div className="text-gray-400 text-xs">Cache Size</div>
            <div className="text-white font-bold text-sm">
              {memoryService.formatMemorySize(stats.cacheSize)}
            </div>
          </div>
          
          <div className="bg-gray-900 rounded-lg p-3 text-center">
            <div className="text-gray-400 text-xs">History Size</div>
            <div className="text-white font-bold text-sm">
              {memoryService.formatMemorySize(stats.historySize)}
            </div>
          </div>
          
          <div className="bg-gray-900 rounded-lg p-3 text-center">
            <div className="text-gray-400 text-xs">Active Processes</div>
            <div className="text-white font-bold text-sm">{stats.activeProcesses}</div>
          </div>
          
          <div className="bg-gray-900 rounded-lg p-3 text-center">
            <div className="text-gray-400 text-xs">Status</div>
            <div className={`font-bold text-sm ${getStatusColor(stats.status)}`}>
              {stats.status.toUpperCase()}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleClearCache}
            className="px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm transition-colors flex items-center space-x-1"
          >
            <TrashIcon className="w-4 h-4" />
            <span>Clear Cache</span>
          </button>
          
          <button
            onClick={handleGarbageCollection}
            className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition-colors flex items-center space-x-1"
          >
            <ArrowPathIcon className="w-4 h-4" />
            <span>Force GC</span>
          </button>
          
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors flex items-center space-x-1"
          >
            <ChartBarIcon className="w-4 h-4" />
            <span>Advanced</span>
          </button>
        </div>
      </div>

      {/* Health Issues */}
      {health.issues.length > 0 && (
        <div className="bg-yellow-900/20 border border-yellow-500/50 rounded-lg p-4">
          <h4 className="text-yellow-300 font-medium mb-2 flex items-center">
            <ExclamationTriangleIcon className="w-5 h-5 mr-2" />
            Memory Issues
          </h4>
          <ul className="text-yellow-200 text-sm space-y-1">
            {health.issues.map((issue: string, index: number) => (
              <li key={index} className="flex items-start space-x-2">
                <span className="text-yellow-400 mt-0.5">•</span>
                <span>{issue}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Optimization Suggestions */}
      {suggestions.length > 0 && (
        <div className="bg-blue-900/20 border border-blue-500/50 rounded-lg p-4">
          <h4 className="text-blue-300 font-medium mb-2">💡 Optimization Suggestions</h4>
          <ul className="text-blue-200 text-sm space-y-1">
            {suggestions.map((suggestion, index) => (
              <li key={index} className="flex items-start space-x-2">
                <span className="text-blue-400 mt-0.5">•</span>
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Advanced Settings */}
      {showAdvanced && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h4 className="text-white font-medium mb-4">Advanced Memory Settings</h4>
          
          <div className="space-y-4">
            {/* Max Concurrent Downloads */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Max Concurrent Downloads: {config.maxConcurrentDownloads}
              </label>
              <input
                type="range"
                min="1"
                max="8"
                value={config.maxConcurrentDownloads}
                onChange={(e) => handleUpdateConfig({ maxConcurrentDownloads: parseInt(e.target.value) })}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>1</span>
                <span>8</span>
              </div>
            </div>

            {/* Max Cache Size */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Max Cache Size: {config.maxCacheSize} MB
              </label>
              <input
                type="range"
                min="10"
                max="500"
                step="10"
                value={config.maxCacheSize}
                onChange={(e) => handleUpdateConfig({ maxCacheSize: parseInt(e.target.value) })}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>10 MB</span>
                <span>500 MB</span>
              </div>
            </div>

            {/* Warning Threshold */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Memory Warning Threshold: {config.warningThreshold} MB
              </label>
              <input
                type="range"
                min="100"
                max="2048"
                step="50"
                value={config.warningThreshold}
                onChange={(e) => handleUpdateConfig({ warningThreshold: parseInt(e.target.value) })}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>100 MB</span>
                <span>2 GB</span>
              </div>
            </div>

            {/* Toggle Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex items-center space-x-2 p-3 bg-gray-900 rounded-lg">
                <input
                  type="checkbox"
                  checked={config.enableGarbageCollection}
                  onChange={(e) => handleUpdateConfig({ enableGarbageCollection: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="text-gray-300 font-medium">Enable Garbage Collection</span>
                  <div className="text-gray-500 text-xs">Automatic memory cleanup</div>
                </div>
              </label>
              
              <label className="flex items-center space-x-2 p-3 bg-gray-900 rounded-lg">
                <input
                  type="checkbox"
                  checked={config.monitoring}
                  onChange={(e) => handleUpdateConfig({ monitoring: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="text-gray-300 font-medium">Enable Monitoring</span>
                  <div className="text-gray-500 text-xs">Real-time memory tracking</div>
                </div>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-white mb-4">Clear Cache</h3>
            <p className="text-gray-300 mb-6">
              Clear all cache data? This will remove video info cache and may slow down future operations.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmClearCache}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
              >
                Clear Cache
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}