import React from 'react';
import { 
  ArrowDownTrayIcon, 
  ClockIcon, 
  Cog6ToothIcon,
  VideoCameraIcon 
} from '@heroicons/react/24/outline';

interface SidebarProps {
  activeView: 'download' | 'history' | 'settings';
  onViewChange: (view: 'download' | 'history' | 'settings') => void;
}

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
    <div className="w-72 bg-gray-800 flex flex-col border-r border-gray-700">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <VideoCameraIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-white font-semibold">YouTube DL</h1>
            <p className="text-xs text-gray-400">Download Manager</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2">
        <div className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={`
                  w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-left transition-colors
                  ${isActive 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }
                `}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{item.label}</div>
                  <div className="text-xs opacity-75 truncate">{item.description}</div>
                </div>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-700">
        <div className="text-xs text-gray-400 text-center">
          v1.0.0 • Made with ❤️
        </div>
      </div>
    </div>
  );
}