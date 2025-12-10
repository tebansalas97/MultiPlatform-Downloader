export interface BandwidthConfig {
  enabled: boolean;
  maxSpeed: number; // bytes per second
  adaptiveMode: boolean;
  monitoring: boolean;
  networkDetection: boolean;
  autoAdjust: boolean;
  pauseOnBattery: boolean;
  schedule: BandwidthSchedule[];
}

export interface BandwidthSchedule {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  maxSpeed: number;
  days: number[];
  enabled: boolean;
  priority: number;
}

export interface BandwidthStats {
  currentSpeed: number;
  totalDownloaded: number;
  activeDownloads: number;
  networkType: 'ethernet' | 'wifi' | 'mobile' | 'unknown';
  latency: number;
  peakSpeed: number;
  limitActive: boolean;
  currentLimit: number;
  efficiency: number;
  averageSpeed: number;
}

export interface SpeedPreset {
  name: string;
  speed: number;
  description?: string;
}

export interface OptimizationSuggestion {
  id: string;
  title: string;
  description: string;
  type: 'info' | 'warning' | 'success';
  action?: () => void;
}

class BandwidthService {
  private config: BandwidthConfig = {
    enabled: false,
    maxSpeed: 0,
    adaptiveMode: false,
    monitoring: false,
    networkDetection: false,
    autoAdjust: false,
    pauseOnBattery: false,
    schedule: []
  };

  private stats: BandwidthStats = {
    currentSpeed: 0,
    totalDownloaded: 0,
    activeDownloads: 0,
    networkType: 'ethernet',
    latency: 0,
    peakSpeed: 0,
    limitActive: false,
    currentLimit: 0,
    efficiency: 100,
    averageSpeed: 0
  };

  getConfig(): BandwidthConfig {
    return this.config;
  }

  getStats(): BandwidthStats {
    return this.stats;
  }

  getSpeedPresets(): SpeedPreset[] {
    return [
      { name: 'Unlimited', speed: 0, description: 'No speed limit' },
      { name: 'High', speed: 10 * 1024 * 1024, description: '10 MB/s' },
      { name: 'Medium', speed: 5 * 1024 * 1024, description: '5 MB/s' },
      { name: 'Low', speed: 1 * 1024 * 1024, description: '1 MB/s' }
    ];
  }

  getOptimizationSuggestions(): string[] {
    return [];
  }

  buildSpeedLimitArgs(): string[] {
    if (!this.config.enabled || this.config.maxSpeed <= 0) {
      return [];
    }
    // yt-dlp format for rate limit is '50K' or '4.2M'
    const speedInK = Math.round(this.config.maxSpeed / 1024);
    return ['--limit-rate', `${speedInK}K`];
  }

  updateConfig(config: Partial<BandwidthConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('BandwidthService: Config updated', this.config);
  }

  setSpeedLimit(speed: number): void {
    this.updateConfig({ maxSpeed: speed, enabled: speed > 0 });
  }

  setAdaptiveMode(enabled: boolean): void {
    this.updateConfig({ adaptiveMode: enabled });
  }

  formatSpeed(bytes: number): string {
    if (bytes === 0) return 'Unlimited';
    const units = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    let value = bytes;
    let unitIndex = 0;
    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex++;
    }
    return `${value.toFixed(2)} ${units[unitIndex]}`;
  }

  addSchedule(schedule: Omit<BandwidthSchedule, 'id'>): void {
    const newSchedule = { ...schedule, id: Date.now().toString() };
    this.config.schedule.push(newSchedule);
  }

  removeSchedule(id: string): void {
    this.config.schedule = this.config.schedule.filter(s => s.id !== id);
  }

  updateSchedule(id: string, update: Partial<BandwidthSchedule>): void {
    const index = this.config.schedule.findIndex(s => s.id === id);
    if (index !== -1) {
      this.config.schedule[index] = { ...this.config.schedule[index], ...update };
    }
  }

  async testConnectionSpeed(): Promise<{ downloadSpeed: number, quality: string }> {
    // Mock implementation
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({ downloadSpeed: 50 * 1024 * 1024, quality: 'Excellent' });
      }, 1000);
    });
  }

  importConfiguration(config: any): number {
    if (config.schedule && Array.isArray(config.schedule)) {
      this.config.schedule = [...this.config.schedule, ...config.schedule];
      return config.schedule.length;
    }
    return 0;
  }

  exportConfiguration(): any {
    return {
      schedule: this.config.schedule
    };
  }

  getUsageLogs(): any[] {
    return [];
  }

  resetConfiguration(): void {
    this.config = {
      enabled: false,
      maxSpeed: 0,
      adaptiveMode: false,
      monitoring: false,
      networkDetection: false,
      autoAdjust: false,
      pauseOnBattery: false,
      schedule: []
    };
  }

  trackDownloadProgress(jobId: string, bytesDownloaded: number, progress: number): void {
    // Mock implementation
  }

  trackDownloadStart(jobId: string, estimatedSize?: number): void {
    this.stats.activeDownloads++;
  }

  trackDownloadEnd(jobId: string, success: boolean = true): void {
    if (this.stats.activeDownloads > 0) {
      this.stats.activeDownloads--;
    }
  }
}

export const bandwidthService = new BandwidthService();
