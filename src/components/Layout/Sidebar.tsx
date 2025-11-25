import React from 'react';
import { 
  ArrowDownTrayIcon, 
  ClockIcon, 
  Cog6ToothIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';
import { PlatformIcon } from '../ui/PlatformIcon';

interface SidebarProps {
  activeView: 'download' | 'history' | 'settings';
  onViewChange: (view: 'download' | 'history' | 'settings') => void;
}

// Plataformas soportadas
const SUPPORTED_PLATFORMS = [
  { id: 'youtube', name: 'YouTube' },
  { id: 'tiktok', name: 'TikTok' },
  { id: 'twitter', name: 'Twitter/X' },
  { id: 'instagram', name: 'Instagram' },
  { id: 'reddit', name: 'Reddit' },
  { id: 'twitch', name: 'Twitch' },
  { id: 'facebook', name: 'Facebook' },
];

export function Sidebar({ activeView, onViewChange }: SidebarProps) {
  const menuItems = [
    {
      id: 'download' as const,
      label: 'Download',
      icon: ArrowDownTrayIcon,
      description: 'Add new downloads'
    },
    {
      id: 'history' as const,
      label: 'History',
      icon: ClockIcon,
      description: 'View completed downloads'
    },
    {
      id: 'settings' as const,
      label: 'Settings',
      icon: Cog6ToothIcon,
      description: 'App configuration'
    }
  ];

  return (
    <div className="w-72 bg-gray-900 flex flex-col border-r border-gray-800">
      {/* Header */}
      <div className="p-5 border-b border-gray-800">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
            <GlobeAltIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-lg tracking-tight">MultiPlatform</h1>
            <p className="text-xs text-gray-500">Video Downloader PRO</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3">
        <div className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={`
                  w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-left transition-all duration-200
                  ${isActive 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }
                `}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold">{item.label}</div>
                  <div className={`text-xs truncate ${isActive ? 'text-blue-200' : 'text-gray-600'}`}>
                    {item.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Supported Platforms - Clean Design */}
      <div className="px-4 py-4 border-t border-gray-800">
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-3 font-medium">
          Supported Platforms
        </p>
        <div className="grid grid-cols-4 gap-2">
          {SUPPORTED_PLATFORMS.map((platform) => (
            <div
              key={platform.id}
              className="flex flex-col items-center justify-center p-2 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors group cursor-default"
              title={platform.name}
            >
              <PlatformIcon platform={platform.id} size="lg" />
              <span className="text-[9px] text-gray-500 mt-1 group-hover:text-gray-400 transition-colors truncate w-full text-center">
                {platform.name.split('/')[0]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <span>v2.0.0</span>
          <span>yt-dlp powered</span>
        </div>
      </div>
    </div>
  );
}