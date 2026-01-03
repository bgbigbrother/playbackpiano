import { debugLogger } from './debugLogger';

export interface BrowserFeatureSupport {
  mediaRecorder: boolean;
  webAudio: boolean;
  localStorage: boolean;
  getUserMedia: boolean;
  audioContext: boolean;
  toneJs: boolean;
}

export interface CompatibilityIssue {
  feature: keyof BrowserFeatureSupport;
  severity: 'error' | 'warning' | 'info';
  message: string;
  suggestion: string;
}

/**
 * Browser compatibility checker and fallback provider
 * Detects browser capabilities and provides graceful degradation strategies
 */
export class BrowserCompatibility {
  private static _instance: BrowserCompatibility | null = null;
  private _support: BrowserFeatureSupport | null = null;
  private _issues: CompatibilityIssue[] = [];

  private constructor() {
    this.checkSupport();
  }

  static getInstance(): BrowserCompatibility {
    if (!BrowserCompatibility._instance) {
      BrowserCompatibility._instance = new BrowserCompatibility();
    }
    return BrowserCompatibility._instance;
  }

  /**
   * Check browser support for all required features
   */
  private checkSupport(): void {
    debugLogger.info('BrowserCompatibility: Checking browser support');

    this._support = {
      mediaRecorder: this.checkMediaRecorderSupport(),
      webAudio: this.checkWebAudioSupport(),
      localStorage: this.checkLocalStorageSupport(),
      getUserMedia: this.checkGetUserMediaSupport(),
      audioContext: this.checkAudioContextSupport(),
      toneJs: this.checkToneJsSupport()
    };

    this._issues = this.identifyIssues();

    debugLogger.info('BrowserCompatibility: Support check complete', {
      support: this._support,
      issues: this._issues
    });
  }

  /**
   * Check MediaRecorder API support
   */
  private checkMediaRecorderSupport(): boolean {
    try {
      const hasMediaRecorder = typeof MediaRecorder !== 'undefined';
      const hasIsTypeSupported = hasMediaRecorder && typeof MediaRecorder.isTypeSupported === 'function';
      
      if (!hasMediaRecorder) {
        debugLogger.warn('BrowserCompatibility: MediaRecorder not available');
        return false;
      }

      // Test if any common MIME types are supported
      const testTypes = ['audio/webm', 'audio/mp4', 'audio/wav'];
      const hasSupported = hasIsTypeSupported && testTypes.some(type => 
        MediaRecorder.isTypeSupported(type)
      );

      if (!hasSupported) {
        debugLogger.warn('BrowserCompatibility: No supported MediaRecorder MIME types');
        return false;
      }

      return true;
    } catch (error) {
      debugLogger.error('BrowserCompatibility: MediaRecorder check failed', { error });
      return false;
    }
  }

  /**
   * Check Web Audio API support
   */
  private checkWebAudioSupport(): boolean {
    try {
      const hasAudioContext = !!(window.AudioContext || (window as any).webkitAudioContext);
      
      if (!hasAudioContext) {
        debugLogger.warn('BrowserCompatibility: Web Audio API not available');
        return false;
      }

      // Try to create an AudioContext to verify it works
      try {
        const context = new (window.AudioContext || (window as any).webkitAudioContext)();
        context.close(); // Clean up immediately
        return true;
      } catch (error) {
        debugLogger.warn('BrowserCompatibility: AudioContext creation failed', { error });
        return false;
      }
    } catch (error) {
      debugLogger.error('BrowserCompatibility: Web Audio check failed', { error });
      return false;
    }
  }

