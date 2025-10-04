import React, { useState } from 'react';
import { 
  QuestionMarkCircleIcon, 
  XMarkIcon,
  CommandLineIcon 
} from '@heroicons/react/24/outline';

export function KeyboardShortcutsHelp() {
  const [isVisible, setIsVisible] = useState(false);

  const shortcuts = [
    {
      category: 'Navigation',
      items: [
        { keys: ['Ctrl/Cmd', '1'], description: 'Go to Download view' },
        { keys: ['Ctrl/Cmd', '2'], description: 'Go to History view' },
        { keys: ['Ctrl/Cmd', '3'], description: 'Go to Settings view' },
        { keys: ['Ctrl/Cmd', ','], description: 'Open Settings' }
      ]
    },
    {
      category: 'Downloads',
      items: [
        { keys: ['Ctrl/Cmd', 'V'], description: 'Paste URL from clipboard' },
        { keys: ['Ctrl/Cmd', 'Enter'], description: 'Start downloads' },
        { keys: ['Alt', 'Enter'], description: 'Preview video' },
        { keys: ['F5'], description: 'Refresh/Restart downloads' },
        { keys: ['Escape'], description: 'Cancel active downloads' }
      ]
    },
    {
      category: 'Queue Management',
      items: [
        { keys: ['Ctrl/Cmd', 'Shift', 'C'], description: 'Clear download queue' },
        { keys: ['Ctrl/Cmd', 'D'], description: 'Duplicate last download' },
        { keys: ['Ctrl/Cmd', 'A'], description: 'Select all (in playlist)' }
      ]
    },
    {
      category: 'Advanced',
      items: [
        { keys: ['Ctrl/Cmd', 'Shift', 'S'], description: 'Capture video info' },
        { keys: ['Ctrl/Cmd', 'R'], description: 'Reload application' },
        { keys: ['F11'], description: 'Toggle fullscreen' },
        { keys: ['F12'], description: 'Open developer tools' }
      ]
    }
  ];

  const formatKeys = (keys: string[]) => {
    return keys.map((key, index) => (
      <span key={index}>
        <kbd className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded border border-gray-600">
          {key}
        </kbd>
        {index < keys.length - 1 && <span className="mx-1 text-gray-500">+</span>}
      </span>
    ));
  };

  return (
    <>
      {/* Help Button */}
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 w-12 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-lg transition-colors z-40"
        title="Keyboard Shortcuts (?"
      >
        <QuestionMarkCircleIcon className="w-6 h-6" />
      </button>

      {/* Help Modal */}
      {isVisible && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden border border-gray-700">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <CommandLineIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Keyboard Shortcuts</h2>
                  <p className="text-gray-400 text-sm">Speed up your workflow with these shortcuts</p>
                </div>
              </div>
              
              <button
                onClick={() => setIsVisible(false)}
                className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {shortcuts.map((category, categoryIndex) => (
                  <div key={categoryIndex} className="space-y-4">
                    <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">
                      {category.category}
                    </h3>
                    
                    <div className="space-y-3">
                      {category.items.map((shortcut, shortcutIndex) => (
                        <div key={shortcutIndex} className="flex items-center justify-between">
                          <span className="text-gray-300 text-sm">
                            {shortcut.description}
                          </span>
                          <div className="flex items-center space-x-1">
                            {formatKeys(shortcut.keys)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Tips */}
              <div className="mt-8 p-4 bg-blue-900/20 border border-blue-500/50 rounded-lg">
                <h4 className="text-blue-300 font-medium mb-2">💡 Pro Tips</h4>
                <ul className="text-blue-200 text-sm space-y-1">
                  <li>• Copy YouTube URLs and paste them instantly with Ctrl+V</li>
                  <li>• Use Alt+Enter to preview videos before downloading</li>
                  <li>• Press F5 to restart stalled downloads</li>
                  <li>• Hold Shift while clicking for batch operations</li>
                </ul>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-6 border-t border-gray-700">
              <div className="text-sm text-gray-400">
                Press <kbd className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded border border-gray-600">?</kbd> anytime to open this help
              </div>
              
              <button
                onClick={() => setIsVisible(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}