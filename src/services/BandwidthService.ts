interface BandwidthConfig {
  enabled: boolean;
  maxSpeed: number; // KB/s
  adaptiveMode: boolean;
  schedule: BandwidthSchedule[];
  monitoring: boolean;
  autoAdjust: boolean;
  networkDetection: boolean;
  pauseOnBattery: boolean; // NUEVO
}

interface BandwidthSchedule {
  id: string;
  name: string;
  startTime: string; // "HH:MM"
  endTime: string;   // "HH:MM"
  maxSpeed: number;  // KB/s
  days: number[];    // 0-6 (Sunday to Saturday)
  enabled: boolean;
  priority: number;  // 1-10 (higher = more priority)
}

interface BandwidthStats {
  currentSpeed: number;
  averageSpeed: number;
  peakSpeed: number; // NUEVO
  totalDownloaded: number;
  limitActive: boolean;
  currentLimit: number;
  efficiency: number;
  networkType: 'wifi' | 'ethernet' | 'mobile' | 'unknown';
  lastMeasurement: number;
}

interface SpeedMeasurement {
  timestamp: number;
  speed: number;
  jobId: string;
  bytes: number;
}

interface UsageRecord {
  timestamp: number;
  speed: number;
  jobId: string;
  bytes: number;
  limit: number;
  efficiency: number;
}

export class BandwidthService {
  private config: BandwidthConfig = {
    enabled: false,
    maxSpeed: 0, // 0 = unlimited
    adaptiveMode: false,
    schedule: [],
    monitoring: true,
    autoAdjust: true,
    networkDetection: true,
    pauseOnBattery: false
  };

  private stats: BandwidthStats = {
    currentSpeed: 0,
    averageSpeed: 0,
    peakSpeed: 0,
    totalDownloaded: 0,
    limitActive: false,
    currentLimit: 0,
    efficiency: 100,
    networkType: 'unknown',
    lastMeasurement: Date.now()
  };

  private speedHistory: SpeedMeasurement[] = [];
  private downloadStartTimes = new Map<string, number>();
  private downloadSizes = new Map<string, number>();
  private downloadProgress = new Map<string, number>();
  private updateInterval: NodeJS.Timeout | null = null;
  private scheduleInterval: NodeJS.Timeout | null = null;
  private networkInterval: NodeJS.Timeout | null = null;
  private usageHistory: UsageRecord[] = [];
  private isTestingNetwork = false; // NUEVO: Estado de prueba de red

  constructor() {
    this.loadBandwidthSettings();
    this.startMonitoring();
    this.startScheduleChecker();
    this.startNetworkDetection();
    this.setupDefaultSchedules();
  }

  /**
   * Probar velocidad de conexión
   */
  async testConnectionSpeed(): Promise<{
    downloadSpeed: number;
    uploadSpeed: number;
    latency: number;
    quality: string;
  }> {
    const startTime = Date.now();
    
    try {
      // Test de descarga usando un archivo de prueba
      const testUrl = 'https://www.gstatic.com/hostedimg/382a91be6b6b8d5e_large';
      const response = await fetch(testUrl + '?' + Date.now(), {
        cache: 'no-cache',
        mode: 'cors'
      });
      
      if (!response.ok) {
        throw new Error('Network test failed');
      }
      
      const data = await response.blob();
      const endTime = Date.now();
      
      const duration = (endTime - startTime) / 1000; // segundos
      const sizeBytes = data.size;
      const speedBps = sizeBytes / duration; // bytes por segundo
      const speedKbps = (speedBps * 8) / 1024; // Kbps
      
      let quality = 'Poor';
      if (speedKbps > 10000) quality = 'Excellent';
      else if (speedKbps > 5000) quality = 'Very Good';
      else if (speedKbps > 2000) quality = 'Good';
      else if (speedKbps > 1000) quality = 'Fair';
      
      return {
        downloadSpeed: speedKbps,
        uploadSpeed: speedKbps * 0.1, // Estimación (upload suele ser menor)
        latency: endTime - startTime,
        quality
      };
      
    } catch (error) {
      console.error('Speed test failed:', error);
      throw new Error('Failed to test connection speed');
    }
  }

  /**
   * Configurar límite de velocidad principal
   */
  setSpeedLimit(speedKbps: number): void {
    this.config.maxSpeed = Math.max(0, speedKbps);
    this.config.enabled = speedKbps > 0;
    
    this.saveBandwidthSettings();
    this.updateCurrentLimit();
    
    console.log(`Speed limit set to: ${this.formatSpeed(speedKbps)}`);
  }

