import React, { useEffect, useState } from 'react';
import { electronApi } from '../../utils/electronApi';

export function UpdateNotification() {
  const [updateStatus, setUpdateStatus] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!electronApi.isElectron) return;

    const cleanupAvailable = electronApi.on('update-available', () => {
      setUpdateStatus('available');
      setShow(true);
    });

    const cleanupProgress = electronApi.on('update-progress', (event: any, data: any) => {
      // data might be the second argument depending on how ipcRenderer passes it
      const progressData = data || event; 
      setUpdateStatus('downloading');
      if (progressData && progressData.percent) {
        setProgress(progressData.percent);
      }
    });

    const cleanupDownloaded = electronApi.on('update-downloaded', () => {
      setUpdateStatus('downloaded');
    });

    const cleanupError = electronApi.on('update-error', (event: any, err: any) => {
      console.error('Update error:', err);
      setUpdateStatus('error');
    });

    return () => {
      cleanupAvailable();
      cleanupProgress();
      cleanupDownloaded();
      cleanupError();
    };
  }, []);

  if (!show) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-gray-800 border border-gray-700 p-4 rounded-lg shadow-lg z-50 max-w-sm">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-white font-bold">Update Available</h3>
        <button onClick={() => setShow(false)} className="text-gray-400 hover:text-white">×</button>
      </div>
      
      {updateStatus === 'available' && (
        <div>
          <p className="text-gray-300 text-sm mb-3">A new version is available.</p>
          <div className="flex space-x-2">
            <button 
              onClick={() => electronApi.send('download-update')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
            >
              Download
            </button>
            <button 
              onClick={() => setShow(false)}
              className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm"
            >
              Later
            </button>
          </div>
        </div>
      )}

      {updateStatus === 'downloading' && (
        <div>
          <p className="text-gray-300 text-sm mb-2">Downloading update...</p>
          <div className="w-full bg-gray-700 rounded-full h-2.5">
            <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
          </div>
        </div>
      )}

      {updateStatus === 'downloaded' && (
        <div>
          <p className="text-gray-300 text-sm mb-3">Update downloaded. Restart to install?</p>
          <button 
            onClick={() => electronApi.send('install-update')}
            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm w-full"
          >
            Restart & Install
          </button>
        </div>
      )}
      
      {updateStatus === 'error' && (
        <p className="text-red-400 text-sm">Error updating. Please try again later.</p>
      )}
    </div>
  );
}
