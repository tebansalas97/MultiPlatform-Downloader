import React, { useState, useEffect } from 'react';
import { 
  ClockIcon, 
  ChartBarIcon, 
  ArrowPathIcon,
  TrashIcon,
  PlusIcon,
  ExclamationTriangleIcon,
  CheckIcon,
  SignalIcon,
  PlayIcon,
  PauseIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
import { bandwidthService } from '../../services/BandwidthService';

export function BandwidthSettings() {
  const [config, setConfig] = useState(bandwidthService.getConfig());
  const [stats, setStats] = useState(bandwidthService.getStats());
  const [selectedPreset, setSelectedPreset] = useState('');
  const [customSpeed, setCustomSpeed] = useState('');
  const [showAddSchedule, setShowAddSchedule] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isTestingSpeed, setIsTestingSpeed] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  
  const [newSchedule, setNewSchedule] = useState({
    name: '',
    startTime: '09:00',
    endTime: '17:00',
    maxSpeed: 1000,
    days: [] as number[],
    enabled: true,
    priority: 5
  });

  const presets = bandwidthService.getSpeedPresets();
  const suggestions = bandwidthService.getOptimizationSuggestions();

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(bandwidthService.getStats());
      setConfig(bandwidthService.getConfig());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handlePresetChange = (presetName: string) => {
    setSelectedPreset(presetName);
    const preset = presets.find(p => p.name === presetName);
    if (preset) {
      bandwidthService.setSpeedLimit(preset.speed);
      setCustomSpeed(preset.speed.toString());
      showNotification(`Speed limit set to ${bandwidthService.formatSpeed(preset.speed)}`, 'success');
    }
  };

  const handleCustomSpeedChange = (value: string) => {
    setCustomSpeed(value);
    const speed = parseInt(value) || 0;
    bandwidthService.setSpeedLimit(speed);
    
    if (speed === 0) {
      showNotification('Speed limit removed - unlimited downloads', 'info');
    } else {
      showNotification(`Custom speed limit set to ${bandwidthService.formatSpeed(speed)}`, 'success');
    }
  };

  const handleToggleAdaptive = () => {
    const newMode = !config.adaptiveMode;
    bandwidthService.setAdaptiveMode(newMode);
    showNotification(
      `Adaptive mode ${newMode ? 'enabled' : 'disabled'}`, 
      newMode ? 'success' : 'info'
    );
  };

  const handleAddSchedule = () => {
    if (newSchedule.name && newSchedule.days.length > 0) {
      bandwidthService.addSchedule(newSchedule);
      
      setNewSchedule({
        name: '',
        startTime: '09:00',
        endTime: '17:00',
        maxSpeed: 1000,
        days: [],
        enabled: true,
        priority: 5
      });
      
      setShowAddSchedule(false);
      showNotification(`Schedule "${newSchedule.name}" added successfully`, 'success');
    } else {
      showNotification('Please fill in all required fields', 'error');
    }
  };

  const handleDeleteSchedule = (id: string) => {
    setShowDeleteConfirm(id);
  };

  const confirmDeleteSchedule = () => {
    if (showDeleteConfirm) {
      const scheduleToDelete = config.schedule.find(s => s.id === showDeleteConfirm);
      bandwidthService.removeSchedule(showDeleteConfirm);
      showNotification(
        `Schedule "${scheduleToDelete?.name || 'Unknown'}" deleted successfully`, 
        'success'
      );
      setShowDeleteConfirm(null);
    }
  };

  const handleToggleSchedule = (id: string, enabled: boolean) => {
    bandwidthService.updateSchedule(id, { enabled });
    const schedule = config.schedule.find(s => s.id === id);
    showNotification(
      `Schedule "${schedule?.name}" ${enabled ? 'enabled' : 'disabled'}`, 
      enabled ? 'success' : 'info'
    );
  };

  const handleSpeedTest = async () => {
    setIsTestingSpeed(true);
    try {
      const result = await bandwidthService.testConnectionSpeed();
      showNotification(
        `Connection speed: ${bandwidthService.formatSpeed(result.downloadSpeed)} (${result.quality})`, 
        'info'
      );
    } catch (error) {
      showNotification('Failed to test connection speed', 'error');
    } finally {
      setIsTestingSpeed(false);
    }
  };

  const handleDayToggle = (dayIndex: number) => {
    const newDays = newSchedule.days.includes(dayIndex)
      ? newSchedule.days.filter(d => d !== dayIndex)
      : [...newSchedule.days, dayIndex];
    
    setNewSchedule({ ...newSchedule, days: newDays });
  };

  const handleImportSchedules = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const imported = JSON.parse(e.target?.result as string);
            const count = bandwidthService.importConfiguration(imported);
            showNotification(`Imported ${count} schedules successfully`, 'success');
          } catch (error) {
            showNotification('Failed to import configuration', 'error');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const formatBytes = (bytes: number): string => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  };

  const getNetworkIcon = () => {
    switch (stats.networkType) {
      case 'ethernet': return '🔌';
      case 'wifi': return '📶';
      case 'mobile': return '📱';
      default: return '❓';
    }
  };

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency > 80) return 'text-green-400';
    if (efficiency > 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const showNotification = (message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    // Simple toast notification
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm transform transition-all duration-300 ${
      type === 'success' ? 'bg-green-600 text-white' :
      type === 'error' ? 'bg-red-600 text-white' :
      type === 'warning' ? 'bg-yellow-600 text-white' :
      'bg-blue-600 text-white'
    }`;
    
    toast.innerHTML = `
      <div class="flex items-center space-x-2">
        <span class="text-sm font-medium">${message}</span>
        <button onclick="this.parentElement.parentElement.remove()" class="ml-2 text-white/80 hover:text-white">×</button>
      </div>
    `;
    
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }, 5000);
  };

  return (
    <div className="space-y-6">
      {/* Current Status */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center">
            <SignalIcon className="w-5 h-5 mr-2" />
            Bandwidth Control
          </h3
          >
          
          <button
            onClick={handleSpeedTest}
            disabled={isTestingSpeed}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg text-sm transition-colors flex items-center space-x-1"
          >
            <ArrowPathIcon className={`w-4 h-4 ${isTestingSpeed ? 'animate-spin' : ''}`} />
            <span>{isTestingSpeed ? 'Testing...' : 'Test Speed'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-900 rounded-lg p-4">
            <div className="text-gray-400 text-sm">Current Speed</div>
            <div className="text-xl font-bold text-blue-400">
              {bandwidthService.formatSpeed(Math.round(stats.currentSpeed))}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Peak: {bandwidthService.formatSpeed(Math.round(stats.peakSpeed))}
            </div>
          </div>
          
          <div className="bg-gray-900 rounded-lg p-4">
            <div className="text-gray-400 text-sm">Speed Limit</div>
            <div className="text-xl font-bold text-green-400">
              {stats.limitActive ? bandwidthService.formatSpeed(stats.currentLimit) : 'Unlimited'}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {stats.limitActive ? 'Active' : 'No restrictions'}
            </div>
          </div>
          
          <div className="bg-gray-900 rounded-lg p-4">
            <div className="text-gray-400 text-sm flex items-center">
              Network {getNetworkIcon()}
            </div>
            <div className="text-xl font-bold text-purple-400 capitalize">
              {stats.networkType}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Auto-detected
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div className="text-center">
            <div className="text-gray-400">Efficiency</div>
            <div className={`font-bold ${getEfficiencyColor(stats.efficiency)}`}>
              {Math.round(stats.efficiency)}%
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-gray-400">Avg Speed</div>
            <div className="text-white font-bold">
              {bandwidthService.formatSpeed(Math.round(stats.averageSpeed))}
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-gray-400">Downloaded</div>
            <div className="text-white font-bold">
              {formatBytes(stats.totalDownloaded)}
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-gray-400">Status</div>
            <div className={`font-bold ${stats.limitActive ? 'text-orange-400' : 'text-green-400'}`}>
              {stats.limitActive ? 'Limited' : 'Unlimited'}
            </div>
          </div>
        </div>
      </div>

      {/* Speed Limit Configuration */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h4 className="text-white font-medium mb-4">Speed Limit Settings</h4>
        
        <div className="space-y-4">
          {/* Presets */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Quick Presets</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {presets.slice(0, 8).map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => handlePresetChange(preset.name)}
                  className={`p-3 rounded-lg text-sm font-medium transition-colors ${
                    selectedPreset === preset.name
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  <div>{preset.name}</div>
                  <div className="text-xs opacity-75">
                    {bandwidthService.formatSpeed(preset.speed)}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Speed */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Custom Speed Limit (KB/s) - 0 for unlimited
            </label>
            <div className="flex space-x-3">
              <input
                type="number"
                value={customSpeed}
                onChange={(e) => handleCustomSpeedChange(e.target.value)}
                className="flex-1 bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                placeholder="1000"
                min="0"
                max="100000"
              />
              <button
                onClick={() => handleCustomSpeedChange('0')}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Remove Limit
              </button>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Recommended: 500-2000 KB/s for background downloads
            </div>
          </div>

          {/* Adaptive Mode */}
          <div className="flex items-center justify-between p-4 bg-gray-900 rounded-lg">
            <div>
              <div className="text-white font-medium">Adaptive Speed Control</div>
              <div className="text-gray-400 text-sm">
                Automatically adjust speed based on network conditions and schedules
              </div>
            </div>
            <button
              onClick={handleToggleAdaptive}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                config.adaptiveMode ? 'bg-blue-600' : 'bg-gray-600'
              }`}
            >
              <div
                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  config.adaptiveMode ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Scheduled Limits */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-white font-medium flex items-center">
            <ClockIcon className="w-5 h-5 mr-2" />
            Scheduled Limits
          </h4>
          <div className="flex space-x-2">
            <button
              onClick={handleImportSchedules}
              className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition-colors"
            >
              Import
            </button>
            <button
              onClick={() => setShowAddSchedule(true)}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors flex items-center space-x-1"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Add Schedule</span>
            </button>
          </div>
        </div>

        {config.schedule.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <ClockIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No scheduled limits configured</p>
            <p className="text-sm mt-1">Create schedules to automatically control download speeds</p>
          </div>
        ) : (
          <div className="space-y-3">
            {config.schedule.map((schedule) => (
              <div
                key={schedule.id}
                className={`p-4 rounded-lg border transition-colors ${
                  schedule.enabled 
                    ? 'border-blue-500/50 bg-blue-900/20' 
                    : 'border-gray-600 bg-gray-900/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => handleToggleSchedule(schedule.id, !schedule.enabled)}
                        className={`p-2 rounded-lg transition-colors ${
                          schedule.enabled 
                            ? 'text-green-400 hover:text-green-300' 
                            : 'text-gray-400 hover:text-gray-300'
                        }`}
                      >
                        {schedule.enabled ? <PlayIcon className="w-4 h-4" /> : <PauseIcon className="w-4 h-4" />}
                      </button>
                      
                      <div>
                        <div className="text-white font-medium">{schedule.name}</div>
                        <div className="text-gray-400 text-sm">
                          {schedule.startTime} - {schedule.endTime} • {bandwidthService.formatSpeed(schedule.maxSpeed)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-2 flex flex-wrap gap-1">
                      {schedule.days.map(day => (
                        <span
                          key={day}
                          className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded"
                        >
                          {dayNames[day]}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleDeleteSchedule(schedule.id)}
                    className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded transition-colors"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Optimization Suggestions */}
      {suggestions.length > 0 && (
        <div className="bg-yellow-900/20 border border-yellow-500/50 rounded-lg p-4">
          <h4 className="text-yellow-300 font-medium mb-2 flex items-center">
            <ChartBarIcon className="w-5 h-5 mr-2" />
            Optimization Suggestions
          </h4>
          <ul className="text-yellow-200 text-sm space-y-1">
            {suggestions.map((suggestion, index) => (
              <li key={index} className="flex items-start space-x-2">
                <ExclamationTriangleIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Advanced Settings */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center justify-between w-full text-white font-medium hover:text-blue-400 transition-colors"
        >
          <span className="flex items-center">
            <Cog6ToothIcon className="w-5 h-5 mr-2" />
            Advanced Settings
          </span>
          <span className={`transform transition-transform ${showAdvanced ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </button>

        {showAdvanced && (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex items-center space-x-2 p-3 bg-gray-900 rounded-lg">
                <input
                  type="checkbox"
                  checked={config.monitoring}
                  onChange={(e) => {
                    const newConfig = { ...config, monitoring: e.target.checked };
                    setConfig(newConfig);
                    bandwidthService.updateConfig(newConfig);
                  }}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="text-gray-300 font-medium">Enable monitoring</span>
                  <div className="text-gray-500 text-xs">Track bandwidth usage and statistics</div>
                </div>
              </label>
              
              <label className="flex items-center space-x-2 p-3 bg-gray-900 rounded-lg">
                <input
                  type="checkbox"
                  checked={config.networkDetection}
                  onChange={(e) => {
                    const newConfig = { ...config, networkDetection: e.target.checked };
                    setConfig(newConfig);
                    bandwidthService.updateConfig(newConfig);
                  }}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="text-gray-300 font-medium">Network auto-detection</span>
                  <div className="text-gray-500 text-xs">Automatically detect connection type</div>
                </div>
              </label>
              
              <label className="flex items-center space-x-2 p-3 bg-gray-900 rounded-lg">
                <input
                  type="checkbox"
                  checked={config.autoAdjust}
                  onChange={(e) => {
                    const newConfig = { ...config, autoAdjust: e.target.checked };
                    setConfig(newConfig);
                    bandwidthService.updateConfig(newConfig);
                  }}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="text-gray-300 font-medium">Auto-adjust for network type</span>
                  <div className="text-gray-500 text-xs">Optimize limits based on connection</div>
                </div>
              </label>

              <label className="flex items-center space-x-2 p-3 bg-gray-900 rounded-lg">
                <input
                  type="checkbox"
                  checked={config.pauseOnBattery}
                  onChange={(e) => {
                    const newConfig = { ...config, pauseOnBattery: e.target.checked };
                    setConfig(newConfig);
                    bandwidthService.updateConfig(newConfig);
                  }}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="text-gray-300 font-medium">Pause on battery</span>
                  <div className="text-gray-500 text-xs">Reduce speed when on battery power</div>
                </div>
              </label>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => {
                  const exported = bandwidthService.exportConfiguration();
                  const blob = new Blob([exported], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `bandwidth-config-${new Date().toISOString().split('T')[0]}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                  showNotification('Configuration exported successfully', 'success');
                }}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors"
              >
                Export Config
              </button>
              
              <button
                onClick={() => {
                  setShowConfirmModal(true);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-colors"
              >
                Reset to Defaults
              </button>

              <button
                onClick={() => {
                  const logs = bandwidthService.getUsageLogs();
                  const csv = logs.map(log => 
                    `${new Date(log.timestamp).toISOString()},${log.speed},${log.limit},${log.efficiency}`
                  ).join('\n');
                  
                  const blob = new Blob([`timestamp,speed,limit,efficiency\n${csv}`], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `bandwidth-logs-${new Date().toISOString().split('T')[0]}.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                  showNotification('Usage logs exported', 'success');
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
              >
                Export Logs
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Schedule Modal */}
      {showAddSchedule && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-md w-full border border-gray-700 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Add Scheduled Limit</h3>
              
              <div className="space-y-4">
                {/* Schedule Name */}
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Schedule Name</label>
                  <input
                    type="text"
                    value={newSchedule.name}
                    onChange={(e) => setNewSchedule({...newSchedule, name: e.target.value})}
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                    placeholder="Work Hours"
                  />
                </div>

                {/* Time Range */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Start Time</label>
                    <input
                      type="time"
                      value={newSchedule.startTime}
                      onChange={(e) => setNewSchedule({...newSchedule, startTime: e.target.value})}
                      className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">End Time</label>
                    <input
                      type="time"
                      value={newSchedule.endTime}
                      onChange={(e) => setNewSchedule({...newSchedule, endTime: e.target.value})}
                      className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Speed Limit */}
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    Max Speed (KB/s) - {bandwidthService.formatSpeed(newSchedule.maxSpeed)}
                  </label>
                  <input
                    type="range"
                    min="100"
                    max="10000"
                    step="100"
                    value={newSchedule.maxSpeed}
                    onChange={(e) => setNewSchedule({...newSchedule, maxSpeed: parseInt(e.target.value)})}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>100 KB/s</span>
                    <span>10 MB/s</span>
                  </div>
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    Priority (1-10) - {newSchedule.priority}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={newSchedule.priority}
                    onChange={(e) => setNewSchedule({...newSchedule, priority: parseInt(e.target.value)})}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Low</span>
                    <span>High</span>
                  </div>
                </div>

                {/* Days Selection */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Active Days</label>
                  <div className="grid grid-cols-7 gap-1">
                    {dayNames.map((day, index) => (
                      <button
                        key={index}
                        onClick={() => handleDayToggle(index)}
                        className={`p-2 text-xs font-medium rounded transition-colors ${
                          newSchedule.days.includes(index)
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Enabled Toggle */}
                <div className="flex items-center justify-between p-3 bg-gray-900 rounded-lg">
                  <span className="text-gray-300">Enable immediately</span>
                  <button
                    onClick={() => setNewSchedule({...newSchedule, enabled: !newSchedule.enabled})}
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      newSchedule.enabled ? 'bg-blue-600' : 'bg-gray-600'
                    }`}
                  >
                    <div
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        newSchedule.enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowAddSchedule(false)}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddSchedule}
                  disabled={!newSchedule.name || newSchedule.days.length === 0}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors flex items-center space-x-1"
                >
                  <CheckIcon className="w-4 h-4" />
                  <span>Add Schedule</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación de eliminación */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-white mb-4">Delete Schedule</h3>
            <p className="text-gray-300 mb-6">
              Are you sure you want to delete this schedule? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteSchedule}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Reset Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-white mb-4">Reset to Defaults</h3>
            <p className="text-gray-300 mb-6">
              Are you sure you want to reset all settings to defaults? This cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  bandwidthService.resetConfiguration();
                  setConfig(bandwidthService.getConfig());
                  setCustomSpeed('');
                  setSelectedPreset('');
                  showNotification('Configuration reset to defaults', 'info');
                  setShowConfirmModal(false);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}