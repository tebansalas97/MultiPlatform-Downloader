import React, { useState } from 'react';
import { useProxyImage } from '../../hooks/useProxyImage';
import { PlayIcon } from '@heroicons/react/24/outline';

interface ProxyImageProps {
  src: string | undefined;
  alt: string;
  platform?: string;
  className?: string;
  fallbackIcon?: React.ReactNode;
}

export function ProxyImage({ 
  src, 
  alt, 
  platform, 
  className = '',
  fallbackIcon
}: ProxyImageProps) {
  const { imageUrl, loading, error } = useProxyImage(src, platform);
  const [imgError, setImgError] = useState(false);

  // Si hay error o no hay imagen, mostrar fallback
  if (error || imgError || !imageUrl) {
    if (loading) {
      return (
        <div className={`flex items-center justify-center bg-gray-700 ${className}`}>
          <div className="w-4 h-4 border-2 border-gray-500 border-t-white rounded-full animate-spin" />
        </div>
      );
    }

    return (
      <div className={`flex items-center justify-center bg-gray-700 ${className}`}>
        {fallbackIcon || <PlayIcon className="w-6 h-6 text-gray-500" />}
      </div>
    );
  }

  // Mostrar loading mientras carga
  if (loading) {
    return (
      <div className={`flex items-center justify-center bg-gray-700 ${className}`}>
        <div className="w-4 h-4 border-2 border-gray-500 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  // Mostrar imagen
  return (
    <img
      src={imageUrl}
      alt={alt}
      className={className}
      onError={() => setImgError(true)}
    />
  );
}
