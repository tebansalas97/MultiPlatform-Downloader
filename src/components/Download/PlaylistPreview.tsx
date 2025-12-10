import React from 'react';

export function PlaylistPreview({ playlistInfo, onDownload }: any) {
  return (
    <div className="p-4 bg-gray-800 rounded-lg">
      <h3 className="text-lg font-bold text-white">Playlist Preview</h3>
      <p className="text-gray-400">Playlist preview is currently unavailable.</p>
      {playlistInfo && (
        <div className="mt-2">
          <p className="text-white">{playlistInfo.title}</p>
          <p className="text-sm text-gray-400">{playlistInfo.videoCount} videos</p>
        </div>
      )}
    </div>
  );
}
