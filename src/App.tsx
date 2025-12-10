import React, { useEffect } from 'react';
import { AppLayout } from './components/Layout/AppLayout';
import { TitleBar } from './components/Layout/TitleBar';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { KeyboardShortcutsHelp } from './components/ui/KeyboardShortcutsHelp';
import { QuickSettings } from './components/ui/QuickSettings';
import { UpdateNotification } from './components/ui/UpdateNotification';
import { checkEnvironment, electronApi } from './utils/electronApi';
import { isWebMode, showWebModeWarning } from './config/webMode';
import { useTheme } from './hooks/useTheme';
import './App.css';

function App() {
  // Aplicar tema
  useTheme();
  
  useEffect(() => {
    console.log('🚀 App starting with enhanced initialization...');
    
    // ✅ Mostrar advertencia en modo web
    if (isWebMode) {
      showWebModeWarning();
    }
    
    const initializeApp = async () => {
      const environment = {
        isElectron: !!(window.process && window.process.type),
        isWebMode, // ✅ Agregar flag
        hasRequire: !!(window.require),
        userAgent: navigator.userAgent,
        location: window.location.href,
        electronApiStatus: electronApi?.isElectron || false,
        timestamp: new Date().toISOString()
      };
      
      console.log('🌍 Environment details:', environment);
      
      try {
        await checkEnvironment();
        
        // ✅ Solo verificar yt-dlp en Electron
        if (electronApi.isElectron && !isWebMode) {
          console.log('🔍 Checking yt-dlp installation...');
          const ytDlpReady = await electronApi.ensureYtDlpUpdated();
          
          if (!ytDlpReady) {
            console.error('❌ yt-dlp is not properly installed');
          } else {
            console.log('✅ yt-dlp is ready');
          }
        }
        
      } catch (error) {
        console.error('❌ App initialization failed:', error);
      }
    };
    
    // ✅ Solicitar permisos solo si no estamos en modo web
    if (!isWebMode && typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          console.log('🔔 Notification permission:', permission);
        });
      }
    }

    initializeApp();
    console.log('⚙️ App initialization complete');
  }, []);

  return (
    <div className="h-screen bg-gray-900 flex flex-col overflow-hidden">
      {/* ✅ Solo mostrar TitleBar en Electron */}
      {!isWebMode && <TitleBar />}
      <ErrorBoundary>
        <AppLayout />
      </ErrorBoundary>
      <KeyboardShortcutsHelp />
      <QuickSettings />
      <UpdateNotification />
    </div>
  );
}

export default App;
