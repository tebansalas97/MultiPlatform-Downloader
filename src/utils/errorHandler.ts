/**
 * Sistema unificado de manejo de errores
 * Proporciona clases de error tipadas y utilidades de logging
 */

/**
 * Tipos de errores de la aplicación
 */
export enum ErrorType {
  NETWORK = 'NETWORK',
  DOWNLOAD = 'DOWNLOAD',
  FFMPEG = 'FFMPEG',
  YTDLP = 'YTDLP',
  PLATFORM = 'PLATFORM',
  VALIDATION = 'VALIDATION',
  FILESYSTEM = 'FILESYSTEM',
  PERMISSION = 'PERMISSION',
  RATE_LIMIT = 'RATE_LIMIT',
  AUTHENTICATION = 'AUTHENTICATION',
  UNKNOWN = 'UNKNOWN'
}

/**
 * Severidad del error
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Interfaz base para errores de la aplicación
 */
export interface AppErrorDetails {
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  userMessage: string;
  context?: Record<string, unknown>;
  recoverable: boolean;
  retryable: boolean;
  timestamp: Date;
}

/**
 * Clase base de error para la aplicación
 */
export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly severity: ErrorSeverity;
  public readonly userMessage: string;
  public readonly context: Record<string, unknown>;
  public readonly recoverable: boolean;
  public readonly retryable: boolean;
  public readonly timestamp: Date;

  constructor(details: Partial<AppErrorDetails> & { message: string }) {
    super(details.message);
    this.name = 'AppError';
    this.type = details.type || ErrorType.UNKNOWN;
    this.severity = details.severity || ErrorSeverity.MEDIUM;
    this.userMessage = details.userMessage || details.message;
    this.context = details.context || {};
    this.recoverable = details.recoverable ?? true;
    this.retryable = details.retryable ?? false;
    this.timestamp = details.timestamp || new Date();
    
    // Mantener el stack trace correcto en V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  /**
   * Convierte el error a un objeto plano para logging/serialización
   */
  toJSON(): AppErrorDetails {
    return {
      type: this.type,
      severity: this.severity,
      message: this.message,
      userMessage: this.userMessage,
      context: this.context,
      recoverable: this.recoverable,
      retryable: this.retryable,
      timestamp: this.timestamp
    };
  }
}

/**
 * Error de red (conexión, timeout, etc.)
 */
export class NetworkError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super({
      message,
      type: ErrorType.NETWORK,
      severity: ErrorSeverity.MEDIUM,
      userMessage: 'Error de conexión. Por favor verifica tu conexión a internet.',
      context,
      recoverable: true,
      retryable: true
    });
    this.name = 'NetworkError';
  }
}

/**
 * Error de descarga
 */
export class DownloadError extends AppError {
  constructor(message: string, context?: Record<string, unknown>, retryable = true) {
    super({
      message,
      type: ErrorType.DOWNLOAD,
      severity: ErrorSeverity.HIGH,
      userMessage: 'Error durante la descarga. El archivo podría estar incompleto.',
      context,
      recoverable: true,
      retryable
    });
    this.name = 'DownloadError';
  }
}

/**
 * Error de FFmpeg
 */
export class FFmpegError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super({
      message,
      type: ErrorType.FFMPEG,
      severity: ErrorSeverity.HIGH,
      userMessage: 'Error al procesar el video. FFmpeg podría no estar instalado correctamente.',
      context,
      recoverable: false,
      retryable: false
    });
    this.name = 'FFmpegError';
  }
}

/**
 * Error de yt-dlp
 */
export class YtDlpError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super({
      message,
      type: ErrorType.YTDLP,
      severity: ErrorSeverity.HIGH,
      userMessage: 'Error al obtener información del video. El enlace podría no ser válido.',
      context,
      recoverable: true,
      retryable: true
    });
    this.name = 'YtDlpError';
  }
}

/**
 * Error de plataforma (YouTube, TikTok, etc.)
 */
