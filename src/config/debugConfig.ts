/**
 * Debug configuration system
 * Controls visibility and behavior of debug features
 */

export interface DebugConfig {
  enabled: boolean;
  showFab: boolean;
  showKeyboardShortcut: boolean;
  autoOpen: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  maxLogs: number;
}

// Default configuration
const DEFAULT_DEBUG_CONFIG: DebugConfig = {
  enabled: true,
  showFab: true,
  showKeyboardShortcut: true,
  autoOpen: false,
  logLevel: 'debug',
  maxLogs: 1000
};

// Environment-based configuration
const getEnvironmentConfig = (): Partial<DebugConfig> => {
  const config: Partial<DebugConfig> = {};

  // Check environment variables
  if (import.meta.env.VITE_DEBUG_ENABLED !== undefined) {
    config.enabled = import.meta.env.VITE_DEBUG_ENABLED === 'true';
  }

  if (import.meta.env.VITE_DEBUG_SHOW_FAB !== undefined) {
    config.showFab = import.meta.env.VITE_DEBUG_SHOW_FAB === 'true';
  }

  if (import.meta.env.VITE_DEBUG_SHOW_KEYBOARD_SHORTCUT !== undefined) {
    config.showKeyboardShortcut = import.meta.env.VITE_DEBUG_SHOW_KEYBOARD_SHORTCUT === 'true';
  }

  if (import.meta.env.VITE_DEBUG_AUTO_OPEN !== undefined) {
    config.autoOpen = import.meta.env.VITE_DEBUG_AUTO_OPEN === 'true';
  }

  if (import.meta.env.VITE_DEBUG_LOG_LEVEL) {
    const level = import.meta.env.VITE_DEBUG_LOG_LEVEL as DebugConfig['logLevel'];
    if (['debug', 'info', 'warn', 'error'].includes(level)) {
      config.logLevel = level;
    }
  }

  if (import.meta.env.VITE_DEBUG_MAX_LOGS) {
    const maxLogs = parseInt(import.meta.env.VITE_DEBUG_MAX_LOGS, 10);
    if (!isNaN(maxLogs) && maxLogs > 0) {
      config.maxLogs = maxLogs;
    }
  }

  // Development mode defaults
  if (import.meta.env.DEV) {
    config.enabled = config.enabled ?? true;
  } else {
    // Production mode defaults
    config.enabled = config.enabled ?? false;
    config.showFab = config.showFab ?? false;
    config.showKeyboardShortcut = config.showKeyboardShortcut ?? false;
  }

  return config;
};

// Runtime configuration (can be changed via localStorage or programmatically)
const getRuntimeConfig = (): Partial<DebugConfig> => {
  try {
    const stored = localStorage.getItem('piano-debug-config');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.warn('Failed to load debug config from localStorage:', error);
  }
  return {};
};

// Save runtime configuration
export const saveDebugConfig = (config: Partial<DebugConfig>): void => {
  try {
    const current = getRuntimeConfig();
    const updated = { ...current, ...config };
    localStorage.setItem('piano-debug-config', JSON.stringify(updated));
  } catch (error) {
    console.warn('Failed to save debug config to localStorage:', error);
  }
};

// Get merged configuration
export const getDebugConfig = (): DebugConfig => {
  const envConfig = getEnvironmentConfig();
  const runtimeConfig = getRuntimeConfig();
  
  return {
    ...DEFAULT_DEBUG_CONFIG,
    ...envConfig,
    ...runtimeConfig
  };
};

// URL parameter overrides (for quick testing)
const getUrlConfig = (): Partial<DebugConfig> => {
  const params = new URLSearchParams(window.location.search);
  const config: Partial<DebugConfig> = {};

  if (params.has('debug')) {
    config.enabled = params.get('debug') === 'true';
  }

  if (params.has('debug-fab')) {
    config.showFab = params.get('debug-fab') === 'true';
  }

  if (params.has('debug-auto-open')) {
    config.autoOpen = params.get('debug-auto-open') === 'true';
  }

  if (params.has('debug-level')) {
    const level = params.get('debug-level') as DebugConfig['logLevel'];
    if (['debug', 'info', 'warn', 'error'].includes(level)) {
      config.logLevel = level;
    }
  }

  return config;
};

// Get final configuration with URL overrides
export const getFinalDebugConfig = (): DebugConfig => {
  const baseConfig = getDebugConfig();
  const urlConfig = getUrlConfig();
  
  return {
    ...baseConfig,
    ...urlConfig
  };
};

// Configuration presets
export const DEBUG_PRESETS = {
  // Development preset
  development: {
    enabled: true,
    showFab: true,
    showKeyboardShortcut: true,
    autoOpen: false,
    logLevel: 'debug' as const,
    maxLogs: 1000
  },

  // Production preset (minimal debugging)
  production: {
    enabled: false,
    showFab: false,
    showKeyboardShortcut: false,
    autoOpen: false,
    logLevel: 'error' as const,
    maxLogs: 100
  },

  // Testing preset (auto-open for debugging)
  testing: {
    enabled: true,
    showFab: true,
    showKeyboardShortcut: true,
    autoOpen: true,
    logLevel: 'debug' as const,
    maxLogs: 2000
  },

  // Minimal preset (only errors, no UI)
  minimal: {
    enabled: true,
    showFab: false,
    showKeyboardShortcut: false,
    autoOpen: false,
    logLevel: 'error' as const,
    maxLogs: 50
  }
};

// Apply preset
export const applyDebugPreset = (preset: keyof typeof DEBUG_PRESETS): void => {
  saveDebugConfig(DEBUG_PRESETS[preset]);
};

// Global configuration instance
export const debugConfig = getFinalDebugConfig();

// Make configuration available globally for runtime changes
(window as any).debugConfig = {
  get: getFinalDebugConfig,
  save: saveDebugConfig,
  presets: DEBUG_PRESETS,
  applyPreset: applyDebugPreset
};