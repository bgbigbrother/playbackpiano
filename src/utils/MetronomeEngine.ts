import * as Tone from 'tone';
import { debugLogger } from './debugLogger';

export interface MetronomeConfig {
  minBPM: number;
  maxBPM: number;
  defaultBPM: number;
  subdivision: '4n' | '8n' | '16n';
}

export interface MetronomeError {
  type: 'CONTEXT_UNAVAILABLE' | 'TRANSPORT_ERROR' | 'CLICK_SOUND_ERROR';
  message: string;
  originalError?: Error;
}

/**
 * MetronomeEngine manages metronome functionality using Tone.js Transport for precise timing
 * Provides start, stop, setBPM functionality with audio click generation
 */
export class MetronomeEngine {
  private _isActive = false;
  private _bpm = 100;
  private clickSound: Tone.Player | null = null;
  private _error: MetronomeError | null = null;
  private _isInitialized = false;
  private eventId: number | null = null;

  private readonly config: MetronomeConfig = {
    minBPM: 30,
    maxBPM: 300,
    defaultBPM: 100,
    subdivision: '4n'
  };

  constructor() {
    debugLogger.info('MetronomeEngine: Constructor called');
    this.initializeMetronome();
  }

  /**
   * Initialize the metronome with Tone.js Transport and click sound
   */
  private initializeMetronome(): void {
    try {
      debugLogger.info('MetronomeEngine: Initializing metronome');

      // Check if Tone.js context is available
      if (!Tone.context) {
        this._error = {
          type: 'CONTEXT_UNAVAILABLE',
          message: 'Tone.js audio context not available'
        };
        throw new Error(this._error.message);
      }

      // Set initial BPM on Transport
      Tone.Transport.bpm.value = this._bpm;
      debugLogger.info('MetronomeEngine: Transport BPM set', { bpm: this._bpm });

      // Create click sound using Tone.js Oscillator for reliability
      // Using a simple oscillator ensures we don't depend on external audio files
      this.createClickSound();

      this._isInitialized = true;
      debugLogger.info('MetronomeEngine: Initialization successful');
    } catch (error) {
      debugLogger.error('MetronomeEngine: Initialization failed', { error });
      this._error = {
        type: 'CONTEXT_UNAVAILABLE',
        message: 'Failed to initialize metronome',
        originalError: error instanceof Error ? error : new Error(String(error))
      };
      throw error;
    }
  }

  /**
   * Create a click sound using Tone.js Oscillator
   */
  private createClickSound(): void {
    try {
      // Create a simple click sound using an oscillator with envelope
      // This is more reliable than loading external audio files
      const oscillator = new Tone.Oscillator({
        frequency: 800, // High frequency for clear click
        type: 'square'
      });

      const envelope = new Tone.AmplitudeEnvelope({
        attack: 0.001,
        decay: 0.1,
        sustain: 0,
        release: 0.1
      });

      // Connect oscillator through envelope to destination
      oscillator.connect(envelope);
      envelope.toDestination();

      // Create a player-like interface for consistency
      this.clickSound = {
        start: () => {
          try {
            oscillator.start();
            envelope.triggerAttackRelease(0.1);
          } catch (error) {
            debugLogger.error('MetronomeEngine: Click sound start error', { error });
          }
        },
        dispose: () => {
          try {
            oscillator.dispose();
            envelope.dispose();
          } catch (error) {
            debugLogger.error('MetronomeEngine: Click sound dispose error', { error });
          }
        }
      } as any;

      debugLogger.info('MetronomeEngine: Click sound created successfully');
    } catch (error) {
      debugLogger.error('MetronomeEngine: Failed to create click sound', { error });
      this._error = {
        type: 'CLICK_SOUND_ERROR',
        message: 'Failed to create metronome click sound',
        originalError: error instanceof Error ? error : new Error(String(error))
      };
    }
  }

  /**
   * Start the metronome
   */
  start(): void {
    if (!this._isInitialized) {
      debugLogger.warn('MetronomeEngine: Cannot start - not initialized');
      return;
    }

    if (this._isActive) {
      debugLogger.info('MetronomeEngine: Already active, ignoring start request');
      return;
    }

    try {
      debugLogger.info('MetronomeEngine: Starting metronome', { bpm: this._bpm });

      // Handle suspended audio context
      if (Tone.context.state === 'suspended') {
        debugLogger.info('MetronomeEngine: Resuming audio context');
        Tone.start().then(() => {
          this.startInternal();
        }).catch((error) => {
          debugLogger.error('MetronomeEngine: Failed to resume audio context', { error });
          this._error = {
            type: 'CONTEXT_UNAVAILABLE',
            message: 'Audio context could not be resumed'
          };
        });
        return;
      }

      this.startInternal();
    } catch (error) {
      debugLogger.error('MetronomeEngine: Failed to start metronome', { error });
      this._error = {
        type: 'TRANSPORT_ERROR',
        message: 'Failed to start metronome',
        originalError: error instanceof Error ? error : new Error(String(error))
      };
    }
  }