  /**
   * Habilitar/deshabilitar modo adaptativo
   */
  setAdaptiveMode(enabled: boolean): void {
    this.config.adaptiveMode = enabled;
    this.saveBandwidthSettings();
    this.updateCurrentLimit();
    
    console.log(`Adaptive mode ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Agregar horario de límite de velocidad
   */
  addSchedule(schedule: Omit<BandwidthSchedule, 'id'>): string {
    const id = Math.random().toString(36).substr(2, 9);
    const newSchedule: BandwidthSchedule = { 
      ...schedule, 
      id,
      priority: schedule.priority || 5
    };
    
    this.config.schedule.push(newSchedule);
    this.config.schedule.sort((a, b) => b.priority - a.priority); // Ordenar por prioridad
    this.saveBandwidthSettings();
    
    console.log(`Bandwidth schedule added: ${schedule.name}`);
    this.updateCurrentLimit(); // Aplicar inmediatamente si corresponde
    return id;
  }

  /**
   * Actualizar horario existente
   */
  updateSchedule(id: string, updates: Partial<BandwidthSchedule>): boolean {
    const scheduleIndex = this.config.schedule.findIndex(s => s.id === id);
    if (scheduleIndex === -1) return false;
    
    this.config.schedule[scheduleIndex] = {
      ...this.config.schedule[scheduleIndex],
      ...updates
    };
    
    this.config.schedule.sort((a, b) => b.priority - a.priority);
    this.saveBandwidthSettings();
    this.updateCurrentLimit();
    return true;
  }

  /**
   * Eliminar horario
   */
  removeSchedule(id: string): void {
    this.config.schedule = this.config.schedule.filter(s => s.id !== id);
    this.saveBandwidthSettings();
    this.updateCurrentLimit();
  }

  /**
   * Construir argumentos de velocidad para yt-dlp
   */
  buildSpeedLimitArgs(): string[] {
    const currentLimit = this.getCurrentSpeedLimit();
    
    if (currentLimit <= 0) return [];
    
    // yt-dlp acepta diferentes unidades: K, M, G
    let limitStr: string;
    if (currentLimit >= 1024) {
      limitStr = `${Math.round(currentLimit / 1024)}M`;
    } else {
      limitStr = `${currentLimit}K`;
    }
    
    return ['--limit-rate', limitStr];
  }

  /**
   * Obtener límite de velocidad actual con lógica completa
   */
  getCurrentSpeedLimit(): number {
    if (!this.config.enabled) return 0;

    let effectiveLimit = this.config.maxSpeed;
    
    // 1. Verificar horarios programados (prioridad más alta)
    const scheduleLimit = this.getActiveScheduleLimit();
    if (scheduleLimit > 0) {
      effectiveLimit = Math.min(effectiveLimit || Infinity, scheduleLimit);
    }
    
    // 2. Aplicar modo adaptativo
    if (this.config.adaptiveMode) {
      const adaptiveLimit = this.calculateAdaptiveLimit();
      if (adaptiveLimit > 0) {
        effectiveLimit = Math.min(effectiveLimit || Infinity, adaptiveLimit);
      }
    }
    
    // 3. Ajuste automático por red
    if (this.config.autoAdjust) {
      const networkAdjustment = this.getNetworkAdjustment();
      effectiveLimit = Math.round((effectiveLimit || 0) * networkAdjustment);
    }

    return Math.max(0, effectiveLimit || 0);
  }

  /**
   * Obtener límite según horario activo con prioridades
   */
  private getActiveScheduleLimit(): number {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const currentDay = now.getDay();

    // Buscar el horario de mayor prioridad que esté activo
    for (const schedule of this.config.schedule) {
      if (!schedule.enabled || !schedule.days.includes(currentDay)) {
        continue;
      }

      if (this.isTimeInRange(currentTime, schedule.startTime, schedule.endTime)) {
        console.log(`Active schedule: ${schedule.name} (${schedule.maxSpeed} KB/s, priority: ${schedule.priority})`);
        return schedule.maxSpeed;
      }
    }

    return 0;
  }

  /**
   * Verificar si la hora actual está en el rango
   */
  private isTimeInRange(current: string, start: string, end: string): boolean {
    const currentMinutes = this.timeToMinutes(current);
    const startMinutes = this.timeToMinutes(start);
    const endMinutes = this.timeToMinutes(end);

    if (startMinutes <= endMinutes) {
      // Mismo día: 09:00 - 17:00
      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    } else {
      // Cruza medianoche: 22:00 - 06:00
      return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
    }
  }

  /**
   * Convertir tiempo "HH:MM" a minutos
   */
  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Calcular límite adaptativo basado en uso de red y rendimiento
   */
  private calculateAdaptiveLimit(): number {
    const baseLimit = this.config.maxSpeed;
    if (baseLimit <= 0) return 0;

    let factor = 1.0;
    const hour = new Date().getHours();
    
    // Factor por hora del día
    if ((hour >= 8 && hour <= 10) || (hour >= 18 && hour <= 22)) {
      // Horas pico - reducir velocidad
      factor *= 0.7;
    } else if (hour >= 23 || hour <= 6) {
      // Horas valle - permitir velocidad completa
      factor *= 1.2;
    } else {
      // Horas normales
      factor *= 0.9;
    }
    
    // Factor por tipo de red
    switch (this.stats.networkType) {
      case 'mobile':
        factor *= 0.5; // Conservar datos móviles
        break;
      case 'wifi':
        factor *= 0.8; // Considerar otros dispositivos
        break;
      case 'ethernet':
        factor *= 1.0; // Velocidad completa
        break;
    }
    
    // Factor por eficiencia histórica
    if (this.stats.efficiency < 80) {
      factor *= 0.8; // Reducir si hay problemas de rendimiento
    } else if (this.stats.efficiency > 95) {
      factor *= 1.1; // Aumentar si funciona bien
    }
    
    // Factor por velocidad promedio reciente
    const recentSpeeds = this.speedHistory
      .filter(m => Date.now() - m.timestamp < 300000) // Últimos 5 minutos
      .map(m => m.speed);
    
    if (recentSpeeds.length > 0) {
      const avgSpeed = recentSpeeds.reduce((sum, speed) => sum + speed, 0) / recentSpeeds.length;
      const targetSpeed = baseLimit * 0.9; // 90% del límite como objetivo
      
      if (avgSpeed < targetSpeed * 0.7) {
        factor *= 1.2; // Aumentar límite si estamos muy por debajo
      } else if (avgSpeed > targetSpeed * 1.1) {
        factor *= 0.9; // Reducir si estamos consistentemente por encima
      }
    }

    const adaptiveLimit = Math.round(baseLimit * Math.max(0.3, Math.min(1.5, factor)));
    
    console.log(`Adaptive limit calculation: base=${baseLimit}, factor=${factor.toFixed(2)}, result=${adaptiveLimit}`);
    return adaptiveLimit;
  }

  /**
   * Obtener ajuste por tipo de red
   */
  private getNetworkAdjustment(): number {
    if (!this.config.networkDetection) return 1.0;
    
    const now = Date.now();
    if (now - this.stats.lastMeasurement > 300000) { // 5 minutos
      this.performNetworkTest();
    }
    
    switch (this.stats.networkType) {
      case 'mobile': return 0.6;
      case 'wifi': return 0.8;
      case 'ethernet': return 1.0;
      default: return 0.8;
    }
  }

  /**
   * Registrar inicio de descarga
   */
  trackDownloadStart(jobId: string, estimatedSize?: number): void {
    this.downloadStartTimes.set(jobId, Date.now());
    this.downloadSizes.set(jobId, estimatedSize || 0);
    this.downloadProgress.set(jobId, 0);
    
    console.log(`Tracking download start: ${jobId}, estimated size: ${estimatedSize || 'unknown'}`);
  }

  /**
   * Registrar progreso de descarga con medición de velocidad
   */
  trackDownloadProgress(jobId: string, bytesDownloaded: number, totalProgress: number): void {
    const now = Date.now();
    const previousSize = this.downloadSizes.get(jobId) || 0;
    const bytesThisUpdate = bytesDownloaded - previousSize;
    
    if (bytesThisUpdate > 0) {
      const speed = bytesThisUpdate / 1024; // KB/s aproximado
      
      // Actualizar mediciones
      this.speedHistory.push({
        timestamp: now,
        speed,
        jobId,
        bytes: bytesThisUpdate
      });
      
      // Agregar a historial de uso
      this.usageHistory.push({
        timestamp: now,
        speed,
        jobId,
        bytes: bytesThisUpdate,
        limit: this.getCurrentSpeedLimit(),
        efficiency: this.stats.efficiency
      });
      
      // Mantener solo las últimas 1000 entradas
      if (this.usageHistory.length > 1000) {
        this.usageHistory = this.usageHistory.slice(-1000);
      }
      
      this.downloadSizes.set(jobId, bytesDownloaded);
      this.downloadProgress.set(jobId, totalProgress);
    }
  }

  /**
   * Registrar fin de descarga
   */
  trackDownloadEnd(jobId: string, success: boolean = true): void {
    const startTime = this.downloadStartTimes.get(jobId);
    const totalBytes = this.downloadSizes.get(jobId) || 0;
    
    if (startTime) {
      const totalTime = (Date.now() - startTime) / 1000;
      const finalSpeed = totalBytes > 0 ? (totalBytes / 1024) / totalTime : 0;
      
      console.log(`Download ${success ? 'completed' : 'failed'}: ${jobId}, final speed: ${finalSpeed.toFixed(2)} KB/s`);
      
      if (success && totalBytes > 0) {
        this.stats.totalDownloaded += totalBytes;
        
        // Actualizar eficiencia
        this.calculateEfficiency();
      }
    }
    
    // Limpiar datos del job
    this.downloadStartTimes.delete(jobId);
    this.downloadSizes.delete(jobId);
    this.downloadProgress.delete(jobId);
  }

  /**
   * Actualizar estadísticas en tiempo real
   */
  private updateStats(): void {
    const recentMeasurements = this.speedHistory.filter(
      m => Date.now() - m.timestamp < 30000 // Últimos 30 segundos
    );
    
    if (recentMeasurements.length > 0) {
      // Calcular velocidad actual (promedio de mediciones recientes)
      this.stats.currentSpeed = recentMeasurements.reduce(
        (sum, m) => sum + m.speed, 0
      ) / recentMeasurements.length;
      
      // Calcular velocidad promedio total
      const allSpeeds = this.speedHistory.map(m => m.speed);
      this.stats.averageSpeed = allSpeeds.reduce(
        (sum, speed) => sum + speed, 0
      ) / allSpeeds.length;
    }
    
    this.stats.lastMeasurement = Date.now();
    this.updateCurrentLimit();
  }

  /**
   * Actualizar límite actual y notificar cambios
   */
  private updateCurrentLimit(): void {
    const newLimit = this.getCurrentSpeedLimit();
    const wasActive = this.stats.limitActive;
    const oldLimit = this.stats.currentLimit;
    
    this.stats.limitActive = newLimit > 0;
    this.stats.currentLimit = newLimit;
    
    // Notificar cambios significativos
    if (wasActive !== this.stats.limitActive || Math.abs(oldLimit - newLimit) > oldLimit * 0.1) {
      this.notifyLimitChange();
    }
  }

  /**
   * Calcular eficiencia de descarga
   */
  private calculateEfficiency(): void {
    const recentMeasurements = this.speedHistory.filter(
      m => Date.now() - m.timestamp < 600000 // Últimos 10 minutos
    );
    
    if (recentMeasurements.length === 0) {
      this.stats.efficiency = 100;
      return;
    }
    
    const expectedSpeed = this.stats.currentLimit || this.config.maxSpeed;
    if (expectedSpeed <= 0) {
      this.stats.efficiency = 100;
      return;
    }
    
    const avgActualSpeed = recentMeasurements.reduce(
      (sum, m) => sum + m.speed, 0
    ) / recentMeasurements.length;
    
    this.stats.efficiency = Math.min(100, Math.max(0, (avgActualSpeed / expectedSpeed) * 100));
  }

  /**
   * Iniciar monitoreo automático
   */
  private startMonitoring(): void {
    if (this.updateInterval) clearInterval(this.updateInterval);
    
    this.updateInterval = setInterval(() => {
      if (this.config.monitoring) {
        this.updateStats();
        this.cleanupOldMeasurements();
      }
    }, 5000); // Cada 5 segundos
    
    console.log('Bandwidth monitoring started');
  }

  /**
   * Parar monitoreo
   */
  stopMonitoring(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    
    if (this.scheduleInterval) {
      clearInterval(this.scheduleInterval);
      this.scheduleInterval = null;
    }
    
    if (this.networkInterval) {
      clearInterval(this.networkInterval);
      this.networkInterval = null;
    }
    
    console.log('Bandwidth monitoring stopped');
  }

  /**
   * Limpiar mediciones antiguas
   */
  private cleanupOldMeasurements(): void {
    const cutoff = Date.now() - 3600000; // 1 hora
    this.speedHistory = this.speedHistory.filter(m => m.timestamp > cutoff);
  }

  /**
   * Iniciar verificador de horarios
   */
  private startScheduleChecker(): void {
    if (this.scheduleInterval) clearInterval(this.scheduleInterval);
    
    this.scheduleInterval = setInterval(() => {
      this.updateCurrentLimit();
    }, 60000); // Cada minuto
  }

  /**
   * Iniciar detección de red
   */
  private startNetworkDetection(): void {
    if (!this.config.networkDetection) return;
    
    this.performNetworkTest();
    
    if (this.networkInterval) clearInterval(this.networkInterval);
    
    this.networkInterval = setInterval(() => {
      this.performNetworkTest();
    }, 300000); // Cada 5 minutos
  }

  /**
   * Realizar test de red para detectar tipo de conexión
   */
  private async performNetworkTest(): Promise<void> {
    if (this.isTestingNetwork) {
      console.log('Network test already in progress, skipping...');
      return;
    }
    
    this.isTestingNetwork = true;
    
    try {
      const startTime = Date.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      if (typeof window !== 'undefined' && 'connection' in navigator) {
        const connection = (navigator as any).connection;
        if (connection) {
          const effectiveType = connection.effectiveType;
          
          switch (effectiveType) {
            case '4g':
              this.stats.networkType = 'wifi';
              break;
            case '3g':
              this.stats.networkType = 'mobile';
              break;
            case '2g':
              this.stats.networkType = 'mobile';
              break;
            default:
              this.stats.networkType = 'ethernet';
          }
          
          console.log(`Network detected via Navigator: ${this.stats.networkType}`);
          return;
        }
      }

      try {
        const response = await fetch('https://www.google.com/generate_204', { 
          method: 'HEAD',
          signal: controller.signal,
          mode: 'no-cors'
        });
        
        clearTimeout(timeoutId);
        const endTime = Date.now();
        const latency = endTime - startTime;
        
        if (latency < 50) {
          this.stats.networkType = 'ethernet';
        } else if (latency < 150) {
          this.stats.networkType = 'wifi';
        } else {
          this.stats.networkType = 'mobile';
        }
        
        console.log(`Network detected: ${this.stats.networkType} (${latency}ms)`);
      } catch (fetchError) {
        console.warn('Network test failed, assuming wifi');
        this.stats.networkType = 'wifi';
      }
      
    } catch (error) {
      console.error('Network test failed:', error);
      this.stats.networkType = 'unknown';
    } finally {
      this.isTestingNetwork = false;
    }
  }

  /**
   * Configurar horarios por defecto
   */
  private setupDefaultSchedules(): void {
    if (this.config.schedule.length === 0) {
      // Horario de trabajo (velocidad reducida)
      this.addSchedule({
        name: 'Work Hours',
        startTime: '09:00',
        endTime: '17:00',
        maxSpeed: Math.round((this.config.maxSpeed || 1000) * 0.6),
        days: [1, 2, 3, 4, 5], // Lunes a Viernes
        enabled: false,
        priority: 7
      });
      
      // Horas pico de internet (velocidad muy reducida)
      this.addSchedule({
        name: 'Peak Hours',
        startTime: '19:00',
        endTime: '23:00',
        maxSpeed: Math.round((this.config.maxSpeed || 1000) * 0.4),
        days: [0, 1, 2, 3, 4, 5, 6], // Todos los días
        enabled: false,
        priority: 8
      });
      
      // Madrugada (velocidad completa)
      this.addSchedule({
        name: 'Night Hours',
        startTime: '02:00',
        endTime: '07:00',
        maxSpeed: this.config.maxSpeed || 2000,
        days: [0, 1, 2, 3, 4, 5, 6],
        enabled: false,
        priority: 5
      });
    }
  }

  /**
   * Notificar cambios de límite
   */
  private notifyLimitChange(): void {
    const event = new CustomEvent('bandwidth-limit-changed', {
      detail: {
        active: this.stats.limitActive,
        limit: this.stats.currentLimit,
        reason: this.getActiveLimitReason()
      }
    });
    
    if (typeof window !== 'undefined') {
      window.dispatchEvent(event);
    }
  }

  /**
   * Obtener razón del límite activo
   */
  private getActiveLimitReason(): string {
    if (!this.stats.limitActive) return 'No limit active';
    
    const scheduleLimit = this.getActiveScheduleLimit();
    if (scheduleLimit > 0) {
      const activeSchedule = this.config.schedule.find(s => 
        s.enabled && s.maxSpeed === scheduleLimit
      );
      return `Schedule: ${activeSchedule?.name || 'Unknown'}`;
    }
    
    if (this.config.adaptiveMode) {
      return 'Adaptive mode';
    }
    
    return 'Manual limit';
  }

  /**
   * Obtener estadísticas actuales
   */
  getStats(): BandwidthStats {
    return { ...this.stats };
  }

  /**
   * Obtener configuración actual
   */
  getConfig(): BandwidthConfig {
    return { ...this.config };
  }

  /**
   * Obtener presets comunes de velocidad
   */
  getSpeedPresets(): Array<{ name: string; speed: number; description: string }> {
    return [
      { name: 'Unlimited', speed: 0, description: 'No speed restrictions' },
      { name: 'Very Fast', speed: 5000, description: '5 MB/s - High speed' },
      { name: 'Fast', speed: 2000, description: '2 MB/s - Good for multiple downloads' },
      { name: 'Medium', speed: 1000, description: '1 MB/s - Balanced usage' },
      { name: 'Slow', speed: 500, description: '500 KB/s - Light usage' },
      { name: 'Very Slow', speed: 200, description: '200 KB/s - Background only' },
      { name: 'Dial-up', speed: 56, description: '56 KB/s - Minimal bandwidth' },
      { name: 'Custom', speed: -1, description: 'Set your own limit' }
    ];
  }

  /**
   * Aplicar preset de velocidad
   */
  applySpeedPreset(presetName: string): boolean {
    const preset = this.getSpeedPresets().find(p => p.name === presetName);
    if (!preset) return false;
    
    this.setSpeedLimit(preset.speed);
    return true;
  }

  /**
   * Cargar configuración desde almacenamiento
   */
  private loadBandwidthSettings(): void {
    try {
      const saved = localStorage.getItem('bandwidth-settings');
      if (saved) {
        const savedConfig = JSON.parse(saved);
        this.config = { ...this.config, ...savedConfig };
        
        // Validar horarios
        this.config.schedule = this.config.schedule.filter(s => 
          s.id && s.name && s.startTime && s.endTime && Array.isArray(s.days)
        );
        
        console.log('Bandwidth settings loaded:', this.config);
      }
    } catch (error) {
      console.warn('Failed to load bandwidth settings:', error);
    }
  }

  /**
   * Guardar configuración
   */
  private saveBandwidthSettings(): void {
    try {
      localStorage.setItem('bandwidth-settings', JSON.stringify(this.config));
    } catch (error) {
      console.warn('Failed to save bandwidth settings:', error);
    }
  }

  /**
   * Formatear velocidad para mostrar
   */
  formatSpeed(speedKbps: number): string {
    if (speedKbps === 0) return 'Unlimited';
    if (speedKbps >= 1024) {
      return `${(speedKbps / 1024).toFixed(1)} MB/s`;
    }
    return `${speedKbps} KB/s`;
  }

  /**
   * Estimar tiempo restante basado en velocidad actual
   */
  estimateTimeRemaining(remainingBytes: number): string {
    if (this.stats.currentSpeed <= 0) return 'Unknown';
    
    const remainingKB = remainingBytes / 1024;
    const secondsRemaining = remainingKB / this.stats.currentSpeed;
    
    if (secondsRemaining < 60) {
      return `${Math.round(secondsRemaining)}s`;
    } else if (secondsRemaining < 3600) {
      return `${Math.round(secondsRemaining / 60)}m`;
    } else {
      const hours = Math.floor(secondsRemaining / 3600);
      const minutes = Math.round((secondsRemaining % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  }

  /**
   * Obtener recomendaciones de optimización
   */
  getOptimizationSuggestions(): string[] {
    const suggestions: string[] = [];
    
    if (this.stats.efficiency < 70) {
      suggestions.push('Consider reducing speed limit - current efficiency is low');
    }
    
    if (this.stats.networkType === 'mobile' && this.config.maxSpeed > 500) {
      suggestions.push('Reduce speed limit for mobile connections to save data');
    }
    
    if (!this.config.adaptiveMode) {
      suggestions.push('Enable adaptive mode for automatic optimization');
    }
    
    if (this.config.schedule.length === 0) {
      suggestions.push('Set up scheduled limits for different times of day');
    }
    
    const activeDownloads = this.downloadStartTimes.size;
    if (activeDownloads > 3 && this.stats.currentSpeed > 0) {
      const speedPerDownload = this.stats.currentSpeed / activeDownloads;
      if (speedPerDownload < 100) { // Menos de 100 KB/s por descarga
        suggestions.push('Consider reducing concurrent downloads for better speeds');
      }
    }
    
    return suggestions;
  }

  /**
   * Exportar configuración y estadísticas
   */
  exportConfiguration(): string {
    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      config: this.config,
      stats: this.stats,
      recentUsage: this.usageHistory.slice(-100), // Últimos 100 registros
      presets: this.getSpeedPresets()
    };
    
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Importar configuración desde JSON
   */
  importConfiguration(configData: any): number {
    let importedCount = 0;
    
    try {
      if (configData.schedule && Array.isArray(configData.schedule)) {
        for (const schedule of configData.schedule) {
          if (this.validateSchedule(schedule)) {
            this.addSchedule(schedule);
            importedCount++;
          }
        }
      }
      
      if (configData.config) {
        this.config = { ...this.config, ...configData.config };
      }
      
      this.saveBandwidthSettings();
      return importedCount;
      
    } catch (error) {
      console.error('Failed to import configuration:', error);
      throw new Error('Invalid configuration format');
    }
  }

  /**
   * Validar estructura de schedule
   */
  private validateSchedule(schedule: any): boolean {
    return (
      typeof schedule.name === 'string' &&
      typeof schedule.startTime === 'string' &&
      typeof schedule.endTime === 'string' &&
      typeof schedule.maxSpeed === 'number' &&
      Array.isArray(schedule.days) &&
      schedule.days.every((day: any) => typeof day === 'number' && day >= 0 && day <= 6) &&
      typeof schedule.enabled === 'boolean' &&
      typeof schedule.priority === 'number'
    );
  }

  /**
   * Reset a configuración por defecto
   */
  resetConfiguration(): void {
    this.config = {
      enabled: false,
      maxSpeed: 0,
      adaptiveMode: false,
      schedule: [],
      monitoring: true,
      autoAdjust: true,
      networkDetection: true,
      pauseOnBattery: false
    };
    
    this.stats = {
      currentSpeed: 0,
      averageSpeed: 0,
      peakSpeed: 0,
      totalDownloaded: 0,
      limitActive: false,
      currentLimit: 0,
      efficiency: 100,
      networkType: 'unknown',
      lastMeasurement: Date.now()
    };
    
    this.speedHistory = [];
    this.usageHistory = [];
    
    this.saveBandwidthSettings();
    console.log('Bandwidth configuration reset to defaults');
  }

  /**
   * Limpiar datos y recursos
   */
  cleanup(): void {
    this.stopMonitoring();
    this.downloadStartTimes.clear();
    this.downloadSizes.clear();
    this.downloadProgress.clear();
    this.speedHistory = [];
    this.usageHistory = [];
    
    console.log('Bandwidth service cleaned up');
  }

  /**
   * Actualizar configuración completa
   */
  updateConfig(newConfig: Partial<BandwidthConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.saveBandwidthSettings();
    
    // Reiniciar servicios si es necesario
    if (newConfig.monitoring !== undefined) {
      if (newConfig.monitoring) {
        this.startMonitoring();
      } else {
        this.stopMonitoring();
      }
    }
    
    if (newConfig.networkDetection !== undefined) {
      if (newConfig.networkDetection) {
        this.startNetworkDetection();
      }
    }
  }

  /**
   * Obtener logs de uso
   */
  getUsageLogs(): Array<{
    timestamp: number;
    speed: number;
    limit: number;
    efficiency: number;
  }> {
    return this.usageHistory.slice(-1000).map(record => ({
      timestamp: record.timestamp,
      speed: record.speed,
      limit: record.limit,
      efficiency: record.efficiency
    }));
  }
}

// Instancia singleton
export const bandwidthService = new BandwidthService();