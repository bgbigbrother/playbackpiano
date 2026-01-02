import { debugConfig } from '../config/debugConfig';

/**
 * Debug logger that works without DevTools
 * Stores logs in memory and provides ways to access them
 */

export interface LogEntry {
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  data?: any;
}

// Extend XMLHttpRequest interface for debugging properties
declare global {
  interface XMLHttpRequest {
    _debugUrl?: string;
    _debugStartTime?: number;
  }
}

class DebugLogger {
  private logs: LogEntry[] = [];
  private maxLogs: number;
  private isEnabled: boolean;
  private logLevel: LogEntry['level'];

  constructor() {
    this.maxLogs = debugConfig.maxLogs;
    this.isEnabled = debugConfig.enabled;
    this.logLevel = debugConfig.logLevel;
  }

  private shouldLog(level: LogEntry['level']): boolean {
    if (!this.isEnabled) return false;

    const levels = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    
    return messageLevelIndex >= currentLevelIndex;
  }

  private addLog(level: LogEntry['level'], message: string, data?: any) {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      message,
      data: data ? JSON.parse(JSON.stringify(data)) : undefined
    };

    this.logs.push(entry);
    
    // Keep only the most recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Also log to console if available
    const consoleMethod = console[level] || console.log;
    if (data) {
      consoleMethod(`[${new Date(entry.timestamp).toISOString()}] ${message}`, data);
    } else {
      consoleMethod(`[${new Date(entry.timestamp).toISOString()}] ${message}`);
    }
  }

  info(message: string, data?: any) {
    this.addLog('info', message, data);
  }

  warn(message: string, data?: any) {
    this.addLog('warn', message, data);
  }

  error(message: string, data?: any) {
    this.addLog('error', message, data);
  }

  debug(message: string, data?: any) {
    this.addLog('debug', message, data);
  }

  // Get all logs
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  // Get logs by level
  getLogsByLevel(level: LogEntry['level']): LogEntry[] {
    return this.logs.filter(log => log.level === level);
  }

  // Get recent logs (last N entries)
  getRecentLogs(count: number = 50): LogEntry[] {
    return this.logs.slice(-count);
  }

  // Get logs as formatted string for display
  getLogsAsString(count: number = 50): string {
    return this.getRecentLogs(count)
      .map(log => {
        const time = new Date(log.timestamp).toISOString();
        const dataStr = log.data ? ` | ${JSON.stringify(log.data)}` : '';
        return `[${time}] ${log.level.toUpperCase()}: ${log.message}${dataStr}`;
      })
      .join('\n');
  }

  // Clear all logs
  clear() {
    this.logs = [];
  }

  // Enable/disable logging
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }

  // Update configuration
  updateConfig(config: { enabled?: boolean; maxLogs?: number; logLevel?: LogEntry['level'] }) {
    if (config.enabled !== undefined) this.isEnabled = config.enabled;
    if (config.maxLogs !== undefined) this.maxLogs = config.maxLogs;
    if (config.logLevel !== undefined) this.logLevel = config.logLevel;
  }

  // Get current configuration
  getConfig() {
    return {
      enabled: this.isEnabled,
      maxLogs: this.maxLogs,
      logLevel: this.logLevel
    };
  }

  // Export logs for debugging
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  // Add network monitoring
  monitorNetworkRequests() {
    if (!this.isEnabled) return;
    
    // Override fetch to monitor network requests
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const url = args[0] instanceof Request ? args[0].url : args[0];
      const startTime = Date.now();
      
      this.debug('Network request started', { url, startTime });
      
      try {
        const response = await originalFetch(...args);
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        this.debug('Network request completed', {
          url,
          status: response.status,
          duration,
          ok: response.ok
        });
        
        return response;
      } catch (error) {
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        this.error('Network request failed', {
          url,
          duration,
          error: error instanceof Error ? error.message : String(error)
        });
        
        throw error;
      }
    };

    // Monitor XMLHttpRequest as well (for Tone.js)
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function(method: string, url: string | URL, async: boolean = true, username?: string | null, password?: string | null) {
      this._debugUrl = typeof url === 'string' ? url : url.toString();
      this._debugStartTime = Date.now();
      debugLogger.debug('XHR request started', { method, url: this._debugUrl });
      return originalXHROpen.call(this, method, url, async, username, password);
    };

    XMLHttpRequest.prototype.send = function(...args) {
      const xhr = this;
      
      const originalOnLoad = xhr.onload;
      const originalOnError = xhr.onerror;
      const originalOnTimeout = xhr.ontimeout;

      xhr.onload = function(event) {
        const duration = Date.now() - (xhr._debugStartTime || 0);
        debugLogger.debug('XHR request completed', {
          url: xhr._debugUrl,
          status: xhr.status,
          duration,
          responseType: xhr.responseType
        });
        if (originalOnLoad) originalOnLoad.call(xhr, event);
      };

      xhr.onerror = function(event) {
        const duration = Date.now() - (xhr._debugStartTime || 0);
        debugLogger.error('XHR request failed', {
          url: xhr._debugUrl,
          duration,
          status: xhr.status
        });
        if (originalOnError) originalOnError.call(xhr, event);
      };

      xhr.ontimeout = function(event) {
        const duration = Date.now() - (xhr._debugStartTime || 0);
        debugLogger.error('XHR request timed out', {
          url: xhr._debugUrl,
          duration,
          timeout: xhr.timeout
        });
        if (originalOnTimeout) originalOnTimeout.call(xhr, event);
      };

      return originalXHRSend.call(this, ...args);
    };

    this.info('Network monitoring enabled');
  }
}

// Create global debug logger instance
export const debugLogger = new DebugLogger();

// Make it available globally for debugging in browser console
(window as any).debugLogger = debugLogger;

// Auto-enable network monitoring
debugLogger.monitorNetworkRequests();