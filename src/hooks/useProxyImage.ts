import { useState, useEffect } from 'react';
import { electronApi } from '../utils/electronApi';

// Plataformas que necesitan proxy para evitar CORS
const PROXY_PLATFORMS = ['instagram', 'reddit', 'tiktok', 'facebook'];

export function useProxyImage(
  originalUrl: string | undefined,
  platform?: string
): { imageUrl: string | null; loading: boolean; error: boolean } {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!originalUrl) {
      setImageUrl(null);
      setLoading(false);
      setError(false);
      return;
    }

    // Determinar si necesita proxy basándose en la plataforma o la URL
    const needsProxy = platform 
      ? PROXY_PLATFORMS.includes(platform.toLowerCase())
      : PROXY_PLATFORMS.some(p => originalUrl.toLowerCase().includes(p));

    if (!needsProxy) {
      // No necesita proxy, usar URL directa
      setImageUrl(originalUrl);
      setLoading(false);
      setError(false);
      return;
    }

    // Necesita proxy, cargar via Electron
    setLoading(true);
    setError(false);

    electronApi.fetchImage(originalUrl)
      .then(dataUrl => {
        if (dataUrl) {
          setImageUrl(dataUrl);
        } else {
          setError(true);
          setImageUrl(null);
        }
      })
      .catch(() => {
        setError(true);
        setImageUrl(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [originalUrl, platform]);

  return { imageUrl, loading, error };
}
