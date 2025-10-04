import React, { useState, useRef } from 'react';
import { CloudArrowUpIcon } from '@heroicons/react/24/outline';
import { platformService } from '../../services/platforms/PlatformService';

interface DropZoneProps {
  onDrop: (urls: string[]) => void;
  className?: string;
  children?: React.ReactNode;
}

export function DropZone({ onDrop, className = "", children }: DropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);
  const dropRef = useRef<HTMLDivElement>(null);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const newCount = dragCounter + 1;
    setDragCounter(newCount);
    
    if (newCount === 1) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const newCount = dragCounter - 1;
    setDragCounter(newCount);
    
    if (newCount <= 0) {
      setIsDragOver(false);
      setDragCounter(0);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Detectar tipo de contenido arrastrado
    const types = Array.from(e.dataTransfer.types);
    if (types.includes('text/uri-list')) {
      // Es un link
    } else if (types.includes('Files')) {
      // Son archivos
    } else if (types.includes('text/plain')) {
      // Es texto
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    setDragCounter(0);

    console.log('📁 Files/data dropped');

    const urls: string[] = [];
    
    // 📝 Manejar texto arrastrado
    if (e.dataTransfer.getData) {
      const text = e.dataTransfer.getData('text/plain');
      console.log('📝 Dropped text:', text);
      
      if (text) {
        const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
        const validUrls = lines.filter(line => {
          const isValid = isValidUrl(line);
          console.log(`🔗 URL validation: ${line} -> ${isValid}`);
          return isValid;
        });
        urls.push(...validUrls);
      }
    }

    // 🔗 Manejar links del navegador
    if (e.dataTransfer.types.includes('text/uri-list')) {
      const uriList = e.dataTransfer.getData('text/uri-list');
      console.log('🔗 URI list:', uriList);
      
      const draggedUrls = uriList
        .split('\n')
        .map(url => url.trim())
        .filter(url => url && !url.startsWith('#') && isValidUrl(url));
      
      urls.push(...draggedUrls);
    }

    if (urls.length > 0) {
      const uniqueUrls = Array.from(new Set(urls));
      console.log('✅ Valid URLs found:', uniqueUrls);
      onDrop(uniqueUrls);
    } else {
      console.warn('⚠️ No valid URLs found in dropped content');
    }
  };

  const isValidUrl = (string: string): boolean => {
    // 🆕 Usar platformService para validar URLs de cualquier plataforma soportada
    const platform = platformService.detectPlatform(string);
    return platform !== null;
  };

  return (
    <div
      ref={dropRef}
      className={`relative ${className}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {children}
      
      {/* 🎯 Overlay when dragging */}
      {isDragOver && (
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/30 to-purple-600/30 border-2 border-blue-500 border-dashed rounded-lg flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="text-center bg-gray-900/80 rounded-lg p-6 border border-gray-600">
            <CloudArrowUpIcon className="w-16 h-16 text-blue-400 mx-auto mb-4 animate-bounce" />
            <p className="text-blue-300 font-medium text-lg mb-2">Drop video URLs here</p>
            <div className="text-blue-400 text-sm space-y-1">
              <div>✓ URLs from supported platforms</div>
              <div>✓ Text files with URL lists</div>
              <div>✓ Multiple links at once</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}