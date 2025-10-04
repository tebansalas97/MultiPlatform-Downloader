import React, { useState, useEffect } from 'react';
import { 
  WifiIcon,
  GlobeAltIcon,
  ArrowUpTrayIcon,
  XMarkIcon,
  PlusIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { proxyService } from '../../services/ProxyService';

interface ProxyConfig {
  enabled: boolean;
  type: 'http' | 'https' | 'socks4' | 'socks5';
  host: string;
  port: number;
  username?: string;
  password?: string;
  timeout?: number;
}

export function ProxySettings() {
  const [currentProxy, setCurrentProxy] = useState<ProxyConfig | null>(null);
  const [proxyStats, setProxyStats] = useState<any>(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [customProxy, setCustomProxy] = useState<Partial<ProxyConfig>>({
    enabled: true,
    type: 'http',
    host: '',
    port: 8080,
    timeout: 10000
  });
  const [showAddProxy, setShowAddProxy] = useState(false);
  const [importText, setImportText] = useState('');
  const [showImport, setShowImport] = useState(false);

  useEffect(() => {
    loadProxyData();
    const interval = setInterval(loadProxyData, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const loadProxyData = () => {
    setCurrentProxy(proxyService.getCurrentProxy());
    setProxyStats(proxyService.getProxyStats());
  };

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    try {
      const directResult = await proxyService.testDirectConnection();
      console.log('Direct connection test:', directResult);
      
      if (currentProxy) {
        const proxyResult = await proxyService.testProxy(currentProxy);
        console.log('Proxy connection test:', proxyResult);
      }
    } finally {
      setIsTestingConnection(false);
      loadProxyData();
    }
  };

  const handleSetCustomProxy = () => {
    if (customProxy.host && customProxy.port) {
      const success = proxyService.setCustomProxy(customProxy as ProxyConfig);
      if (success) {
        setShowAddProxy(false);
        setCustomProxy({
          enabled: true,
          type: 'http',
          host: '',
          port: 8080,
          timeout: 10000
        });
        loadProxyData();
      }
    }
  };

  const handleAutoDetect = async () => {
    setIsTestingConnection(true);
    try {
      const success = await proxyService.setAutoProxy();
      if (success) {
        loadProxyData();
      }
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleDisableProxy = () => {
    proxyService.disableProxy();
    loadProxyData();
  };

  const handleImportProxies = async () => {
    if (importText.trim()) {
      try {
        const imported = await proxyService.importProxyList(importText);
        alert(`Successfully imported ${imported} proxies`);
        setImportText('');
        setShowImport(false);
        loadProxyData();
      } catch (error) {
        alert('Failed to import proxies');
      }
    }
  };

  const getConnectionStatus = () => {
    if (!currentProxy) return { color: 'text-gray-400', text: 'No proxy configured' };
    if (proxyStats?.successRate > 80) return { color: 'text-green-400', text: 'Excellent connection' };
    if (proxyStats?.successRate > 60) return { color: 'text-yellow-400', text: 'Good connection' };
    if (proxyStats?.successRate > 30) return { color: 'text-orange-400', text: 'Poor connection' };
    return { color: 'text-red-400', text: 'Connection issues' };
  };

  const status = getConnectionStatus();

  return (
    <div className="space-y-6">
      {/* Current Proxy Status */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <WifiIcon className="w-5 h-5 mr-2" />
          Proxy Configuration
        </h3>

        <div className="space-y-4">
          {/* Status Display */}
          <div className="flex items-center justify-between p-4 bg-gray-900 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${
                currentProxy?.enabled ? 'bg-green-400' : 'bg-gray-400'
              }`} />
              <div>
                <div className="text-white font-medium">
                  {currentProxy?.enabled 
                    ? `${currentProxy.type.toUpperCase()}://${currentProxy.host}:${currentProxy.port}`
                    : 'Direct Connection'
                  }
                </div>
                <div className={`text-sm ${status.color}`}>
                  {status.text}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleTestConnection}
                disabled={isTestingConnection}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg text-sm transition-colors flex items-center space-x-1"
              >
                <ArrowPathIcon className={`w-4 h-4 ${isTestingConnection ? 'animate-spin' : ''}`} />
                <span>Test</span>
              </button>

              {currentProxy?.enabled && (
                <button
                  onClick={handleDisableProxy}
                  className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-colors"
                >
                  Disable
                </button>
              )}
            </div>
          </div>

          {/* Proxy Stats */}
          {proxyStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-900 rounded-lg p-3">
                <div className="text-gray-400 text-sm">Success Rate</div>
                <div className="text-white font-bold">
                  {Math.round(proxyStats.successRate)}%
                </div>
              </div>
              <div className="bg-gray-900 rounded-lg p-3">
                <div className="text-gray-400 text-sm">Avg Latency</div>
                <div className="text-white font-bold">
                  {proxyStats.avgLatency}ms
                </div>
              </div>
              <div className="bg-gray-900 rounded-lg p-3">
                <div className="text-gray-400 text-sm">Tested</div>
                <div className="text-white font-bold">
                  {proxyStats.tested}
                </div>
              </div>
              <div className="bg-gray-900 rounded-lg p-3">
                <div className="text-gray-400 text-sm">Working</div>
                <div className="text-white font-bold">
                  {proxyStats.working}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Proxy Actions */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h4 className="text-white font-medium mb-4">Proxy Setup</h4>
        
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleAutoDetect}
              disabled={isTestingConnection}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors flex items-center space-x-2"
            >
              <GlobeAltIcon className="w-4 h-4" />
              <span>Auto-Detect Best Proxy</span>
            </button>

            <button
              onClick={() => setShowAddProxy(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center space-x-2"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Add Custom Proxy</span>
            </button>

            <button
              onClick={() => setShowImport(true)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors flex items-center space-x-2"
            >
              <ArrowUpTrayIcon className="w-4 h-4" />
              <span>Import Proxy List</span>
            </button>
          </div>

          {/* Tips */}
          <div className="p-4 bg-blue-900/20 border border-blue-500/50 rounded-lg">
            <h5 className="text-blue-300 font-medium mb-2">Why use a proxy?</h5>
            <ul className="text-blue-200 text-sm space-y-1">
              <li>• Bypass geographic restrictions on YouTube content</li>
              <li>• Improve download speeds in some regions</li>
              <li>• Protect your privacy and IP address</li>
              <li>• Access blocked content</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Add Custom Proxy Modal */}
      {showAddProxy && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-md w-full border border-gray-700">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Add Custom Proxy</h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Type</label>
                    <select
                      value={customProxy.type}
                      onChange={(e) => setCustomProxy({...customProxy, type: e.target.value as any})}
                      className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white"
                    >
                      <option value="http">HTTP</option>
                      <option value="https">HTTPS</option>
                      <option value="socks4">SOCKS4</option>
                      <option value="socks5">SOCKS5</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Port</label>
                    <input
                      type="number"
                      value={customProxy.port}
                      onChange={(e) => setCustomProxy({...customProxy, port: parseInt(e.target.value)})}
                      className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white"
                      placeholder="8080"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Host/IP Address</label>
                  <input
                    type="text"
                    value={customProxy.host}
                    onChange={(e) => setCustomProxy({...customProxy, host: e.target.value})}
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white"
                    placeholder="proxy.example.com"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Username (Optional)</label>
                    <input
                      type="text"
                      value={customProxy.username || ''}
                      onChange={(e) => setCustomProxy({...customProxy, username: e.target.value || undefined})}
                      className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Password (Optional)</label>
                    <input
                      type="password"
                      value={customProxy.password || ''}
                      onChange={(e) => setCustomProxy({...customProxy, password: e.target.value || undefined})}
                      className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowAddProxy(false)}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSetCustomProxy}
                  disabled={!customProxy.host || !customProxy.port}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Add Proxy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Proxies Modal */}
      {showImport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-lg w-full border border-gray-700">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Import Proxy List</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    Paste proxy list (one per line)
                  </label>
                  <textarea
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white h-32"
                    placeholder="proxy1.com:8080&#10;socks5://user:pass@proxy2.com:1080&#10;http://proxy3.com:3128"
                  />
                </div>

                <div className="text-xs text-gray-400">
                  Supported formats:
                  <ul className="mt-1 space-y-1">
                    <li>• host:port</li>
                    <li>• type://host:port</li>
                    <li>• type://username:password@host:port</li>
                  </ul>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowImport(false)}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImportProxies}
                  disabled={!importText.trim()}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Import
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}