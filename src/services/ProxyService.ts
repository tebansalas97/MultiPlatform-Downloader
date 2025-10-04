import { electronApi } from '../utils/electronApi';

interface ProxyConfig {
  enabled: boolean;
  type: 'http' | 'https' | 'socks4' | 'socks5';
  host: string;
  port: number;
  username?: string;
  password?: string;
  testUrl?: string;
  timeout?: number;
}

interface ProxyTest {
  success: boolean;
  latency: number;
  error?: string;
  location?: string;
  speed?: number;
}

interface ProxyStats {
  current: ProxyConfig | null;
  tested: number;
  working: number;
  avgLatency: number;
  totalTests: number;
  successRate: number;
}

export class ProxyService {
  private currentProxy: ProxyConfig | null = null;
  private proxyList: ProxyConfig[] = [];
  private testResults = new Map<string, ProxyTest>();
  private autoRetryEnabled = true;
  private testQueue: ProxyConfig[] = [];
  private isTestingQueue = false;
  private testHistory: Array<{ timestamp: number; success: boolean; latency: number }> = [];

  constructor() {
    this.loadProxySettings();
    this.loadBuiltinProxyList();
    this.startAutoTesting();
  }

  /**
   * Configurar proxy personalizado
   */
  setCustomProxy(config: ProxyConfig): boolean {
    const validation = this.validateProxyConfig(config);
    if (validation.length > 0) {
      console.error('Invalid proxy config:', validation);
      return false;
    }

    this.currentProxy = { ...config, timeout: config.timeout || 10000 };
    this.saveProxySettings();
    console.log(`Custom proxy configured: ${config.host}:${config.port}`);
    
    // Test proxy immediately
    this.testProxy(this.currentProxy).then(result => {
      console.log('Proxy test result:', result);
    });

    return true;
  }

  /**
   * Configurar proxy automático (mejor disponible)
   */
  async setAutoProxy(): Promise<boolean> {
    console.log('Finding best available proxy...');
    
    const bestProxy = await this.findBestProxy();
    if (bestProxy) {
      this.currentProxy = bestProxy;
      this.saveProxySettings();
      console.log(`Auto-configured proxy: ${bestProxy.host}:${bestProxy.port}`);
      return true;
    }

    console.log('No working proxy found');
    return false;
  }

  /**
   * Obtener configuración actual del proxy
   */
  getCurrentProxy(): ProxyConfig | null {
    return this.currentProxy;
  }

  /**
   * Deshabilitar proxy
   */
  disableProxy(): void {
    this.currentProxy = null;
    this.saveProxySettings();
    console.log('Proxy disabled');
  }