export class PlatformError extends AppError {
  public readonly platform: string;

  constructor(platform: string, message: string, context?: Record<string, unknown>) {
    super({
      message: `[${platform}] ${message}`,
      type: ErrorType.PLATFORM,
      severity: ErrorSeverity.MEDIUM,
      userMessage: `Error con la plataforma ${platform}. Intenta de nuevo más tarde.`,
      context: { ...context, platform },
      recoverable: true,
      retryable: true
    });
    this.name = 'PlatformError';
    this.platform = platform;
  }
}

/**
 * Error de validación
 */
export class ValidationError extends AppError {
  public readonly field?: string;

  constructor(message: string, field?: string, context?: Record<string, unknown>) {
    super({
      message,
      type: ErrorType.VALIDATION,
      severity: ErrorSeverity.LOW,
      userMessage: field 
        ? `El campo "${field}" no es válido: ${message}`
        : `Datos no válidos: ${message}`,
      context: { ...context, field },
      recoverable: true,
      retryable: false
    });
    this.name = 'ValidationError';
    this.field = field;
  }
}

/**
 * Error de límite de tasa (rate limit)
 */
export class RateLimitError extends AppError {
  public readonly retryAfter?: number;

  constructor(message: string, retryAfter?: number, context?: Record<string, unknown>) {
    super({
      message,
      type: ErrorType.RATE_LIMIT,
      severity: ErrorSeverity.MEDIUM,
      userMessage: retryAfter 
        ? `Demasiadas solicitudes. Por favor espera ${retryAfter} segundos.`
        : 'Demasiadas solicitudes. Por favor espera un momento.',
      context: { ...context, retryAfter },
      recoverable: true,
      retryable: true
    });
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

/**
 * Utilidades para manejo de errores
 */
export const errorUtils = {
  /**
   * Determina si un error es recuperable
   */
  isRecoverable(error: unknown): boolean {
    if (error instanceof AppError) {
      return error.recoverable;
    }
    return true;
  },

  /**
   * Determina si se puede reintentar la operación
   */
  isRetryable(error: unknown): boolean {
    if (error instanceof AppError) {
      return error.retryable;
    }
    // Errores de red generalmente son reintentables
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return true;
    }
    return false;
  },

  /**
   * Obtiene un mensaje amigable para el usuario
   */
  getUserMessage(error: unknown): string {
    if (error instanceof AppError) {
      return error.userMessage;
    }
    if (error instanceof Error) {
      return error.message;
    }
    return 'Ha ocurrido un error inesperado.';
  },

  /**
   * Convierte cualquier error a AppError
   */
  toAppError(error: unknown): AppError {
    if (error instanceof AppError) {
      return error;
    }
    if (error instanceof Error) {
      return new AppError({
        message: error.message,
        type: ErrorType.UNKNOWN,
        severity: ErrorSeverity.MEDIUM,
        context: { originalError: error.name, stack: error.stack }
      });
    }
    return new AppError({
      message: String(error),
      type: ErrorType.UNKNOWN,
      severity: ErrorSeverity.LOW
    });
  },

  /**
   * Loguea un error de forma consistente
   */
  logError(error: unknown, context?: string): void {
    const appError = errorUtils.toAppError(error);
    const prefix = context ? `[${context}]` : '';
    
    switch (appError.severity) {
      case ErrorSeverity.CRITICAL:
        console.error(`🔴 ${prefix} CRITICAL:`, appError.message, appError.context);
        break;
      case ErrorSeverity.HIGH:
        console.error(`🟠 ${prefix} ERROR:`, appError.message, appError.context);
        break;
      case ErrorSeverity.MEDIUM:
        console.warn(`🟡 ${prefix} WARNING:`, appError.message, appError.context);
        break;
      case ErrorSeverity.LOW:
        console.info(`🔵 ${prefix} INFO:`, appError.message, appError.context);
        break;
    }
  }
};

export default errorUtils;
