import { useEffect } from 'react';
import { useDownloadStore } from '../stores/downloadStore';

export function useTheme() {
  const { settings } = useDownloadStore();

  useEffect(() => {
    const applyTheme = (theme: 'dark' | 'light' | 'system') => {
      const root = document.documentElement;
      
      // Remover clases anteriores
      root.classList.remove('dark', 'light');
      
      if (theme === 'system') {
        // System = Default theme (no class, uses :root styles)
        // El tema por defecto es el azul premium
        console.log('🎨 Theme applied: default/system (premium blue)');
      } else if (theme === 'dark') {
        root.classList.add('dark');
        console.log('🎨 Theme applied: dark (pure grays)');
      } else if (theme === 'light') {
        root.classList.add('light');
        console.log('🎨 Theme applied: light');
      }
      
      // Aplicar meta theme-color para la barra del navegador/app
      const metaTheme = document.querySelector('meta[name="theme-color"]');
      if (metaTheme) {
        const colors = {
          system: '#0f172a', // Premium blue
          dark: '#0a0a0a',   // Pure black
          light: '#fafafa'   // White
        };
        metaTheme.setAttribute('content', colors[theme]);
      }
    };

    applyTheme(settings.theme);
  }, [settings.theme]);

  return settings.theme;
}