  /**
   * Check localStorage support
   */
  private checkLocalStorageSupport(): boolean {
    try {
      if (typeof Storage === 'undefined' || !window.localStorage) {
        debugLogger.warn('BrowserCompatibility: localStorage not available');
        return false;
      }

      // Test localStorage functionality
      const testKey = '__piano_storage_test__';
      const testValue = 'test';
      
      localStorage.setItem(testKey, testValue);
      const retrieved = localStorage.getItem(testKey);
      localStorage.removeItem(testKey);
      
      if (retrieved !== testValue) {
        debugLogger.warn('BrowserCompatibility: localStorage not functional');
        return false;
      }

      return true;
    } catch (error) {
      debugLogger.warn('BrowserCompatibility: localStorage check failed', { error });
      return false;
    }
  }

  /**
   * Check getUserMedia support
   */
  private checkGetUserMediaSupport(): boolean {
    try {
      const hasGetUserMedia = !!(
        navigator.mediaDevices && 
        navigator.mediaDevices.getUserMedia
      );

      if (!hasGetUserMedia) {
        debugLogger.warn('BrowserCompatibility: getUserMedia not available');
        return false;
      }

      // Check if we're in a secure context (required for getUserMedia)
      if (!window.isSecureContext) {
        debugLogger.warn('BrowserCompatibility: Not in secure context, getUserMedia may not work');
        return false;
      }

      return true;
    } catch (error) {
      debugLogger.error('BrowserCompatibility: getUserMedia check failed', { error });
      return false;
    }
  }

