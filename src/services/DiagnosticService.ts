type LogLevel = 'info' | 'warn' | 'error';

class DiagnosticService {
  log(platform: string, level: LogLevel, message: string, metadata?: any) {
    const timestamp = new Date().toISOString();
    const metaStr = metadata ? JSON.stringify(metadata) : '';
    const logMsg = `[${timestamp}] [${platform}] [${level.toUpperCase()}] ${message} ${metaStr}`;
    
    if (level === 'error') {
      console.error(logMsg);
    } else if (level === 'warn') {
      console.warn(logMsg);
    } else {
      console.log(logMsg);
    }
  }

  recordDownloadStart(platform: string, jobId: string) {
    this.log(platform, 'info', `Download started: ${jobId}`);
  }

  recordDownloadFailure(platform: string, jobId: string, error: string) {
    this.log(platform, 'error', `Download failed: ${jobId}`, { error });
  }

  recordDownloadSuccess(platform: string, jobId: string, duration: number) {
    this.log(platform, 'info', `Download success: ${jobId}`, { duration });
  }

  getAllStats() {
    return {};
  }

  getStatsSummary() {
    return {};
  }
}

export const diagnosticService = new DiagnosticService();
