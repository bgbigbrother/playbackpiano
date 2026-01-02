import * as Tone from 'tone';
import { debugLogger } from './debugLogger';
import { findBestSampleSource, checkNetworkConnectivity } from './sampleFallbacks';
import { performanceMonitor } from './performanceMonitor';

// Extend Window interface for Web Audio API compatibility
declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

export interface AudioEngineError {
  type: 'CONTEXT_UNAVAILABLE' | 'CONTEXT_SUSPENDED' | 'SAMPLE_LOADING_FAILED' | 'SAMPLE_LOADING_TIMEOUT' | 'PLAYBACK_ERROR';
  message: string;
  originalError?: Error;
}

/**
 * AudioEngine manages the Tone.js audio context and piano sampler
 * Handles sample loading, note playback, and audio state management with comprehensive error handling
 */
export class AudioEngine {
  private sampler: Tone.Sampler | null = null;
  private _isLoaded = false;
  private _loadingProgress = 0;
  private _isInitialized = false;
  private _error: AudioEngineError | null = null;
  private retryCount = 0;
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // 1 second
  private activeNotes: Set<string> = new Set(); // Track currently playing notes

  constructor() {
    debugLogger.info('AudioEngine: Constructor called');
    
    // Initialize Tone.js context with error handling
    this.initializeToneContext();
    
    // Set audio context latency hint for optimal performance
    // 'interactive' provides the best balance for real-time playback
    if (Tone.context.rawContext) {
      // Already set during context creation, but we can verify
      debugLogger.info('AudioEngine: Audio context latency hint', { 
        latencyHint: Tone.context.latencyHint,
        sampleRate: Tone.context.sampleRate,
        state: Tone.context.state
      });
    }
  }

  /**
   * Initialize the Tone.js audio context with error handling
   */
  private initializeToneContext(): void {
    try {
      debugLogger.info('AudioEngine: Initializing Tone.js context');
      
      // Check if Web Audio API is available
      if (!window.AudioContext && !window.webkitAudioContext) {
        debugLogger.error('AudioEngine: Web Audio API not supported');
        this._error = {
          type: 'CONTEXT_UNAVAILABLE',
          message: 'Web Audio API is not supported in this browser'
        };
        throw new Error(this._error.message);
      }

      // Ensure Tone.js context is available
      if (!Tone.context) {
        debugLogger.error('AudioEngine: Tone.js context could not be created');
        this._error = {
          type: 'CONTEXT_UNAVAILABLE',
          message: 'Tone.js audio context could not be created'
        };
        throw new Error(this._error.message);
      }

      // Check context state
      debugLogger.info('AudioEngine: Context state', { 
        state: Tone.context.state,
        sampleRate: Tone.context.sampleRate
      });
      
      if (Tone.context.state === 'suspended') {
        debugLogger.warn('AudioEngine: Audio context suspended, will resume on user interaction');
      } else if (Tone.context.state !== 'running') {
        debugLogger.info('AudioEngine: Audio context ready, waiting for user interaction');
      }

      this._isInitialized = true;
      debugLogger.info('AudioEngine: Context initialization successful');
    } catch (error) {
      debugLogger.error('AudioEngine: Failed to initialize Tone.js context', { error });
      this._error = {
        type: 'CONTEXT_UNAVAILABLE',
        message: 'Web Audio API not available',
        originalError: error instanceof Error ? error : new Error(String(error))
      };
      throw error;
    }
  }

  /**
   * Load piano samples and initialize the sampler with retry logic
   */
  async initialize(): Promise<void> {
    debugLogger.info('AudioEngine: Initialize called', { 
      isLoaded: this._isLoaded,
      isInitialized: this._isInitialized 
    });
    
    if (this._isLoaded) {
      debugLogger.info('AudioEngine: Already loaded, skipping initialization');
      return;
    }

    return performanceMonitor.monitorOperation('AudioEngine.initialize', () => 
      this.initializeWithRetry()
    );
  }

