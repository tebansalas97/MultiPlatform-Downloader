import React from 'react';

interface SubtitleSelectorProps {
  videoUrl: string;
  subtitles?: any[];
  onSelect: (languages: string[], options: any) => void;
  isVisible: boolean;
  onClose: () => void;
}

export function SubtitleSelector({ videoUrl, subtitles, onSelect, isVisible, onClose }: SubtitleSelectorProps) {
  if (!isVisible) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-6 rounded-lg max-w-md w-full">
        <h3 className="text-lg font-bold text-white mb-4">Select Subtitles</h3>
        <p className="text-gray-400 mb-4">Subtitle selection is currently unavailable.</p>
        <div className="flex justify-end space-x-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-gray-300 hover:text-white"
          >
            Cancel
          </button>
          <button 
            onClick={() => onSelect([], {})}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
