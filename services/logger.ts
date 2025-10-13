/**
 * Centralized logging utility for MeBooks
 * Provides environment-aware logging that can be disabled in production
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private isDebugMode(): boolean {
    // Check for debug flags in various environments
    if (typeof window !== 'undefined' && (window as any).__MEBOOKS_DEBUG__) {
      return true;
    }
    
    // Check Vite environment variables safely
    try {
      const env = (import.meta as any)?.env;
      return env?.DEV || env?.VITE_DEBUG_LOGGING === 'true';
    } catch {
      return false;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    if (level === 'error') return true; // Always log errors
    if (level === 'warn') return true;  // Always log warnings
    return this.isDebugMode(); // Debug and info only in debug mode
  }

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog('debug')) {
      console.debug(`[mebooks:debug] ${message}`, ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.shouldLog('info')) {
      console.info(`[mebooks:info] ${message}`, ...args);
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.shouldLog('warn')) {
      console.warn(`[mebooks:warn] ${message}`, ...args);
    }
  }

  error(message: string, ...args: any[]): void {
    if (this.shouldLog('error')) {
      console.error(`[mebooks:error] ${message}`, ...args);
    }
  }

  // Legacy compatibility - can be removed once all console.log are replaced
  log(message: string, ...args: any[]): void {
    if (this.isDebugMode()) {
      console.log(`[mebooks] ${message}`, ...args);
    }
  }
}

export const logger = new Logger();