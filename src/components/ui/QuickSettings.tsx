import React, { useState, useEffect } from 'react';
import { 
  Cog6ToothIcon, 
  XMarkIcon,
  SignalIcon,
  WifiIcon,
  BoltIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { useDownloadStore } from '../../stores/downloadStore';
import { bandwidthService } from '../../services/BandwidthService';
import { proxyService } from '../../services/ProxyService';

export function QuickSettings() {
  const [isVisible, setIsVisible] = useState(false);
  const [bandwidthStats, setBandwidthStats] = useState<any>(null);
  const [proxyStats, setProxyStats] = useState<any>(null);
  const { settings, updateSettings } = useDownloadStore();

  useEffect(() => {
    const handleToggle = () => setIsVisible(!isVisible);
    window.addEventListener('toggle-quick-settings', handleToggle);
    
    return () => {
      window.removeEventListener('toggle-quick-settings', handleToggle);
    };
  }, [isVisible]);

  useEffect(() => {
    if (isVisible) {
      const interval = setInterval(() => {
        setBandwidthStats(bandwidthService.getStats());
        setProxyStats(proxyService.getProxyStats());
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [isVisible]);

  const speedPresets = [
    { label: 'Unlimited', value: 0, icon: '🚀' },
    { label: '5 MB/s', value: 5000, icon: '⚡' },
    { label: '2 MB/s', value: 2000, icon: '🏃' },
    { label: '1 MB/s', value: 1000, icon: '🚶' },
    { label: '500 KB/s', value: 500, icon: '🐌' }
  ];

  const handleSpeedPreset = (speedKbps: number) => {
    bandwidthService.setSpeedLimit(speedKbps);
  };

  const handleProxyToggle = () => {
    const currentProxy = proxyService.getCurrentProxy();
    if (currentProxy?.enabled) {
      proxyService.disableProxy();
    } else {
      proxyService.setAutoProxy();
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed top-16 right-4 z-40 w-80 bg-gray-800 rounded-lg border border-gray-700 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center space-x-2">
          <BoltIcon className="w-5 h-5 text-blue-400" />
          <h3 className="text-white font-medium">Quick Controls</h3>
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className="p-1 text-gray-400 hover:text-white rounded transition-colors"
        >
          <XMarkIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Speed Control */}
        <div>
          <label className="text-sm font-medium text-gray-300 mb-2 flex items-center">
            <SignalIcon className="w-4 h-4 mr-1" />
            Speed Limit
          </label>
          <div className="grid grid-cols-2 gap-2">
            {speedPresets.map((preset) => (
              <button
                key={preset.value}
                onClick={() => handleSpeedPreset(preset.value)}
                className={`p-2 rounded-lg text-xs font-medium transition-colors items-center space-x-1 ${
                  bandwidthStats?.currentLimit === preset.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                } flex`}
              >
                <span>{preset.icon}</span>
                <span>{preset.label}</span>
              </button>
            ))}
          </div>
          
          {bandwidthStats && (
            <div className="mt-2 text-xs text-gray-400 flex justify-between">
              <span>Current: {bandwidthService.formatSpeed(Math.round(bandwidthStats.currentSpeed))}</span>
              <span>Efficiency: {Math.round(bandwidthStats.efficiency)}%</span>
            </div>
          )}
        </div>

        {/* Proxy Control */}
        <div>
          <label className="text-sm font-medium text-gray-300 mb-2 flex items-center">
            <WifiIcon className="w-4 h-4 mr-1" />
            Proxy Status
          </label>
          <div className="flex items-center justify-between p-3 bg-gray-900 rounded-lg">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                proxyStats?.current?.enabled ? 'bg-green-400' : 'bg-gray-500'
              }`} />
              <span className="text-white text-sm">
                {proxyStats?.current?.enabled 
                  ? `${proxyStats.current.host}:${proxyStats.current.port}`
                  : 'Direct Connection'
                }
              </span>
            </div>
            <button
              onClick={handleProxyToggle}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                proxyStats?.current?.enabled
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {proxyStats?.current?.enabled ? 'Disable' : 'Auto-Enable'}
            </button>
          </div>
          
          {proxyStats?.current?.enabled && (
            <div className="mt-2 text-xs text-gray-400 flex justify-between">
              <span>Success Rate: {Math.round(proxyStats.successRate)}%</span>
              <span>Latency: {proxyStats.avgLatency}ms</span>
            </div>
          )}
        </div>

        {/* Download Settings */}
        <div>
          <label className="text-sm font-medium text-gray-300 mb-2">
            Download Type
          </label>
          <div className="grid grid-cols-3 gap-1">
            {[
              { value: 'video-audio', label: 'Video', icon: '🎬' },
              { value: 'audio', label: 'Audio', icon: '🎵' },
              { value: 'video', label: 'Video Only', icon: '🎥' }
            ].map((type) => (
              <button
                key={type.value}
                onClick={() => updateSettings({ defaultType: type.value as any })}
                className={`p-2 rounded text-xs font-medium transition-colors space-y-1 ${
                  settings.defaultType === type.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                } flex flex-col items-center`}
              >
                <span>{type.icon}</span>
                <span>{type.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Quality Selection */}
        <div>
          <label className="text-sm font-medium text-gray-300 mb-2">
            Quality
          </label>
          <select
            value={settings.defaultQuality}
            onChange={(e) => updateSettings({ defaultQuality: e.target.value })}
            className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
          >
            <option value="best">Best Available</option>
            <option value="1080p">1080p</option>
            <option value="720p">720p</option>
            <option value="480p">480p</option>
          </select>
        </div>

        {/* Quick Stats */}
        <div className="pt-2 border-t border-gray-700">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="text-center">
              <div className="text-gray-400">Concurrent</div>
              <div className="text-white font-bold">{settings.maxConcurrent}</div>
            </div>
            <div className="text-center">
              <div className="text-gray-400">Auto-Start</div>
              <div className={`font-bold ${settings.autoStart ? 'text-green-400' : 'text-red-400'}`}>
                {settings.autoStart ? 'ON' : 'OFF'}
              </div>
            </div>
          </div>
        </div>

        {/* Performance Indicator */}
        {bandwidthStats && (
          <div className="pt-2 border-t border-gray-700">
            <div className="flex items-center space-x-2 text-xs">
              <ChartBarIcon className="w-4 h-4 text-blue-400" />
              <span className="text-gray-400">Performance:</span>
              <div className={`px-2 py-1 rounded text-xs font-medium ${
                bandwidthStats.efficiency > 80 ? 'bg-green-900/50 text-green-400' :
                bandwidthStats.efficiency > 60 ? 'bg-yellow-900/50 text-yellow-400' :
                'bg-red-900/50 text-red-400'
              }`}>
                {bandwidthStats.efficiency > 80 ? 'Excellent' :
                 bandwidthStats.efficiency > 60 ? 'Good' : 'Poor'}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}