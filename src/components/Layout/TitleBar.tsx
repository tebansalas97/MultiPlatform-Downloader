import React from 'react';
import { XMarkIcon, MinusIcon, Square2StackIcon, GlobeAltIcon } from '@heroicons/react/24/outline';

// Solo declara el tipo si Electron está disponible
declare global {
  interface Window {
    require?: any;
  }
}

export function TitleBar() {
  const handleMinimize = () => {
    if (window.require) {
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.send('window-minimize');
    }
  };

  const handleMaximize = () => {
    if (window.require) {
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.send('window-maximize');
    }
  };

  const handleClose = () => {
    if (window.require) {
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.send('window-close');
    }
  };

  return (
    <div className="h-9 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 flex items-center justify-between px-4 select-none border-b border-gray-700/50 app-drag">
      <div className="flex items-center space-x-3 no-drag">
        <div className="w-5 h-5 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-md flex items-center justify-center shadow-lg shadow-purple-500/20">
          <GlobeAltIcon className="w-3 h-3 text-white" />
        </div>
        <span className="text-sm text-gray-300 font-medium tracking-tight">
          MultiPlatform Downloader
        </span>
        <span className="text-[10px] px-1.5 py-0.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full font-medium">
          PRO
        </span>
      </div>
      
      <div className="flex items-center space-x-1 no-drag">
        <button
          onClick={handleMinimize}
          className="w-7 h-7 flex items-center justify-center hover:bg-gray-700/50 rounded-lg transition-colors group"
          title="Minimize"
        >
          <MinusIcon className="w-3.5 h-3.5 text-gray-400 group-hover:text-white transition-colors" />
        </button>
        <button
          onClick={handleMaximize}
          className="w-7 h-7 flex items-center justify-center hover:bg-gray-700/50 rounded-lg transition-colors group"
          title="Maximize"
        >
          <Square2StackIcon className="w-3.5 h-3.5 text-gray-400 group-hover:text-white transition-colors" />
        </button>
        <button
          onClick={handleClose}
          className="w-7 h-7 flex items-center justify-center hover:bg-red-600 rounded-lg transition-colors group"
          title="Close"
        >
          <XMarkIcon className="w-3.5 h-3.5 text-gray-400 group-hover:text-white transition-colors" />
        </button>
      </div>
    </div>
  );
}