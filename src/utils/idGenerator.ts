/**
 * Generador de IDs únicos para trabajos de descarga
 * Usa una combinación de timestamp y UUID parcial para garantizar unicidad
 */

/**
 * Genera un UUID v4 simple sin dependencias externas
 * @returns Un string UUID v4 compliant
 */
export function generateUUID(): string {
  // Usar crypto.randomUUID si está disponible (navegadores modernos y Node.js 19+)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback: generar UUID v4 manualmente
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : ((r & 0x3) | 0x8);
    return v.toString(16);
  });
}

/**
 * Genera un ID único para trabajos de descarga
 * Formato: job_[timestamp]_[uuid-corto]
 * @returns Un ID único para un trabajo de descarga
 */
export function generateJobId(): string {
  const timestamp = Date.now();
  const shortUuid = generateUUID().split('-')[0];
  return `job_${timestamp}_${shortUuid}`;
}

/**
 * Genera un ID único corto (8 caracteres)
 * Útil para identificadores de sesión o referencia rápida
 * @returns Un ID único de 8 caracteres
 */
export function generateShortId(): string {
  return generateUUID().split('-')[0];
}
