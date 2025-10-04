import React from 'react';
import { DownloadView } from '../Views/DownloadView';
import { HistoryView } from '../Views/HistoryView';
import { SettingsView } from '../Views/SettingsView';

interface MainContentProps {
  activeView: 'download' | 'history' | 'settings';
}

export function MainContent({ activeView }: MainContentProps) {
  const renderView = () => {
    switch (activeView) {
      case 'download':
        return <DownloadView />;
      case 'history':
        return <HistoryView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DownloadView />;
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-900 overflow-hidden">
      {renderView()}
    </div>
  );
}