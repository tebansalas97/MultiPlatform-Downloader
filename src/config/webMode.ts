export const isWebMode = typeof window !== 'undefined' && 
                        !window.process?.type;

export const webModeConfig = {
  enableNotifications: false,
  enableFileDownload: true,
  defaultFolder: '/downloads',
  mockDownloads: true
};

export function showWebModeWarning() {
  if (isWebMode) {
    const warning = document.createElement('div');
    warning.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-yellow-600 text-white px-6 py-3 rounded-lg shadow-lg animate-slide-down';
    warning.innerHTML = `
      <div class="flex items-center space-x-3">
        <div class="flex-1">
          <div class="font-semibold">Running in Browser Mode</div>
          <div class="text-sm opacity-90">Some features are limited. Download the desktop app for full functionality.</div>
        </div>
        <button onclick="this.parentElement.parentElement.remove()" class="text-white hover:text-yellow-200 text-2xl leading-none">&times;</button>
      </div>
    `;
    document.body.appendChild(warning);
    
    // Auto-remover después de 10 segundos
    setTimeout(() => {
      if (warning.parentElement) {
        warning.style.transform = 'translateX(-50%) translateY(-120%)';
        setTimeout(() => warning.remove(), 300);
      }
    }, 10000);
  }
}