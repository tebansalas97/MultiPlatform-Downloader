import { platformService } from './platforms/PlatformService';

class VideoInfoService {
  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('video-info-request', this.handleRequest.bind(this) as EventListener);
      console.log('🔧 VideoInfoService initialized');
    }
  }

  private async handleRequest(event: Event) {
    const customEvent = event as CustomEvent;
    const { url } = customEvent.detail;
    
    try {
      console.log('VideoInfoService: Processing request for', url);
      const info = await platformService.getVideoInfo(url);
      
      window.dispatchEvent(new CustomEvent('video-info-response', {
        detail: { info }
      }));
    } catch (error) {
      console.error('VideoInfoService: Error getting info', error);
      window.dispatchEvent(new CustomEvent('video-info-response', {
        detail: { error: error instanceof Error ? error.message : 'Unknown error' }
      }));
    }
  }
}

export const videoInfoService = new VideoInfoService();
