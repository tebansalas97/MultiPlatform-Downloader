import React from 'react';
import { XMarkIcon, MinusIcon, Square2StackIcon } from '@heroicons/react/24/outline';

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
    <div className="h-8 bg-gray-900 flex items-center justify-between px-4 select-none border-b border-gray-700">
      <div className="flex items-center space-x-2">
        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
        <span className="text-xs text-gray-400 font-medium">
          YouTube Downloader
        </span>
      </div>
      
      <div className="flex items-center space-x-1">
        <button
          onClick={handleMinimize}
          className="w-6 h-6 flex items-center justify-center hover:bg-gray-700 rounded"
        >
          <MinusIcon className="w-3 h-3 text-gray-400" />
        </button>
        <button
          onClick={handleMaximize}
          className="w-6 h-6 flex items-center justify-center hover:bg-gray-700 rounded"
        >
          <Square2StackIcon className="w-3 h-3 text-gray-400" />
        </button>
        <button
          onClick={handleClose}
          className="w-6 h-6 flex items-center justify-center hover:bg-red-600 rounded"
        >
          <XMarkIcon className="w-3 h-3 text-gray-400" />
        </button>
      </div>
    </div>
  );
}