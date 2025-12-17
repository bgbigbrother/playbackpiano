import * as Tone from 'tone';

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
    // Initialize Tone.js context with error handling
    this.initializeToneContext();
    
    // Set audio context latency hint for optimal performance
    // 'interactive' provides the best balance for real-time playback
    if (Tone.context.rawContext) {
      // Already set during context creation, but we can verify
      console.log('Audio context latency hint:', Tone.context.latencyHint);
    }
  }

  /**
   * Initialize the Tone.js audio context with error handling
   */
  private initializeToneContext(): void {
    try {
      // Check if Web Audio API is available
      if (!window.AudioContext && !window.webkitAudioContext) {
        this._error = {
          type: 'CONTEXT_UNAVAILABLE',
          message: 'Web Audio API is not supported in this browser'
        };
        throw new Error(this._error.message);
      }

      // Ensure Tone.js context is available
      if (!Tone.context) {
        this._error = {
          type: 'CONTEXT_UNAVAILABLE',
          message: 'Tone.js audio context could not be created'
        };
        throw new Error(this._error.message);
      }

      // Check context state
      if (Tone.context.state === 'suspended') {
        console.log('Audio context suspended, will resume on user interaction');
      } else if (Tone.context.state !== 'running') {
        console.log('Audio context ready, waiting for user interaction');
      }

      this._isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize Tone.js context:', error);
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
    if (this._isLoaded) {
      return;
    }

    return this.initializeWithRetry();
  }

  /**
   * Initialize with exponential backoff retry logic
   */
  private async initializeWithRetry(): Promise<void> {
    try {
      await this.attemptInitialization();
      this.retryCount = 0; // Reset retry count on success
    } catch (error) {
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        const delay = this.retryDelay * Math.pow(2, this.retryCount - 1); // Exponential backoff
        
        console.warn(`Sample loading failed, retrying in ${delay}ms (attempt ${this.retryCount}/${this.maxRetries})`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.initializeWithRetry();
      } else {
        // Max retries reached
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
    try {
      // Handle audio context suspension
      if (Tone.context.state === 'suspended') {
        this._error = {
          type: 'CONTEXT_SUSPENDED',
          message: 'Audio context is suspended. User interaction required to resume audio.'
        };
        // Try to resume context
        await Tone.start();
      } else if (Tone.context.state !== 'running') {
        await Tone.start();
      }

      // Define sample mapping for piano notes using Tone.js official samples
      // Using the Salamander Grand Piano samples hosted on Tone.js CDN
      // Optimized sample selection: fewer samples for faster loading
      // Tone.js will automatically pitch-shift to cover all notes
      const sampleMap: Record<string, string> = {
        'A0': 'A0.mp3',
        'C1': 'C1.mp3',
        'D#1': 'Ds1.mp3',
        'F#1': 'Fs1.mp3',
        'A1': 'A1.mp3',
        'C2': 'C2.mp3',
        'D#2': 'Ds2.mp3',
        'F#2': 'Fs2.mp3',
        'A2': 'A2.mp3',
        'C3': 'C3.mp3',
        'D#3': 'Ds3.mp3',
        'F#3': 'Fs3.mp3',
        'A3': 'A3.mp3',
        'C4': 'C4.mp3',
        'D#4': 'Ds4.mp3',
        'F#4': 'Fs4.mp3',
        'A4': 'A4.mp3',
        'C5': 'C5.mp3',
        'D#5': 'Ds5.mp3',
        'F#5': 'Fs5.mp3',
        'A5': 'A5.mp3',
        'C6': 'C6.mp3',
        'D#6': 'Ds6.mp3',
        'F#6': 'Fs6.mp3',
        'A6': 'A6.mp3',
        'C7': 'C7.mp3',
        'D#7': 'Ds7.mp3',
        'F#7': 'Fs7.mp3',
        'A7': 'A7.mp3',
        'C8': 'C8.mp3'
      };
      
      // Calculate total samples for progress tracking
      const totalSamples = Object.keys(sampleMap).length;

      // Clear any previous error
      this._error = null;
      this._loadingProgress = 10; // Indicate loading started

      // Create sampler with error handling using Tone.js official piano samples
      // Optimize for low-latency playback with attack and release settings
      let loadingError: Error | null = null;
      
      this.sampler = new Tone.Sampler({
        urls: sampleMap,
        baseUrl: 'https://tonejs.github.io/audio/salamander/',
        attack: 0, // Immediate attack for low latency
        release: 1, // Natural release time
        onload: () => {
          this._isLoaded = true;
          this._loadingProgress = 100;
          console.log(`Piano samples loaded successfully (${totalSamples} samples)`);
        },
        onerror: (error) => {
          loadingError = new Error(`Sample loading failed: ${error}`);
          console.error('Failed to load piano samples:', error);
        }
      }).toDestination();

      // Update progress as samples load
      this._loadingProgress = 20; // Indicate sampler created, loading in progress
      
      // Simulate progressive loading feedback
      const progressInterval = setInterval(() => {
        if (this._isLoaded || loadingError) {
          clearInterval(progressInterval);
        } else if (this._loadingProgress < 90) {
          // Gradually increase progress while loading
          this._loadingProgress += 5;
        }
      }, 200);
      
      // Wait for samples to load with timeout
      try {
        await new Promise<void>((resolve, reject) => {
          const startTime = Date.now();
          const timeout = 30000; // 30 seconds
          
          const checkLoaded = () => {
            if (loadingError) {
              clearInterval(progressInterval);
              reject(loadingError);
              return;
            }
            
            if (this._isLoaded) {
              clearInterval(progressInterval);
              resolve();
              return;
            }
            
            // Check for timeout
            if (Date.now() - startTime > timeout) {
              clearInterval(progressInterval);
              this._error = {
                type: 'SAMPLE_LOADING_TIMEOUT',
                message: 'Sample loading timed out after 30 seconds'
              };
              reject(new Error(this._error.message));
              return;
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

    } catch (error) {
      console.error('AudioEngine initialization attempt failed:', error);
      
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
      // Handle suspended audio context
      if (Tone.context.state === 'suspended') {
        this._error = {
          type: 'CONTEXT_SUSPENDED',
          message: 'Audio context is suspended. User interaction required to resume audio.'
        };
        console.warn('Audio context suspended, attempting to resume...');
        Tone.start().then(() => {
          // Retry playing the note after context resumes
          this.playNote(note, velocity);
        }).catch((error) => {
          console.error('Failed to resume audio context:', error);
        });
        return;
      }

      // Ensure audio context is running
      if (Tone.context.state !== 'running') {
        Tone.start();
      }

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
      
    } catch (error) {
      this._error = {
        type: 'PLAYBACK_ERROR',
        message: `Failed to play note ${note}`,
        originalError: error instanceof Error ? error : new Error(String(error))
      };
      console.error('Failed to play note:', note, error);
    }
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
   */
  get isReady(): boolean {
    return this._isInitialized && this._isLoaded && !this.hasError && Tone.context.state === 'running';
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