  /**
   * Internal method to start the metronome
   */
  private startInternal(): void {
    try {
      // Schedule the click sound to play on every beat
      this.eventId = Tone.Transport.scheduleRepeat((time) => {
        try {
          // Create a new oscillator for each click to avoid conflicts
          const osc = new Tone.Oscillator({
            frequency: 800,
            type: 'square'
          }).toDestination();

          const env = new Tone.AmplitudeEnvelope({
            attack: 0.001,
            decay: 0.1,
            sustain: 0,
            release: 0.1
          }).toDestination();

          osc.connect(env);
          osc.start(time);
          env.triggerAttackRelease(0.1, time);

          // Clean up after the click
          setTimeout(() => {
            try {
              osc.dispose();
              env.dispose();
            } catch (error) {
              // Ignore cleanup errors
            }
          }, 200);
        } catch (error) {
          debugLogger.error('MetronomeEngine: Click generation error', { error });
        }
      }, this.config.subdivision, 0);

      // Start the transport
      Tone.Transport.start();
      this._isActive = true;

      // Clear any previous errors
      this._error = null;

      debugLogger.info('MetronomeEngine: Started successfully', { 
        bpm: this._bpm,
        eventId: this.eventId 
      });
    } catch (error) {
      debugLogger.error('MetronomeEngine: Internal start failed', { error });
      throw error;
    }
  }

  /**
   * Stop the metronome
   */
  stop(): void {
    if (!this._isActive) {
      debugLogger.info('MetronomeEngine: Already stopped, ignoring stop request');
      return;
    }

    try {
      debugLogger.info('MetronomeEngine: Stopping metronome');

      // Clear the scheduled event
      if (this.eventId !== null) {
        Tone.Transport.clear(this.eventId);
        this.eventId = null;
      }

      // Stop the transport
      Tone.Transport.stop();
      this._isActive = false;

      debugLogger.info('MetronomeEngine: Stopped successfully');
    } catch (error) {
      debugLogger.error('MetronomeEngine: Failed to stop metronome', { error });
      this._error = {
        type: 'TRANSPORT_ERROR',
        message: 'Failed to stop metronome',
        originalError: error instanceof Error ? error : new Error(String(error))
      };
    }
  }

  /**
   * Set the BPM (beats per minute)
   * @param bpm - The BPM value (30-300)
   */
  setBPM(bpm: number): void {
    // Validate BPM range
    if (bpm < this.config.minBPM || bpm > this.config.maxBPM) {
      debugLogger.warn('MetronomeEngine: BPM out of range, clamping', { 
        requested: bpm, 
        min: this.config.minBPM, 
        max: this.config.maxBPM 
      });
      bpm = Math.max(this.config.minBPM, Math.min(this.config.maxBPM, bpm));
    }

    try {
      debugLogger.info('MetronomeEngine: Setting BPM', { oldBPM: this._bpm, newBPM: bpm });

      this._bpm = bpm;
      
      // Update Transport BPM immediately (works even during playback)
      Tone.Transport.bpm.value = bpm;

      debugLogger.info('MetronomeEngine: BPM updated successfully', { bpm });
    } catch (error) {
      debugLogger.error('MetronomeEngine: Failed to set BPM', { error, bpm });
      this._error = {
        type: 'TRANSPORT_ERROR',
        message: `Failed to set BPM to ${bpm}`,
        originalError: error instanceof Error ? error : new Error(String(error))
      };
    }
  }

  /**
   * Get the current active state
   */
  get isActive(): boolean {
    return this._isActive;
  }

  /**
   * Get the current BPM
   */
  get bpm(): number {
    return this._bpm;
  }

  /**
   * Get the BPM configuration limits
   */
  get bpmRange(): { min: number; max: number } {
    return {
      min: this.config.minBPM,
      max: this.config.maxBPM
    };
  }

  /**
   * Get the current error state
   */
  get error(): MetronomeError | null {
    return this._error;
  }

  /**
   * Check if there's an active error
   */
  get hasError(): boolean {
    return this._error !== null;
  }

  /**
   * Check if the metronome is ready for use
   */
  get isReady(): boolean {
    return this._isInitialized && !this.hasError;
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
        return 'Audio system not available. Please try refreshing the page.';
      case 'TRANSPORT_ERROR':
        return 'Metronome timing error. Please try restarting the metronome.';
      case 'CLICK_SOUND_ERROR':
        return 'Could not create metronome sound. Audio may not be available.';
      default:
        return 'An unknown metronome error occurred.';
    }
  }

  /**
   * Dispose of the metronome and clean up resources
   */
  dispose(): void {
    try {
      debugLogger.info('MetronomeEngine: Disposing resources');

      // Stop if active
      if (this._isActive) {
        this.stop();
      }

      // Clean up click sound
      if (this.clickSound) {
        this.clickSound.dispose();
        this.clickSound = null;
      }

      // Clear any scheduled events
      if (this.eventId !== null) {
        Tone.Transport.clear(this.eventId);
        this.eventId = null;
      }

      this._isInitialized = false;
      this._error = null;

      debugLogger.info('MetronomeEngine: Disposal complete');
    } catch (error) {
      debugLogger.error('MetronomeEngine: Error during disposal', { error });
    }
  }
}