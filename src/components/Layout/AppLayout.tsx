import React, { useState } from 'react';
import { useDownloadStore } from '../../stores/downloadStore';
import { Sidebar } from './Sidebar';
import { MainContent } from './MainContent';
import { DownloadQueue } from '../Download/DownloadQueue';

export function AppLayout() {
  const { activeView, setActiveView, jobs } = useDownloadStore();
  const [isQueueVisible, setIsQueueVisible] = useState(false);

  // Auto-mostrar queue cuando hay descargas
  React.useEffect(() => {
    if (jobs.length > 0 && !isQueueVisible) {
      setIsQueueVisible(true);
    }
  }, [jobs.length, isQueueVisible]);

  return (
    <div className="flex flex-1 bg-gray-800 overflow-hidden relative">
      <Sidebar activeView={activeView} onViewChange={setActiveView} />
      <MainContent activeView={activeView} />
      
      {/* Download Queue */}
      <DownloadQueue 
        isVisible={isQueueVisible || jobs.length > 0}
        onToggle={() => setIsQueueVisible(!isQueueVisible)}
      />
    </div>
  );
}