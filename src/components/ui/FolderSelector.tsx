import React, { useState } from 'react';
import { FolderIcon, CheckIcon } from '@heroicons/react/24/outline';

// ✅ SOLUCIÓN: Verificación segura antes de destructurar
let ipcRenderer: any = null;
if (typeof window !== 'undefined' && window.require) {
  try {
    const electron = window.require('electron');
    ipcRenderer = electron.ipcRenderer;
  } catch (e) {
    console.warn('Electron ipcRenderer not available');
  }
}

interface FolderSelectorProps {
  value: string;
  onChange: (folder: string) => void;
  placeholder?: string;
  className?: string;
}

export function FolderSelector({ 
  value, 
  onChange, 
  placeholder = "Select download folder", 
  className = "" 
}: FolderSelectorProps) {
  const [isSelecting, setIsSelecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelectFolder = async () => {
    // ✅ Verificar si estamos en Electron
    if (!ipcRenderer) {
      // ✅ Fallback para modo web - usar input[type="file"]
      const input = document.createElement('input');
      input.type = 'file';
      // @ts-ignore - webkitdirectory no está en tipos estándar
      input.webkitdirectory = true;
      input.onchange = (e: any) => {
        const files = e.target.files;
        if (files && files.length > 0) {
          const firstFile = files[0];
          const folderPath = firstFile.path?.replace(/[^/\\]+$/, '') || 
                            `${process.env.USERPROFILE || process.env.HOME}/Downloads`;
          onChange(folderPath);
        }
      };
      input.click();
      return;
    }

    setIsSelecting(true);
    setError(null);
    
    try {
      const result = await ipcRenderer.invoke('select-folder');
      if (result && !result.canceled && result.filePaths.length > 0) {
        onChange(result.filePaths[0]);
      }
    } catch (error) {
      console.error('Error selecting folder:', error);
      setError('Failed to select folder. Please try again.');
    } finally {
      setIsSelecting(false);
    }
  };

  const getDisplayPath = () => {
    if (!value) return placeholder;
    
    const parts = value.split(/[/\\]/);
    if (parts.length > 3) {
      return `.../${parts.slice(-3).join('/')}`;
    }
    return value;
  };

  return (
    <div className={`flex flex-col space-y-2 ${className}`}>
      <div className="flex items-center space-x-2">
        <div className="flex-1 relative">
          <FolderIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={getDisplayPath()}
            readOnly
            placeholder={placeholder}
            className="w-full bg-gray-900 border border-gray-600 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-400 cursor-pointer focus:outline-none focus:border-blue-500"
            onClick={handleSelectFolder}
            title={value || placeholder}
          />
          {value && (
            <CheckIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-green-400" />
          )}
        </div>
        
        <button
          onClick={handleSelectFolder}
          disabled={isSelecting}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            isSelecting
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {isSelecting ? 'Selecting...' : 'Browse'}
        </button>
      </div>

      {error && (
        <div className="text-sm text-red-400 flex items-center space-x-1">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {!ipcRenderer && (
        <div className="text-xs text-yellow-400">
          ℹ️ Running in browser mode - folder selection limited
        </div>
      )}
    </div>
  );
}