/**
 * Settings Manager for Piano Control Panel
 * Handles persistence of user preferences to localStorage with error handling
 */

export interface UserSettings {
  controlPanelOpen: boolean;
  keyMarkingEnabled: boolean;
  metronomeVisible: boolean;
  labelsVisible: boolean;
  recorderVisible: boolean;
  metronomeBPM: number;
  noteLogMaxEntries: number;
  audioRecordingFormat: 'webm' | 'mp4' | 'wav';
}

export interface SettingsError {
  type: 'STORAGE_UNAVAILABLE' | 'QUOTA_EXCEEDED' | 'CORRUPTED_DATA' | 'UNKNOWN';
  message: string;
  originalError?: Error;
}

export class SettingsManager {
  private static readonly STORAGE_KEY = 'piano-control-panel-settings';
  private static readonly DEFAULT_SETTINGS: UserSettings = {
    controlPanelOpen: false,
    keyMarkingEnabled: false,
    metronomeVisible: false,
    labelsVisible: true,
    recorderVisible: false,
    metronomeBPM: 100,
    noteLogMaxEntries: 100,
    audioRecordingFormat: 'webm',
  };

  private isStorageAvailable: boolean;
  private currentSettings: UserSettings;

  constructor() {
    this.isStorageAvailable = this.checkStorageAvailability();
    this.currentSettings = this.loadSettings();
  }

  /**
   * Check if localStorage is available and functional
   */
  private checkStorageAvailability(): boolean {
    try {
      const testKey = '__storage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch (error) {
      console.warn('localStorage is not available:', error);
      return false;
    }
  }

  /**
   * Get default settings
   */
  public getDefaults(): UserSettings {
    return { ...SettingsManager.DEFAULT_SETTINGS };
  }

  /**
   * Load settings from localStorage with error handling
   */
  public loadSettings(): UserSettings {
    if (!this.isStorageAvailable) {
      return this.getDefaults();
    }

    try {
      const stored = localStorage.getItem(SettingsManager.STORAGE_KEY);
      if (!stored) {
        return this.getDefaults();
      }

      const parsed = JSON.parse(stored);
      
      // Validate the parsed settings structure
      if (!this.isValidSettings(parsed)) {
        console.warn('Corrupted settings detected, resetting to defaults');
        this.resetToDefaults();
        return this.getDefaults();
      }

      // Merge with defaults to handle missing properties from older versions
      const settings = { ...this.getDefaults(), ...parsed };
      this.currentSettings = settings;
      return settings;

    } catch (error) {
      console.error('Failed to load settings:', error);
      this.resetToDefaults();
      return this.getDefaults();
    }
  }

  /**
   * Save settings to localStorage with error handling
   */
  public saveSettings(settings: UserSettings): SettingsError | null {
    this.currentSettings = { ...settings };

    if (!this.isStorageAvailable) {
      return {
        type: 'STORAGE_UNAVAILABLE',
        message: 'localStorage is not available, settings will not persist'
      };
    }

    try {
      const serialized = JSON.stringify(settings);
      localStorage.setItem(SettingsManager.STORAGE_KEY, serialized);
      return null; // Success
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'QuotaExceededError') {
          return {
            type: 'QUOTA_EXCEEDED',
            message: 'Storage quota exceeded, unable to save settings',
            originalError: error
          };
        }
      }
      
      return {
        type: 'UNKNOWN',
        message: 'Failed to save settings to localStorage',
        originalError: error instanceof Error ? error : new Error(String(error))
      };
    }
  }

  /**
   * Reset settings to defaults and clear localStorage
   */
  public resetToDefaults(): SettingsError | null {
    this.currentSettings = this.getDefaults();

    if (!this.isStorageAvailable) {
      return {
        type: 'STORAGE_UNAVAILABLE',
        message: 'localStorage is not available, cannot clear stored settings'
      };
    }

    try {
      localStorage.removeItem(SettingsManager.STORAGE_KEY);
      return null; // Success
    } catch (error) {
      return {
        type: 'UNKNOWN',
        message: 'Failed to clear settings from localStorage',
        originalError: error instanceof Error ? error : new Error(String(error))
      };
    }
  }

  /**
   * Get current settings (from memory)
   */
  public getCurrentSettings(): UserSettings {
    return { ...this.currentSettings };
  }

  /**
   * Update specific setting and save
   */
  public updateSetting<K extends keyof UserSettings>(
    key: K, 
    value: UserSettings[K]
  ): SettingsError | null {
    const newSettings = { ...this.currentSettings, [key]: value };
    return this.saveSettings(newSettings);
  }

  /**
   * Validate settings object structure
   */
  private isValidSettings(obj: any): obj is UserSettings {
    if (!obj || typeof obj !== 'object') {
      return false;
    }

    const requiredKeys: (keyof UserSettings)[] = [
      'controlPanelOpen',
      'keyMarkingEnabled',
      'metronomeVisible',
      'labelsVisible',
      'recorderVisible',
      'metronomeBPM',
      'noteLogMaxEntries',
      'audioRecordingFormat'
    ];

    // Check if all required keys exist and have correct types
    for (const key of requiredKeys) {
      if (!(key in obj)) {
        continue; // Missing keys will be filled with defaults
      }

      const value = obj[key];
      switch (key) {
        case 'controlPanelOpen':
        case 'keyMarkingEnabled':
        case 'metronomeVisible':
        case 'labelsVisible':
        case 'recorderVisible':
          if (typeof value !== 'boolean') return false;
          break;
        case 'metronomeBPM':
        case 'noteLogMaxEntries':
          if (typeof value !== 'number' || !Number.isFinite(value)) return false;
          break;
        case 'audioRecordingFormat':
          if (!['webm', 'mp4', 'wav'].includes(value)) return false;
          break;
      }
    }

    return true;
  }

  /**
   * Check if localStorage is currently available
   */
  public isLocalStorageAvailable(): boolean {
    return this.isStorageAvailable;
  }

  /**
   * Get storage usage information (if available)
   */
  public getStorageInfo(): { used?: number; quota?: number; available: boolean } {
    if (!this.isStorageAvailable) {
      return { available: false };
    }

    try {
      // Try to get storage estimate if available (modern browsers)
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        navigator.storage.estimate().then(estimate => {
          console.log('Storage estimate:', estimate);
        });
      }

      // Calculate approximate usage
      const stored = localStorage.getItem(SettingsManager.STORAGE_KEY);
      const used = stored ? new Blob([stored]).size : 0;

      return { used, available: true };
    } catch (error) {
      return { available: false };
    }
  }
}

// Export singleton instance
export const settingsManager = new SettingsManager();