import React, { useState } from 'react';
import { 
  Cog6ToothIcon, 
  ComputerDesktopIcon, 
  MoonIcon, 
  SunIcon,
  CheckIcon,
  ArrowPathIcon,
  SignalIcon,
  WifiIcon,
  CpuChipIcon,
  BellIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { useDownloadStore } from '../../stores/downloadStore';
import { BandwidthSettings } from '../Settings/BandwidthSettings';
import { ProxySettings } from '../Settings/ProxySettings';
import { MemoryMonitor } from '../Settings/MemoryMonitor';
import { FolderSelector } from '../ui/FolderSelector';

export function SettingsView() {
  const { settings, updateSettings } = useDownloadStore();
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [savedMessage, setSavedMessage] = useState(false);

  const handleSave = () => {
    setSavedMessage(true);
    setTimeout(() => setSavedMessage(false), 3000);
  };

  const handleReset = () => {
    updateSettings({
      defaultFolder: '',
      defaultQuality: 'best',
      defaultType: 'video-audio',
      theme: 'dark',
      maxConcurrent: 3,
      autoStart: true,
      notifications: true,
      keepHistory: true
    });
    setShowResetDialog(false);
    setSavedMessage(true);
    setTimeout(() => setSavedMessage(false), 3000);
  };

  const themeOptions = [
    { value: 'dark', label: 'Dark Theme', icon: MoonIcon },
    { value: 'light', label: 'Light Theme', icon: SunIcon },
    { value: 'system', label: 'System Default', icon: ComputerDesktopIcon }
  ];

  const qualityOptions = [
    { value: 'best', label: 'Best Available Quality' },
    { value: '2160p', label: '4K (2160p)' },
    { value: '1440p', label: '2K (1440p)' },
    { value: '1080p', label: 'Full HD (1080p)' },
    { value: '720p', label: 'HD (720p)' },
    { value: '480p', label: 'SD (480p)' },
    { value: '360p', label: 'Low Quality (360p)' },
    { value: 'worst', label: 'Worst Available Quality' }
  ];

  const formatOptions = [
    { value: 'video-audio', label: 'Video + Audio (MP4)', description: 'Complete video file with audio' },
    { value: 'video', label: 'Video Only', description: 'Video without audio track' },
    { value: 'audio', label: 'Audio Only (MP3)', description: 'Extract audio as MP3 file' }
  ];

  return (
    <div className="flex-1 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">Settings</h2>
          <p className="text-gray-400">
            Configure your download preferences and application settings
          </p>
        </div>

        {/* Success Message */}
        {savedMessage && (
          <div className="mb-6 p-4 bg-green-900/20 border border-green-500/50 rounded-lg flex items-center space-x-2">
            <CheckIcon className="w-5 h-5 text-green-400" />
            <span className="text-green-300">Settings saved successfully!</span>
          </div>
        )}

        <div className="space-y-6">
          {/* Download Settings */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Cog6ToothIcon className="w-5 h-5 mr-2" />
              Download Settings
            </h3>

            <div className="space-y-6">
              {/* Default Folder */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Default Download Folder
                </label>
                <FolderSelector
                  value={settings.defaultFolder}
                  onChange={(folder: string) => updateSettings({ defaultFolder: folder })}
                  placeholder="Select default download folder..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Files will be saved here by default. You can change this for individual downloads.
                </p>
              </div>

              {/* Default Format */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Default Format
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {formatOptions.map((format) => (
                    <button
                      key={format.value}
                      onClick={() => updateSettings({ defaultType: format.value as any })}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        settings.defaultType === format.value
                          ? 'border-blue-500 bg-blue-900/20'
                          : 'border-gray-600 hover:border-gray-500'
                      }`}
                    >
                      <div className="font-medium text-white">{format.label}</div>
                      <div className="text-sm text-gray-400 mt-1">{format.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Default Quality */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Default Quality
                </label>
                <select
                  value={settings.defaultQuality}
                  onChange={(e) => updateSettings({ defaultQuality: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                >
                  {qualityOptions.map((quality) => (
                    <option key={quality.value} value={quality.value}>
                      {quality.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Choose the preferred video quality. "Best" will download the highest available quality.
                </p>
              </div>

              {/* Max Concurrent Downloads */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Maximum Concurrent Downloads
                </label>
                <div className="flex items-center space-x-4">
                  <input
                    type="range"
                    min="1"
                    max="8"
                    value={settings.maxConcurrent}
                    onChange={(e) => updateSettings({ maxConcurrent: parseInt(e.target.value) })}
                    className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <span className="text-white font-medium min-w-[3rem] text-center">
                    {settings.maxConcurrent}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Number of simultaneous downloads. Higher values may consume more bandwidth and system resources.
                </p>
              </div>
            </div>
          </div>

          {/* Application Settings */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <ComputerDesktopIcon className="w-5 h-5 mr-2" />
              Application Settings
            </h3>

            <div className="space-y-6">
              {/* Theme Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Theme
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {themeOptions.map((theme) => {
                    const Icon = theme.icon;
                    return (
                      <button
                        key={theme.value}
                        onClick={() => updateSettings({ theme: theme.value as any })}
                        className={`p-3 rounded-lg border-2 transition-all flex items-center space-x-2 ${
                          settings.theme === theme.value
                            ? 'border-blue-500 bg-blue-900/20'
                            : 'border-gray-600 hover:border-gray-500'
                        }`}
                      >
                        <Icon className="w-5 h-5 text-gray-400" />
                        <span className="text-white text-sm">{theme.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Behavior Settings */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-300">Behavior</h4>
                
                {/* Auto Start Downloads */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-white font-medium">Auto-start Downloads</div>
                    <div className="text-sm text-gray-400">
                      Automatically begin downloads when added to queue
                    </div>
                  </div>
                  <button
                    onClick={() => updateSettings({ autoStart: !settings.autoStart })}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      settings.autoStart ? 'bg-blue-600' : 'bg-gray-600'
                    }`}
                  >
                    <div
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        settings.autoStart ? 'translate-x-7' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Notifications */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-white font-medium flex items-center">
                      <BellIcon className="w-4 h-4 mr-2" />
                      Desktop Notifications
                    </div>
                    <div className="text-sm text-gray-400">
                      Show system notifications when downloads complete
                    </div>
                  </div>
                  <button
                    onClick={() => updateSettings({ notifications: !settings.notifications })}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      settings.notifications ? 'bg-blue-600' : 'bg-gray-600'
                    }`}
                  >
                    <div
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        settings.notifications ? 'translate-x-7' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Keep History */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-white font-medium">Keep Download History</div>
                    <div className="text-sm text-gray-400">
                      Save completed downloads to history
                    </div>
                  </div>
                  <button
                    onClick={() => updateSettings({ keepHistory: !settings.keepHistory })}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      settings.keepHistory ? 'bg-blue-600' : 'bg-gray-600'
                    }`}
                  >
                    <div
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        settings.keepHistory ? 'translate-x-7' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Advanced Options */}
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-4">Advanced</h4>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Custom yt-dlp Arguments
                    </label>
                    <input
                      type="text"
                      value={settings.customArgs || ''}
                      onChange={(e) => updateSettings({ customArgs: e.target.value })}
                      placeholder="--format best --extract-flat"
                      className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Additional arguments to pass to yt-dlp. Use with caution.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      File Naming Template
                    </label>
                    <input
                      type="text"
                      value={settings.outputTemplate || '%(title)s.%(ext)s'}
                      onChange={(e) => updateSettings({ outputTemplate: e.target.value })}
                      className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Template for naming downloaded files. Default: %(title)s.%(ext)s
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bandwidth Control Section */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
              <SignalIcon className="w-5 h-5 mr-2" />
              Bandwidth Control
            </h2>
            <BandwidthSettings />
          </div>
          
          {/* Proxy Settings Section */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
              <WifiIcon className="w-5 h-5 mr-2" />
              Proxy Configuration
            </h2>
            <ProxySettings />
          </div>

          {/* Memory Management Section */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
              <CpuChipIcon className="w-5 h-5 mr-2" />
              Memory Management
            </h2>
            <MemoryMonitor />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowResetDialog(true)}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center space-x-2"
            >
              <ArrowPathIcon className="w-4 h-4" />
              <span>Reset to Defaults</span>
            </button>

            <button
              onClick={handleSave}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center space-x-2"
            >
              <CheckIcon className="w-4 h-4" />
              <span>Save Settings</span>
            </button>
          </div>
        </div>

        {/* Reset Confirmation Dialog */}
        {showResetDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 border border-gray-700">
              <div className="flex items-center space-x-3 mb-4">
                <ExclamationTriangleIcon className="w-6 h-6 text-yellow-400" />
                <h3 className="text-lg font-semibold text-white">Reset Settings</h3>
              </div>
              
              <p className="text-gray-300 mb-6">
                Are you sure you want to reset all settings to their default values? This action cannot be undone.
              </p>
              
              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => setShowResetDialog(false)}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReset}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}