  /**
   * Initialize with exponential backoff retry logic
   */
  private async initializeWithRetry(): Promise<void> {
    debugLogger.info('AudioEngine: Starting initialization with retry', { 
      retryCount: this.retryCount,
      maxRetries: this.maxRetries 
    });
    
    try {
      await this.attemptInitialization();
      this.retryCount = 0; // Reset retry count on success
      debugLogger.info('AudioEngine: Initialization successful');
    } catch (error) {
      debugLogger.error('AudioEngine: Initialization attempt failed', { 
        error,
        retryCount: this.retryCount,
        maxRetries: this.maxRetries 
      });
      
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        const delay = this.retryDelay * Math.pow(2, this.retryCount - 1); // Exponential backoff
        
        debugLogger.warn('AudioEngine: Retrying initialization', {
          attempt: this.retryCount,
          maxRetries: this.maxRetries,
          delay
        });
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.initializeWithRetry();
      } else {
        // Max retries reached
        debugLogger.error('AudioEngine: Max retries reached, initialization failed');
        this._error = {
          type: 'SAMPLE_LOADING_FAILED',
          message: `Failed to load piano samples after ${this.maxRetries} attempts`,
          originalError: error instanceof Error ? error : new Error(String(error))
        };
        throw this._error;
      }
    }
  }

  /**
   * Attempt to initialize the sampler (single attempt)
   */
  private async attemptInitialization(): Promise<void> {
    debugLogger.info('AudioEngine: Starting single initialization attempt');
    
    try {
      // Check network connectivity first
      const hasNetwork = await checkNetworkConnectivity();
      if (!hasNetwork) {
        debugLogger.error('AudioEngine: No network connectivity detected');
        throw new Error('No network connection available for loading samples');
      }

      // Handle audio context suspension
      if (Tone.context.state === 'suspended') {
        debugLogger.warn('AudioEngine: Audio context suspended, will resume on first user interaction');
        // Don't try to start the context here - it will fail without user gesture
        // Just continue with sample loading, context will resume when user interacts
      } else if (Tone.context.state !== 'running') {
        debugLogger.info('AudioEngine: Starting audio context');
        try {
          await Tone.start();
          debugLogger.info('AudioEngine: Audio context started successfully');
        } catch (error) {
          debugLogger.warn('AudioEngine: Could not start audio context, will resume on user interaction', { error });
          // Continue anyway - samples can still load
        }
      }

      // Find the best available sample source
      const sampleSource = await findBestSampleSource();
      
      // Calculate total samples for progress tracking
      const totalSamples = Object.keys(sampleSource.sampleMap).length;

      debugLogger.info('AudioEngine: Creating sampler', { 
        totalSamples,
        sourceName: sampleSource.name,
        baseUrl: sampleSource.baseUrl,
        sampleKeys: Object.keys(sampleSource.sampleMap)
      });

      // Clear any previous error
      this._error = null;
      this._loadingProgress = 10; // Indicate loading started

      // Create sampler with error handling using selected sample source
      // Optimize for low-latency playback with attack and release settings
      let loadingError: Error | null = null;
      
      this.sampler = new Tone.Sampler({
        urls: sampleSource.sampleMap,
        baseUrl: sampleSource.baseUrl,
        attack: 0, // Immediate attack for low latency
        release: 1, // Natural release time
        onload: () => {
          debugLogger.info('AudioEngine: All samples loaded successfully', { 
            totalSamples,
            sourceName: sampleSource.name
          });
          this._isLoaded = true;
          this._loadingProgress = 100;
        },
        onerror: (error) => {
          debugLogger.error('AudioEngine: Sample loading error', { error, sourceName: sampleSource.name });
          loadingError = new Error(`Sample loading failed from ${sampleSource.name}: ${error}`);
        }
      }).toDestination();

      debugLogger.info('AudioEngine: Sampler created, waiting for samples to load');

      // Update progress as samples load
      this._loadingProgress = 20; // Indicate sampler created, loading in progress
      
      // Simulate progressive loading feedback
      const progressInterval = setInterval(() => {
        if (this._isLoaded || loadingError) {
          clearInterval(progressInterval);
        } else if (this._loadingProgress < 90) {
          // Gradually increase progress while loading
          this._loadingProgress += 5;
          debugLogger.debug('AudioEngine: Loading progress', { progress: this._loadingProgress });
        }
      }, 200);
      
      // Wait for samples to load with timeout
      try {
        await new Promise<void>((resolve, reject) => {
          const startTime = Date.now();
          const timeout = sampleSource.timeout;
          
          debugLogger.info('AudioEngine: Starting sample loading wait', { timeout, sourceName: sampleSource.name });
          
          const checkLoaded = () => {
            const elapsed = Date.now() - startTime;
            
            if (loadingError) {
              debugLogger.error('AudioEngine: Loading error detected', { loadingError, elapsed, sourceName: sampleSource.name });
              clearInterval(progressInterval);
              reject(loadingError);
              return;
            }
            
            if (this._isLoaded) {
              debugLogger.info('AudioEngine: Loading completed successfully', { elapsed, sourceName: sampleSource.name });
              clearInterval(progressInterval);
              resolve();
              return;
            }
            
            // Check for timeout
            if (elapsed > timeout) {
              debugLogger.error('AudioEngine: Loading timeout reached', { elapsed, timeout, sourceName: sampleSource.name });
              clearInterval(progressInterval);
              this._error = {
                type: 'SAMPLE_LOADING_TIMEOUT',
                message: `Sample loading timed out after ${Math.round(timeout/1000)} seconds from ${sampleSource.name}`
              };
              reject(new Error(this._error.message));
              return;
            }
            
            // Log periodic status updates
            if (elapsed % 5000 === 0 && elapsed > 0) {
              debugLogger.info('AudioEngine: Still loading samples', { 
                elapsed,
                progress: this._loadingProgress,
                contextState: Tone.context.state,
                sourceName: sampleSource.name
              });
            }
            
            // Check again in 100ms
            setTimeout(checkLoaded, 100);
          };
          
          // Start checking
          checkLoaded();
        });
      } finally {
        clearInterval(progressInterval);
      }

      debugLogger.info('AudioEngine: Initialization attempt completed successfully');

    } catch (error) {
      debugLogger.error('AudioEngine: Initialization attempt failed', { error });
      
      // Clean up on failure
      if (this.sampler) {
        this.sampler.dispose();
        this.sampler = null;
      }
      
      throw error;
    }
  }

  /**
   * Play a piano note with error handling
   * @param note - The note to play (e.g., 'C4', 'F#3')
   * @param velocity - The velocity/volume (0-1, default 0.8)
   */
  playNote(note: string, velocity: number = 0.8): void {
    if (!this.sampler || !this._isLoaded) {
      console.warn('AudioEngine not ready, cannot play note:', note);
      return;
    }

    try {
      // Handle suspended audio context - try to resume on user interaction
      if (Tone.context.state === 'suspended') {
        debugLogger.info('AudioEngine: Resuming audio context on user interaction');
        Tone.start().then(() => {
          debugLogger.info('AudioEngine: Audio context resumed, playing note');
          this.playNoteInternal(note, velocity);
        }).catch((error) => {
          debugLogger.error('AudioEngine: Failed to resume audio context', { error });
          this._error = {
            type: 'CONTEXT_SUSPENDED',
            message: 'Audio context could not be resumed. Try clicking on the page first.'
          };
        });
        return;
      }

      // Ensure audio context is running
      if (Tone.context.state !== 'running') {
        Tone.start().then(() => {
          this.playNoteInternal(note, velocity);
        }).catch((error) => {
          debugLogger.error('AudioEngine: Failed to start audio context', { error });
        });
        return;
      }

      this.playNoteInternal(note, velocity);
      
    } catch (error) {
      this._error = {
        type: 'PLAYBACK_ERROR',
        message: `Failed to play note ${note}`,
        originalError: error instanceof Error ? error : new Error(String(error))
      };
      debugLogger.error('AudioEngine: Failed to play note', { note, error });
    }
  }

  /**
   * Internal method to actually play the note
   */
  private playNoteInternal(note: string, velocity: number): void {
    if (!this.sampler) return;

    // Validate note parameter
    if (!note || typeof note !== 'string') {
      throw new Error(`Invalid note parameter: ${note}`);
    }

    // Validate velocity parameter
    if (velocity < 0 || velocity > 1) {
      console.warn(`Invalid velocity ${velocity}, clamping to 0-1 range`);
      velocity = Math.max(0, Math.min(1, velocity));
    }

    // If note is already playing, don't retrigger it (prevents volume stacking)
    if (this.activeNotes.has(note)) {
      return;
    }

    // Play the note with specified velocity
    this.sampler.triggerAttack(note, undefined, velocity);
    
    // Track that this note is now active
    this.activeNotes.add(note);
    
    // Clear any previous playback errors
    if (this._error?.type === 'PLAYBACK_ERROR') {
      this._error = null;
    }

    debugLogger.debug('AudioEngine: Note played successfully', { note, velocity });
  }

  /**
   * Release a piano note (stop playing) with error handling
   * @param note - The note to release
   */
  releaseNote(note: string): void {
    if (!this.sampler || !this._isLoaded) {
      return;
    }

    try {
      // Validate note parameter
      if (!note || typeof note !== 'string') {
        console.warn(`Invalid note parameter for release: ${note}`);
        return;
      }

      this.sampler.triggerRelease(note);
      
      // Remove from active notes
      this.activeNotes.delete(note);
    } catch (error) {
      console.error('Failed to release note:', note, error);
      // Don't set error state for release failures as they're less critical
    }
  }

  /**
   * Get the current loading status
   */
  get isLoaded(): boolean {
    return this._isLoaded;
  }

  /**
   * Get the current loading progress (0-100)
   */
  get loadingProgress(): number {
    return this._loadingProgress;
  }

  /**
   * Check if the audio engine is initialized
   */
  get isInitialized(): boolean {
    return this._isInitialized;
  }

  /**
   * Get the current error state
   */
  get error(): AudioEngineError | null {
    return this._error;
  }

  /**
   * Check if there's an active error
   */
  get hasError(): boolean {
    return this._error !== null;
  }

  /**
   * Check if the audio context is ready for playback
   * Note: Audio context may be suspended until user interaction, but samples can still be loaded
   */
  get isReady(): boolean {
    return this._isInitialized && this._isLoaded && !this.hasError;
  }

  /**
   * Clear the current error state
   */
  clearError(): void {
    this._error = null;
  }

  /**
   * Get a user-friendly error message for display
   */
  getErrorMessage(): string {
    if (!this._error) {
      return '';
    }

    switch (this._error.type) {
      case 'CONTEXT_UNAVAILABLE':
        return 'Your browser does not support audio playback. Please try a different browser.';
      case 'CONTEXT_SUSPENDED':
        return 'Audio is paused. Click anywhere to enable sound.';
      case 'SAMPLE_LOADING_FAILED':
        return 'Failed to load piano sounds. Please check your internet connection and try again.';
      case 'SAMPLE_LOADING_TIMEOUT':
        return 'Piano sounds are taking too long to load. Please check your internet connection.';
      case 'PLAYBACK_ERROR':
        return 'There was an error playing the sound. Please try again.';
      default:
        return 'An unknown audio error occurred.';
    }
  }

  /**
   * Dispose of the audio engine and clean up resources
   */
  dispose(): void {
    try {
      if (this.sampler) {
        this.sampler.dispose();
        this.sampler = null;
      }
    } catch (error) {
      console.error('Error disposing sampler:', error);
    }
    
    this._isLoaded = false;
    this._loadingProgress = 0;
    this._isInitialized = false;
    this._error = null;
    this.retryCount = 0;
    this.activeNotes.clear();
  }
}