  /**
   * Check AudioContext support (more specific than Web Audio)
   */
  private checkAudioContextSupport(): boolean {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      
      if (!AudioContextClass) {
        return false;
      }

      // Check for required AudioContext features
      const requiredFeatures = [
        'createOscillator',
        'createGain',
        'createAnalyser',
        'decodeAudioData'
      ];

      try {
        const context = new AudioContextClass();
        const hasFeatures = requiredFeatures.every(feature => 
          typeof (context as any)[feature] === 'function'
        );
        context.close();
        
        return hasFeatures;
      } catch (error) {
        debugLogger.warn('BrowserCompatibility: AudioContext feature check failed', { error });
        return false;
      }
    } catch (error) {
      debugLogger.error('BrowserCompatibility: AudioContext check failed', { error });
      return false;
    }
  }

  /**
   * Check Tone.js support (if available)
   */
  private checkToneJsSupport(): boolean {
    try {
      // Check if Tone.js is loaded
      const hasTone = typeof (window as any).Tone !== 'undefined';
      
      if (!hasTone) {
        debugLogger.info('BrowserCompatibility: Tone.js not loaded');
        return false;
      }

      // Check for required Tone.js features
      const Tone = (window as any).Tone;
      const requiredFeatures = ['Transport', 'Oscillator', 'Player', 'context'];
      
      const hasFeatures = requiredFeatures.every(feature => 
        Tone[feature] !== undefined
      );

      if (!hasFeatures) {
        debugLogger.warn('BrowserCompatibility: Tone.js missing required features');
        return false;
      }

      return true;
    } catch (error) {
      debugLogger.error('BrowserCompatibility: Tone.js check failed', { error });
      return false;
    }
  }

  /**
   * Identify compatibility issues and generate user-friendly messages
   */
  private identifyIssues(): CompatibilityIssue[] {
    const issues: CompatibilityIssue[] = [];

    if (!this._support) return issues;

    // MediaRecorder issues
    if (!this._support.mediaRecorder) {
      issues.push({
        feature: 'mediaRecorder',
        severity: 'warning',
        message: 'Audio recording is not supported in this browser',
        suggestion: 'Use Chrome, Firefox, or Safari for audio recording functionality'
      });
    }

    // Web Audio issues
    if (!this._support.webAudio) {
      issues.push({
        feature: 'webAudio',
        severity: 'error',
        message: 'Web Audio API is not supported',
        suggestion: 'Update your browser to a modern version that supports Web Audio API'
      });
    }

    // localStorage issues
    if (!this._support.localStorage) {
      issues.push({
        feature: 'localStorage',
        severity: 'info',
        message: 'Settings cannot be saved between sessions',
        suggestion: 'Enable cookies and local storage, or disable private browsing mode'
      });
    }

    // getUserMedia issues
    if (!this._support.getUserMedia) {
      issues.push({
        feature: 'getUserMedia',
        severity: 'warning',
        message: 'Microphone access is not available',
        suggestion: 'Use HTTPS and a modern browser to enable microphone access'
      });
    }

    // AudioContext issues
    if (!this._support.audioContext) {
      issues.push({
        feature: 'audioContext',
        severity: 'error',
        message: 'Advanced audio features are not supported',
        suggestion: 'Update your browser or try a different browser'
      });
    }

    // Tone.js issues
    if (!this._support.toneJs) {
      issues.push({
        feature: 'toneJs',
        severity: 'warning',
        message: 'Metronome functionality may be limited',
        suggestion: 'Ensure Tone.js library is loaded properly'
      });
    }

    return issues;
  }

  /**
   * Get current browser support status
   */
  get support(): BrowserFeatureSupport {
    if (!this._support) {
      this.checkSupport();
    }
    return this._support!;
  }

  /**
   * Get compatibility issues
   */
  get issues(): CompatibilityIssue[] {
    return [...this._issues];
  }

  /**
   * Check if a specific feature is supported
   */
  isSupported(feature: keyof BrowserFeatureSupport): boolean {
    return this.support[feature];
  }

  /**
   * Get issues for a specific feature
   */
  getIssuesForFeature(feature: keyof BrowserFeatureSupport): CompatibilityIssue[] {
    return this._issues.filter(issue => issue.feature === feature);
  }

  /**
   * Get overall compatibility score (0-1)
   */
  getCompatibilityScore(): number {
    const features = Object.values(this.support);
    const supportedCount = features.filter(Boolean).length;
    return supportedCount / features.length;
  }

  /**
   * Check if the browser is generally compatible
   */
  isGenerallyCompatible(): boolean {
    // Require at least Web Audio and localStorage for basic functionality
    return this.support.webAudio && this.support.localStorage;
  }

  /**
   * Get browser information for debugging
   */
  getBrowserInfo(): {
    userAgent: string;
    vendor: string;
    platform: string;
    language: string;
    cookieEnabled: boolean;
    onLine: boolean;
  } {
    return {
      userAgent: navigator.userAgent,
      vendor: navigator.vendor || 'Unknown',
      platform: navigator.platform || 'Unknown',
      language: navigator.language || 'Unknown',
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine
    };
  }

  /**
   * Generate a compatibility report for debugging
   */
  generateReport(): {
    support: BrowserFeatureSupport;
    issues: CompatibilityIssue[];
    score: number;
    browserInfo: ReturnType<BrowserCompatibility['getBrowserInfo']>;
    timestamp: string;
  } {
    return {
      support: this.support,
      issues: this.issues,
      score: this.getCompatibilityScore(),
      browserInfo: this.getBrowserInfo(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Refresh compatibility check (useful after dynamic imports)
   */
  refresh(): void {
    debugLogger.info('BrowserCompatibility: Refreshing compatibility check');
    this.checkSupport();
  }
}

/**
 * Convenience function to get the singleton instance
 */
export function getBrowserCompatibility(): BrowserCompatibility {
  return BrowserCompatibility.getInstance();
}

/**
 * Quick check functions for common use cases
 */
export const browserSupport = {
  canRecordAudio: () => getBrowserCompatibility().isSupported('mediaRecorder') && 
                        getBrowserCompatibility().isSupported('getUserMedia'),
  
  canPlayAudio: () => getBrowserCompatibility().isSupported('webAudio') || 
                      getBrowserCompatibility().isSupported('audioContext'),
  
  canSaveSettings: () => getBrowserCompatibility().isSupported('localStorage'),
  
  canUseMetronome: () => getBrowserCompatibility().isSupported('audioContext') &&
                         getBrowserCompatibility().isSupported('toneJs'),
  
  isFullyCompatible: () => getBrowserCompatibility().isGenerallyCompatible()
};