  /**
   * Probar conexión del proxy
   */
  async testProxy(config: ProxyConfig): Promise<ProxyTest> {
    const startTime = Date.now();
    const proxyKey = `${config.host}:${config.port}`;
    
    try {
      const testUrl = config.testUrl || 'https://www.youtube.com';
      const timeout = config.timeout || 10000;
      
      const result = await this.testProxyWithYtDlp(config, testUrl, timeout);
      const latency = Date.now() - startTime;
      
      const testResult: ProxyTest = {
        success: result.success,
        latency,
        error: result.error,
        location: this.detectProxyLocation(config),
        speed: result.speed
      };
      
      this.testResults.set(proxyKey, testResult);
      this.updateTestHistory(testResult);
      
      return testResult;
    } catch (error) {
      const testResult: ProxyTest = {
        success: false,
        latency: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      
      this.testResults.set(proxyKey, testResult);
      this.updateTestHistory(testResult);
      
      return testResult;
    }
  }

  /**
   * Probar proxy usando yt-dlp
   */
  private async testProxyWithYtDlp(
    config: ProxyConfig, 
    testUrl: string, 
    timeout: number
  ): Promise<{ success: boolean; error?: string; speed?: number }> {
    return new Promise((resolve) => {
      const args = ['--no-download', '--get-title', ...this.buildProxyArgs(config), testUrl];
      const process = electronApi.spawn('yt-dlp', args);
      
      let output = '';
      let errorOutput = '';
      const startTime = Date.now();
      
      process.stdout.on('data', (data: Buffer) => {
        output += data.toString();
      });
      
      process.stderr.on('data', (data: Buffer) => {
        errorOutput += data.toString();
      });
      
      process.on('close', (code: number) => {
        const endTime = Date.now();
        const speed = Math.round(1000 / (endTime - startTime)); // requests per second
        
        if (code === 0 && output.trim()) {
          resolve({ success: true, speed });
        } else {
          const error = this.parseProxyError(errorOutput) || 'Connection failed';
          resolve({ success: false, error });
        }
      });

      // ✅ CORREGIDO: El evento 'error' recibe un Error, no un number
      process.on('error', (error: Error) => {
        resolve({ success: false, error: error.message });
      });
      
      // Timeout
      setTimeout(() => {
        process.kill('SIGTERM');
        resolve({ success: false, error: 'Test timeout' });
      }, timeout);
    });
  }

  /**
   * Construir argumentos de proxy para yt-dlp
   */
  buildProxyArgs(config: ProxyConfig): string[] {
    if (!config.enabled) return [];

    const args: string[] = [];
    let proxyUrl = '';

    // Construir URL del proxy
    if (config.username && config.password) {
      proxyUrl = `${config.type}://${config.username}:${config.password}@${config.host}:${config.port}`;
    } else {
      proxyUrl = `${config.type}://${config.host}:${config.port}`;
    }

    args.push('--proxy', proxyUrl);
    
    // Añadir configuraciones adicionales
    if (config.timeout) {
      args.push('--socket-timeout', config.timeout.toString());
    }
    
    return args;
  }

  /**
   * Obtener lista de proxies públicos recomendados
   */
  private loadBuiltinProxyList(): void {
    // Lista básica de proxies públicos conocidos (solo para testing)
    this.proxyList = [
      { enabled: true, type: 'http', host: 'proxy1.example.com', port: 8080 },
      { enabled: true, type: 'http', host: 'proxy2.example.com', port: 3128 },
    ];
  }

  /**
   * Autodetectar mejor proxy disponible
   */
  async findBestProxy(testUrls: string[] = ['https://www.youtube.com']): Promise<ProxyConfig | null> {
    const workingProxies: { proxy: ProxyConfig; result: ProxyTest }[] = [];
    
    for (const proxy of this.proxyList) {
      if (!proxy.enabled) continue;
      
      try {
        const result = await this.testProxy(proxy);
        if (result.success) {
          workingProxies.push({ proxy, result });
        }
      } catch (error) {
        console.warn(`Failed to test proxy ${proxy.host}:${proxy.port}:`, error);
      }
    }
    
    if (workingProxies.length === 0) return null;
    
    // Ordenar por latencia (menor es mejor)
    workingProxies.sort((a, b) => a.result.latency - b.result.latency);
    
    return workingProxies[0].proxy;
  }

  /**
   * Detectar ubicación del proxy
   */
  private detectProxyLocation(config: ProxyConfig): string | undefined {
    // Lógica básica para detectar ubicación basada en el host
    const hostname = config.host.toLowerCase();
    
    if (hostname.includes('us') || hostname.includes('america')) return 'US';
    if (hostname.includes('eu') || hostname.includes('europe')) return 'EU';
    if (hostname.includes('asia') || hostname.includes('jp')) return 'Asia';
    
    return 'Unknown';
  }

  /**
   * Iniciar pruebas automáticas en background
   */
  private startAutoTesting(): void {
    if (!this.autoRetryEnabled) return;
    
    setInterval(() => {
      if (this.currentProxy && !this.isTestingQueue) {
        this.testProxy(this.currentProxy).catch(console.error);
      }
    }, 5 * 60 * 1000); // Test every 5 minutes
  }

  /**
   * Probar toda la lista de proxies
   */
  private async testProxyList(): Promise<void> {
    if (this.isTestingQueue) return;
    
    this.isTestingQueue = true;
    
    for (const proxy of this.proxyList) {
      if (proxy.enabled) {
        await this.testProxy(proxy);
      }
    }
    
    this.isTestingQueue = false;
  }

  /**
   * Actualizar historial de pruebas
   */
  private updateTestHistory(result: ProxyTest): void {
    this.testHistory.push({
      timestamp: Date.now(),
      success: result.success,
      latency: result.latency
    });
    
    // Mantener solo las últimas 100 pruebas
    if (this.testHistory.length > 100) {
      this.testHistory = this.testHistory.slice(-100);
    }
  }

  /**
   * Parsear errores específicos de proxy
   */
  private parseProxyError(errorOutput: string): string | undefined {
    if (errorOutput.includes('Connection refused')) return 'Connection refused';
    if (errorOutput.includes('timeout')) return 'Connection timeout';
    if (errorOutput.includes('authentication')) return 'Authentication failed';
    if (errorOutput.includes('forbidden')) return 'Access forbidden';
    
    return undefined;
  }

  /**
   * Cargar configuración de proxy desde almacenamiento
   */
  private loadProxySettings(): void {
    try {
      const saved = localStorage.getItem('proxy-service-config');
      if (saved) {
        const data = JSON.parse(saved);
        this.currentProxy = data.currentProxy;
        this.proxyList = data.proxyList || this.proxyList;
      }
    } catch (error) {
      console.warn('Could not load proxy settings:', error);
    }
  }

  /**
   * Guardar configuración de proxy
   */
  private saveProxySettings(): void {
    try {
      const data = {
        currentProxy: this.currentProxy,
        proxyList: this.proxyList.filter(p => !this.isBuiltinProxy(p))
      };
      localStorage.setItem('proxy-service-config', JSON.stringify(data));
    } catch (error) {
      console.warn('Could not save proxy settings:', error);
    }
  }

  /**
   * Verificar si es proxy built-in
   */
  private isBuiltinProxy(proxy: ProxyConfig): boolean {
    return proxy.host.includes('example.com');
  }

  /**
   * Agregar proxy personalizado a la lista
   */
  addCustomProxy(config: ProxyConfig): boolean {
    const validation = this.validateProxyConfig(config);
    if (validation.length > 0) return false;
    
    this.proxyList.push(config);
    this.saveProxySettings();
    return true;
  }

  /**
   * Obtener estadísticas de proxy
   */
  getProxyStats(): ProxyStats {
    const workingProxies = Array.from(this.testResults.values()).filter(r => r.success);
    const totalTests = this.testHistory.length;
    const successfulTests = this.testHistory.filter(t => t.success).length;
    
    return {
      current: this.currentProxy,
      tested: this.testResults.size,
      working: workingProxies.length,
      avgLatency: workingProxies.reduce((sum, r) => sum + r.latency, 0) / workingProxies.length || 0,
      totalTests,
      successRate: totalTests > 0 ? (successfulTests / totalTests) * 100 : 0
    };
  }

  /**
   * Validar configuración de proxy
   */
  validateProxyConfig(config: Partial<ProxyConfig>): string[] {
    const errors: string[] = [];
    
    if (!config.host || config.host.trim() === '') {
      errors.push('Host is required');
    }
    
    if (!config.port || config.port <= 0 || config.port > 65535) {
      errors.push('Valid port is required (1-65535)');
    }
    
    if (!config.type || !['http', 'https', 'socks4', 'socks5'].includes(config.type)) {
      errors.push('Valid proxy type is required');
    }
    
    return errors;
  }

  /**
   * Importar lista de proxies desde texto
   */
  async importProxyList(content: string): Promise<number> {
    const lines = content.split('\n').map(line => line.trim()).filter(Boolean);
    let imported = 0;
    
    for (const line of lines) {
      if (line.startsWith('#')) continue; // Skip comments
      
      const proxy = this.parseProxyString(line);
      if (proxy && this.addCustomProxy(proxy)) {
        imported++;
      }
    }
    
    return imported;
  }

  /**
   * Parsear string de proxy
   */
  private parseProxyString(proxyString: string): ProxyConfig | null {
    try {
      // Format: protocol://[username:password@]host:port
      const url = new URL(proxyString);
      
      return {
        enabled: true,
        type: url.protocol.slice(0, -1) as 'http' | 'https' | 'socks4' | 'socks5',
        host: url.hostname,
        port: parseInt(url.port) || this.getDefaultPort(url.protocol),
        username: url.username || undefined,
        password: url.password || undefined
      };
    } catch {
      // Try simple format: host:port
      const match = proxyString.match(/^([^:]+):(\d+)$/);
      if (match) {
        return {
          enabled: true,
          type: 'http',
          host: match[1],
          port: parseInt(match[2])
        };
      }
      return null;
    }
  }

  /**
   * Obtener puerto por defecto según protocolo
   */
  private getDefaultPort(protocol: string): number {
    switch (protocol) {
      case 'http:': return 80;
      case 'https:': return 443;
      case 'socks4:': return 1080;
      case 'socks5:': return 1080;
      default: return 8080;
    }
  }

  /**
   * Exportar configuración actual
   */
  exportProxyConfig(): string {
    const config = {
      current: this.currentProxy,
      list: this.proxyList,
      stats: this.getProxyStats()
    };
    
    return JSON.stringify(config, null, 2);
  }

  /**
   * Limpiar configuración y estadísticas
   */
  cleanup(): void {
    this.testResults.clear();
    this.testHistory = [];
    this.isTestingQueue = false;
  }

  /**
   * Verificar conectividad sin proxy
   */
  async testDirectConnection(): Promise<boolean> {
    return new Promise((resolve) => {
      const process = electronApi.spawn('yt-dlp', [
        '--no-download', 
        '--get-title', 
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
      ]);
      
      process.on('close', (code: number) => {
        resolve(code === 0);
      });
      
      process.on('error', () => {
        resolve(false);
      });
      
      setTimeout(() => {
        process.kill('SIGTERM');
        resolve(false);
      }, 10000);
    });
  }

  /**
   * Obtener mejores proxies por latencia
   */
  getBestProxies(limit: number = 5): ProxyConfig[] {
    const results = Array.from(this.testResults.entries())
      .filter(([, result]) => result.success)
      .sort(([, a], [, b]) => a.latency - b.latency)
      .slice(0, limit);
    
    return results.map(([key]) => {
      const [host, port] = key.split(':');
      return this.proxyList.find(p => p.host === host && p.port === parseInt(port))!;
    }).filter(Boolean);
  }
}

// Instancia singleton
export const proxyService = new ProxyService();