import { debugLogger } from './debugLogger';
import { NoteLogger } from './NoteLogger';
import { PerformanceReplay } from './PerformanceReplay';
import { AudioEngine } from './AudioEngine';
import { MP3Converter, type MP3ConversionConfig, type MP3ConversionProgress } from './MP3Converter';

export interface AudioRecorderError {
  type: 'MEDIA_RECORDER_UNAVAILABLE' | 'PERMISSION_DENIED' | 'RECORDING_FAILED' | 'PLAYBACK_FAILED' | 'EXPORT_FAILED';
  message: string;
  originalError?: Error;
}

export interface TimedNoteEvent {
  note: string;
  timestamp: number; // milliseconds from recording start
  velocity: number; // 0-127 MIDI velocity
  duration: number; // note duration in milliseconds
  eventType: 'noteOn' | 'noteOff';
}

export interface RecordingSession {
  audioBlob: Blob;
  noteEvents: TimedNoteEvent[];
  startTime: number;
  endTime: number;
  duration: number;
}

export interface RecordingConfig {
  mimeType: string;
  audioBitsPerSecond: number;
  sampleRate: number;
  channelCount: number;
  maxDuration: number; // seconds
  enableMP3Export: boolean; // Enable MP3 conversion for downloads
  mp3Config?: MP3ConversionConfig; // MP3 conversion settings
}

/**
 * AudioRecorder manages audio recording using the Web Audio API MediaRecorder
 * Handles recording, playback, replay, and export functionality with comprehensive error handling
 * Integrates with NoteLogger to track note events during recording for performance replay
 */
export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioStream: MediaStream | null = null;
  private recordedChunks: Blob[] = [];
  private _recordedBlob: Blob | null = null;
  private _isRecording = false;
  private _duration = 0;
  private startTime = 0;
  private durationInterval: number | null = null;
  private _error: AudioRecorderError | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private config: RecordingConfig;
  
  // Note event tracking for performance replay
  private _recordedNotes: TimedNoteEvent[] = [];
  private _recordingStartTime = 0;
  private _isTrackingNotes = false;
  private noteLogger: NoteLogger | null = null;
  private performanceReplay: PerformanceReplay | null = null;
  // MP3 conversion functionality
  private mp3Converter: MP3Converter | null = null;
  private _isConvertingToMP3 = false;
  private _conversionProgress: MP3ConversionProgress | null = null;
  private audioEngine: AudioEngine | null = null;

  // Supported MIME types in order of preference
  private static readonly SUPPORTED_MIME_TYPES = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/wav'
  ];

  constructor(config?: Partial<RecordingConfig>, noteLogger?: NoteLogger, audioEngine?: AudioEngine) {
    debugLogger.info('AudioRecorder: Constructor called');
    
    // Set default configuration with fallbacks
    this.config = {
      mimeType: this.getSupportedMimeType(),
      audioBitsPerSecond: 128000, // 128 kbps
      sampleRate: 44100, // CD quality
      channelCount: 2, // Stereo
      maxDuration: 300, // 5 minutes max
      enableMP3Export: true, // Enable MP3 export by default
      mp3Config: {
        bitRate: 128,
        quality: 2,
        sampleRate: 44100,
        channels: 2
      },
      ...config
    };

    // Set note logger for tracking note events during recording
    this.noteLogger = noteLogger || null;
    
    // Set audio engine for performance replay and audio capture
    this.audioEngine = audioEngine || null;
    if (this.audioEngine) {
      this.performanceReplay = new PerformanceReplay(this.audioEngine);
    }

    // Initialize MP3 converter if enabled
    if (this.config.enableMP3Export && MP3Converter.isSupported()) {
      this.mp3Converter = new MP3Converter(
        this.config.mp3Config,
        (progress) => {
          this._conversionProgress = progress;
          debugLogger.debug('AudioRecorder: MP3 conversion progress', progress);
        }
      );
    }

    debugLogger.info('AudioRecorder: Configuration set', { 
      config: this.config,
      hasNoteLogger: !!this.noteLogger,
      hasAudioEngine: !!this.audioEngine,
      hasPerformanceReplay: !!this.performanceReplay,
      hasMP3Converter: !!this.mp3Converter,
      mp3Supported: MP3Converter.isSupported()
    });
  }

  /**
   * Get the best supported MIME type for recording
   */
  private getSupportedMimeType(): string {
    if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) {
      debugLogger.warn('AudioRecorder: MediaRecorder.isTypeSupported not available, using fallback');
      return 'audio/webm'; // Fallback
    }

    for (const mimeType of AudioRecorder.SUPPORTED_MIME_TYPES) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        debugLogger.info('AudioRecorder: Selected MIME type', { mimeType });
        return mimeType;
      }
    }

    debugLogger.warn('AudioRecorder: No supported MIME types found, using fallback');
    return 'audio/webm'; // Fallback
  }

  /**
   * Start recording audio from the Tone.js audio output (preferred) or microphone (fallback)
   */
  async startRecording(): Promise<void> {
    debugLogger.info('AudioRecorder: Starting recording');

    try {
      // Check if MediaRecorder is available
      if (!window.MediaRecorder) {
        this._error = {
          type: 'MEDIA_RECORDER_UNAVAILABLE',
          message: 'MediaRecorder API is not supported in this browser'
        };
        throw new Error(this._error.message);
      }

      // Check if already recording
      if (this._isRecording) {
        debugLogger.warn('AudioRecorder: Already recording, ignoring start request');
        return;
      }

      // Clear any previous error
      this._error = null;

      // Try to create audio stream from Tone.js output first, fallback to microphone
      try {
        this.audioStream = await this.createToneAudioStream();
        debugLogger.info('AudioRecorder: Using Tone.js audio stream for recording');
      } catch (toneError) {
        debugLogger.warn('AudioRecorder: Failed to create Tone.js audio stream, falling back to microphone', { toneError });
        
        // Fallback to microphone recording
        try {
          this.audioStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              sampleRate: this.config.sampleRate,
              channelCount: this.config.channelCount,
              echoCancellation: false, // Preserve natural piano sound
              noiseSuppression: false, // Preserve natural piano sound
              autoGainControl: false // Preserve natural dynamics
            }
          });
          debugLogger.info('AudioRecorder: Using microphone audio stream for recording');
        } catch (micError) {
          debugLogger.error('AudioRecorder: Failed to access both Tone.js output and microphone', { toneError, micError });
          this._error = {
            type: 'PERMISSION_DENIED',
            message: 'Failed to access audio. Please ensure the piano is loaded or allow microphone access.',
            originalError: micError instanceof Error ? micError : new Error(String(micError))
          };
          throw this._error;
        }
      }

      // Create MediaRecorder with optimal settings
      try {
        const options: MediaRecorderOptions = {
          mimeType: this.config.mimeType,
          audioBitsPerSecond: this.config.audioBitsPerSecond
        };

        this.mediaRecorder = new MediaRecorder(this.audioStream, options);
        debugLogger.info('AudioRecorder: MediaRecorder created', { options });
      } catch (error) {
        debugLogger.error('AudioRecorder: Failed to create MediaRecorder', { error });
        
        // Try fallback without specific options
        try {
          this.mediaRecorder = new MediaRecorder(this.audioStream);
          debugLogger.info('AudioRecorder: MediaRecorder created with fallback options');
        } catch (fallbackError) {
          this._error = {
            type: 'MEDIA_RECORDER_UNAVAILABLE',
            message: 'Failed to create MediaRecorder with any configuration',
            originalError: fallbackError instanceof Error ? fallbackError : new Error(String(fallbackError))
          };
          throw this._error;
        }
      }

      // Set up event handlers
      this.setupMediaRecorderEvents();

      // Clear previous recording data
      this.recordedChunks = [];
      this._recordedBlob = null;
      this._duration = 0;

      // Initialize note event tracking
      this.startNoteEventTracking();

      // Start recording
      this.mediaRecorder.start(100); // Collect data every 100ms for smooth progress
      this._isRecording = true;
      this.startTime = Date.now();

      // Start duration tracking
      this.startDurationTracking();

      debugLogger.info('AudioRecorder: Recording started successfully');

    } catch (error) {
      // Clean up on failure
      this.cleanup();
      debugLogger.error('AudioRecorder: Failed to start recording', { error });
      throw error;
    }
  }

  /**
   * Create an audio stream from Tone.js output
   */
  private async createToneAudioStream(): Promise<MediaStream> {
    // Import Tone.js - since it's already used in AudioEngine, we can import it directly
    const Tone = await import('tone');
    
    if (!Tone.context || Tone.context.state === 'suspended') {
      // Try to start the audio context
      await Tone.start();
    }

    if (!Tone.context || Tone.context.state !== 'running') {
      throw new Error('Tone.js audio context is not available or not running. Please ensure the piano is loaded and try playing a note first.');
    }

    // Get the raw AudioContext from Tone.js
    const audioContext = Tone.context.rawContext || Tone.context;
    
    // Ensure we have a proper AudioContext (not OfflineAudioContext)
    if (!('createMediaStreamDestination' in audioContext)) {
      throw new Error('Audio context does not support MediaStreamDestination (offline context detected)');
    }
    
    // Create a MediaStreamDestination node to capture audio output
    const destination = (audioContext as AudioContext).createMediaStreamDestination();
    
    // Connect Tone.js master output to our destination
    // We need to tap into the audio output without disrupting normal playback
    if (Tone.Destination) {
      // Create a gain node to split the signal
      const splitter = audioContext.createGain();
      splitter.gain.value = 1.0;
      
      // Connect Tone's destination to our splitter
      Tone.Destination.connect(splitter);
      
      // Connect splitter to both the original destination and our recorder
      splitter.connect(audioContext.destination);
      splitter.connect(destination);
    } else {
      throw new Error('Tone.js Destination is not available');
    }

    debugLogger.info('AudioRecorder: Created Tone.js audio stream', {
      contextState: Tone.context.state,
      sampleRate: audioContext.sampleRate,
      streamTracks: destination.stream.getTracks().length
    });

    return destination.stream;
  }

  /**
   * Start tracking note events during recording
   */
  private startNoteEventTracking(): void {
    this._recordedNotes = [];
    this._recordingStartTime = Date.now();
    this._isTrackingNotes = true;
    
    debugLogger.info('AudioRecorder: Note event tracking started', {
      startTime: this._recordingStartTime,
      hasNoteLogger: !!this.noteLogger
    });
  }

  /**
   * Stop tracking note events
   */
  private stopNoteEventTracking(): void {
    this._isTrackingNotes = false;
    
    debugLogger.info('AudioRecorder: Note event tracking stopped', {
      recordedNotesCount: this._recordedNotes.length,
      duration: this._duration
    });
  }

  /**
   * Track a note event during recording
   * This method should be called by the piano interface when notes are played
   * @param note - The note that was played (e.g., 'C4', 'F#3')
   * @param velocity - The velocity/volume (0-1, will be converted to 0-127 MIDI range)
   * @param eventType - Whether this is a note on or note off event
   */
  trackNoteEvent(note: string, velocity: number = 0.8, eventType: 'noteOn' | 'noteOff' = 'noteOn'): void {
    if (!this._isTrackingNotes || !this._isRecording) {
      return;
    }

    const timestamp = Date.now() - this._recordingStartTime;
    const midiVelocity = Math.round(velocity * 127); // Convert 0-1 to 0-127 MIDI range

    const noteEvent: TimedNoteEvent = {
      note,
      timestamp,
      velocity: midiVelocity,
      duration: 0, // Will be calculated when noteOff is received
      eventType
    };

    // If this is a noteOff event, try to find the corresponding noteOn and calculate duration
    if (eventType === 'noteOff') {
      const noteOnIndex = this._recordedNotes.findIndex(
        event => event.note === note && event.eventType === 'noteOn' && event.duration === 0
      );
      
      if (noteOnIndex !== -1) {
        // Update the duration of the noteOn event
        this._recordedNotes[noteOnIndex].duration = timestamp - this._recordedNotes[noteOnIndex].timestamp;
        debugLogger.debug('AudioRecorder: Updated note duration', {
          note,
          duration: this._recordedNotes[noteOnIndex].duration
        });
      }
    }

    this._recordedNotes.push(noteEvent);

    debugLogger.debug('AudioRecorder: Note event tracked', {
      note,
      timestamp,
      velocity: midiVelocity,
      eventType,
      totalEvents: this._recordedNotes.length
    });
  }

  /**
   * Get the recorded note events
   */
  get recordedNotes(): TimedNoteEvent[] {
    return [...this._recordedNotes];
  }

  /**
   * Check if note tracking is active
   */
  get isTrackingNotes(): boolean {
    return this._isTrackingNotes;
  }
  private setupMediaRecorderEvents(): void {
    if (!this.mediaRecorder) return;

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        this.recordedChunks.push(event.data);
        debugLogger.debug('AudioRecorder: Data chunk received', { size: event.data.size });
      }
    };

    this.mediaRecorder.onstop = () => {
      debugLogger.info('AudioRecorder: Recording stopped');
      this._isRecording = false;
      this.stopDurationTracking();

      // Create blob from recorded chunks
      if (this.recordedChunks.length > 0) {
        this._recordedBlob = new Blob(this.recordedChunks, { 
          type: this.config.mimeType 
        });
        debugLogger.info('AudioRecorder: Recording blob created', { 
          size: this._recordedBlob.size,
          type: this._recordedBlob.type,
          duration: this._duration
        });
      }
    };

    this.mediaRecorder.onerror = (event) => {
      debugLogger.error('AudioRecorder: MediaRecorder error', { event });
      this._error = {
        type: 'RECORDING_FAILED',
        message: 'Recording failed due to an internal error',
        originalError: new Error('MediaRecorder error event')
      };
      this.stopRecording();
    };
  }

  /**
   * Start tracking recording duration
   */
  private startDurationTracking(): void {
    this.durationInterval = window.setInterval(() => {
      if (this._isRecording) {
        this._duration = (Date.now() - this.startTime) / 1000;
        
        // Check for maximum duration
        if (this._duration >= this.config.maxDuration) {
          debugLogger.warn('AudioRecorder: Maximum duration reached, stopping recording');
          this.stopRecording();
        }
      }
    }, 100);
  }

  /**
   * Stop tracking recording duration
   */
  private stopDurationTracking(): void {
    if (this.durationInterval) {
      clearInterval(this.durationInterval);
      this.durationInterval = null;
    }
  }

  /**
   * Stop recording audio
   */
  stopRecording(): void {
    debugLogger.info('AudioRecorder: Stopping recording');

    try {
      if (this.mediaRecorder && this._isRecording) {
        this.mediaRecorder.stop();
      }
      
      // Stop note event tracking
      this.stopNoteEventTracking();
      
      this.cleanup();
      
    } catch (error) {
      debugLogger.error('AudioRecorder: Error stopping recording', { error });
      this._error = {
        type: 'RECORDING_FAILED',
        message: 'Failed to stop recording properly',
        originalError: error instanceof Error ? error : new Error(String(error))
      };
    }
  }

  /**
   * Replay the recorded performance by recreating the exact notes in their recorded sequence and timing
   */
  async replayPerformance(): Promise<void> {
    debugLogger.info('AudioRecorder: Starting performance replay');

    try {
      if (!this.performanceReplay) {
        throw new Error('Performance replay not available - AudioEngine not provided');
      }

      if (!this._recordedBlob) {
        throw new Error('No recording available to replay');
      }

      if (this._recordedNotes.length === 0) {
        throw new Error('No note events recorded for replay');
      }

      // Load the recorded note events into the performance replay engine
      this.performanceReplay.loadNoteEvents(this._recordedNotes);

      // Start the performance replay
      await this.performanceReplay.startReplay();

      debugLogger.info('AudioRecorder: Performance replay started successfully', {
        noteCount: this._recordedNotes.length,
        duration: this._duration
      });

    } catch (error) {
      debugLogger.error('AudioRecorder: Failed to replay performance', { error });
      this._error = {
        type: 'PLAYBACK_FAILED',
        message: 'Failed to replay recorded performance',
        originalError: error instanceof Error ? error : new Error(String(error))
      };
      throw this._error;
    }
  }

  /**
   * Stop the current performance replay
   */
  stopPerformanceReplay(): void {
    if (this.performanceReplay) {
      this.performanceReplay.stopReplay();
      debugLogger.info('AudioRecorder: Performance replay stopped');
    }
  }

  /**
   * Pause the current performance replay
   */
  pausePerformanceReplay(): void {
    if (this.performanceReplay) {
      this.performanceReplay.pauseReplay();
      debugLogger.info('AudioRecorder: Performance replay paused');
    }
  }

  /**
   * Resume a paused performance replay
   */
  resumePerformanceReplay(): void {
    if (this.performanceReplay) {
      this.performanceReplay.resumeReplay();
      debugLogger.info('AudioRecorder: Performance replay resumed');
    }
  }

  /**
   * Set the performance replay speed
   * @param speed - Replay speed multiplier (0.5x to 2.0x)
   */
  setPerformanceReplaySpeed(speed: number): void {
    if (this.performanceReplay) {
      this.performanceReplay.setReplaySpeed(speed);
      debugLogger.info('AudioRecorder: Performance replay speed set', { speed });
    }
  }

  /**
   * Check if performance replay is currently active
   */
  get isReplayingPerformance(): boolean {
    return this.performanceReplay?.isReplaying || false;
  }

  /**
   * Check if performance replay is currently paused
   */
  get isPerformanceReplayPaused(): boolean {
    return this.performanceReplay?.isPaused || false;
  }

  /**
   * Get the current performance replay speed
   */
  get performanceReplaySpeed(): number {
    return this.performanceReplay?.replaySpeed || 1.0;
  }

  /**
   * Check if performance replay is available
   */
  get canReplayPerformance(): boolean {
    return !!(this.performanceReplay && this._recordedBlob && this._recordedNotes.length > 0);
  }
  playRecording(): void {
    debugLogger.info('AudioRecorder: Playing recording');

    try {
      if (!this._recordedBlob) {
        throw new Error('No recording available to play');
      }

      // Stop any currently playing audio
      if (this.audioElement) {
        this.audioElement.pause();
        this.audioElement.currentTime = 0;
      }

      // Create audio element for playback
      this.audioElement = new Audio();
      this.audioElement.src = URL.createObjectURL(this._recordedBlob);
      
      // Set up playback event handlers
      this.audioElement.onended = () => {
        debugLogger.info('AudioRecorder: Playback finished');
        if (this.audioElement?.src) {
          URL.revokeObjectURL(this.audioElement.src);
        }
      };

      this.audioElement.onerror = (error) => {
        debugLogger.error('AudioRecorder: Playback error', { error });
        this._error = {
          type: 'PLAYBACK_FAILED',
          message: 'Failed to play recorded audio',
          originalError: new Error('Audio playback error')
        };
      };

      // Start playback
      this.audioElement.play().catch((error) => {
        debugLogger.error('AudioRecorder: Failed to start playback', { error });
        this._error = {
          type: 'PLAYBACK_FAILED',
          message: 'Failed to start audio playback',
          originalError: error instanceof Error ? error : new Error(String(error))
        };
      });

    } catch (error) {
      debugLogger.error('AudioRecorder: Failed to play recording', { error });
      this._error = {
        type: 'PLAYBACK_FAILED',
        message: 'Failed to play recorded audio',
        originalError: error instanceof Error ? error : new Error(String(error))
      };
    }
  }

  /**
   * Download the recorded audio as a file with optional MP3 conversion
   * @param forceMP3 - Force MP3 conversion even if not enabled by default
   * @param customMP3Config - Custom MP3 configuration for this download
   */
  async downloadRecording(forceMP3: boolean = false, customMP3Config?: Partial<MP3ConversionConfig>): Promise<void> {
    debugLogger.info('AudioRecorder: Starting download', { forceMP3, customMP3Config });

    try {
      if (!this._recordedBlob) {
        throw new Error('No recording available to download');
      }

      // Determine if we should convert to MP3
      const shouldConvertToMP3 = (this.config.enableMP3Export || forceMP3) && 
                                 this.mp3Converter && 
                                 MP3Converter.isSupported();

      let downloadBlob = this._recordedBlob;
      let filename = this.generateFilename();

      if (shouldConvertToMP3) {
        try {
          debugLogger.info('AudioRecorder: Converting to MP3 before download');
          this._isConvertingToMP3 = true;
          this._conversionProgress = null;

          // Use custom config if provided, otherwise use default
          const conversionConfig = customMP3Config ? 
            { ...this.config.mp3Config, ...customMP3Config } : 
            this.config.mp3Config;

          const conversionResult = await this.mp3Converter!.convertToMP3(this._recordedBlob, conversionConfig);

          if (conversionResult.success && conversionResult.mp3Blob) {
            downloadBlob = conversionResult.mp3Blob;
            filename = this.generateFilename('mp3');
            
            debugLogger.info('AudioRecorder: MP3 conversion successful', {
              originalSize: conversionResult.originalSize,
              compressedSize: conversionResult.compressedSize,
              compressionRatio: conversionResult.compressionRatio
            });
          } else {
            // MP3 conversion failed, fall back to original format with notification
            debugLogger.warn('AudioRecorder: MP3 conversion failed, using original format', {
              error: conversionResult.error
            });
            
            // Update filename to indicate original format
            filename = this.generateFilename() + ' (original-format)';
            
            // Set error for user notification
            this._error = {
              type: 'EXPORT_FAILED',
              message: `MP3 conversion failed: ${conversionResult.error}. Downloaded in original format.`,
              originalError: new Error(conversionResult.error)
            };
          }

        } catch (conversionError) {
          debugLogger.error('AudioRecorder: MP3 conversion error', { conversionError });
          
          // Fall back to original format
          filename = this.generateFilename() + ' (conversion-failed)';
          
          this._error = {
            type: 'EXPORT_FAILED',
            message: `MP3 conversion failed: ${conversionError instanceof Error ? conversionError.message : String(conversionError)}. Downloaded in original format.`,
            originalError: conversionError instanceof Error ? conversionError : new Error(String(conversionError))
          };
        } finally {
          this._isConvertingToMP3 = false;
          this._conversionProgress = null;
        }
      }

      // Perform the download
      await this.performDownload(downloadBlob, filename);
      
      debugLogger.info('AudioRecorder: Download completed successfully', { 
        filename,
        size: downloadBlob.size,
        type: downloadBlob.type,
        convertedToMP3: shouldConvertToMP3 && downloadBlob !== this._recordedBlob
      });

    } catch (error) {
      debugLogger.error('AudioRecorder: Failed to download recording', { error });
      this._error = {
        type: 'EXPORT_FAILED',
        message: 'Failed to download recorded audio',
        originalError: error instanceof Error ? error : new Error(String(error))
      };
      throw this._error;
    }
  }

  /**
   * Download the recorded audio in its original format (no conversion)
   */
  async downloadOriginalFormat(): Promise<void> {
    debugLogger.info('AudioRecorder: Downloading in original format');

    try {
      if (!this._recordedBlob) {
        throw new Error('No recording available to download');
      }

      const filename = this.generateFilename();
      await this.performDownload(this._recordedBlob, filename);
      
      debugLogger.info('AudioRecorder: Original format download completed', { 
        filename,
        size: this._recordedBlob.size,
        type: this._recordedBlob.type
      });

    } catch (error) {
      debugLogger.error('AudioRecorder: Failed to download original format', { error });
      this._error = {
        type: 'EXPORT_FAILED',
        message: 'Failed to download recorded audio in original format',
        originalError: error instanceof Error ? error : new Error(String(error))
      };
      throw this._error;
    }
  }

  /**
   * Perform the actual file download
   */
  private async performDownload(blob: Blob, filename: string): Promise<void> {
    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up URL after a short delay
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /**
   * Generate filename with timestamp and appropriate extension
   */
  private generateFilename(forceExtension?: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const extension = forceExtension || this.getFileExtension();
    return `piano-recording-${timestamp}.${extension}`;
  }

  /**
   * Get appropriate file extension based on MIME type
   */
  private getFileExtension(): string {
    const mimeType = this.config.mimeType.toLowerCase();
    
    if (mimeType.includes('webm')) return 'webm';
    if (mimeType.includes('mp4')) return 'mp4';
    if (mimeType.includes('wav')) return 'wav';
    if (mimeType.includes('ogg')) return 'ogg';
    
    return 'webm'; // Default fallback
  }

  /**
   * Clear the current recording
   */
  clearRecording(): void {
    debugLogger.info('AudioRecorder: Clearing recording');
    
    // Stop playback if active
    if (this.audioElement) {
      this.audioElement.pause();
      if (this.audioElement.src) {
        URL.revokeObjectURL(this.audioElement.src);
      }
      this.audioElement = null;
    }

    // Clear recording data
    this.recordedChunks = [];
    this._recordedBlob = null;
    this._duration = 0;
    
    // Clear note events
    this._recordedNotes = [];
    this._isTrackingNotes = false;
    
    // Clear any playback errors (keep recording errors)
    if (this._error?.type === 'PLAYBACK_FAILED' || this._error?.type === 'EXPORT_FAILED') {
      this._error = null;
    }
  }

  /**
   * Clean up resources
   */
  private cleanup(): void {
    // Stop duration tracking
    this.stopDurationTracking();

    // Stop audio stream
    if (this.audioStream) {
      this.audioStream.getTracks().forEach(track => {
        track.stop();
        debugLogger.debug('AudioRecorder: Audio track stopped');
      });
      this.audioStream = null;
    }

    // Clean up MediaRecorder
    this.mediaRecorder = null;
  }

  /**
   * Get the current recording state
   */
  get isRecording(): boolean {
    return this._isRecording;
  }

  /**
   * Get the recorded audio blob
   */
  get recordedBlob(): Blob | null {
    return this._recordedBlob;
  }

  /**
   * Get the current recording duration in seconds
   */
  get duration(): number {
    return this._duration;
  }

  /**
   * Get the complete recording session data including audio and note events
   */
  getRecordingSession(): RecordingSession | null {
    if (!this._recordedBlob) {
      return null;
    }

    return {
      audioBlob: this._recordedBlob,
      noteEvents: [...this._recordedNotes],
      startTime: this._recordingStartTime,
      endTime: this._recordingStartTime + (this._duration * 1000),
      duration: this._duration
    };
  }

  /**
   * Check if there are recorded note events available
   */
  get hasRecordedNotes(): boolean {
    return this._recordedNotes.length > 0;
  }
  /**
   * Check if MP3 conversion is supported and enabled
   */
  get canConvertToMP3(): boolean {
    return !!(this.config.enableMP3Export && this.mp3Converter && MP3Converter.isSupported());
  }

  /**
   * Check if MP3 conversion is currently in progress
   */
  get isConvertingToMP3(): boolean {
    return this._isConvertingToMP3;
  }

  /**
   * Get the current MP3 conversion progress
   */
  get conversionProgress(): MP3ConversionProgress | null {
    return this._conversionProgress;
  }

  /**
   * Update MP3 conversion configuration
   */
  updateMP3Config(config: Partial<MP3ConversionConfig>): void {
    if (this.config.mp3Config) {
      this.config.mp3Config = { ...this.config.mp3Config, ...config };
      
      if (this.mp3Converter) {
        this.mp3Converter.updateConfig(config);
      }
      
      debugLogger.info('AudioRecorder: MP3 configuration updated', { config: this.config.mp3Config });
    }
  }

  /**
   * Get the current MP3 configuration
   */
  getMP3Config(): MP3ConversionConfig | undefined {
    return this.config.mp3Config ? { ...this.config.mp3Config } : undefined;
  }

  /**
   * Enable or disable MP3 export functionality
   */
  setMP3ExportEnabled(enabled: boolean): void {
    this.config.enableMP3Export = enabled;
    
    if (enabled && !this.mp3Converter && MP3Converter.isSupported()) {
      // Initialize MP3 converter if not already done
      this.mp3Converter = new MP3Converter(
        this.config.mp3Config,
        (progress) => {
          this._conversionProgress = progress;
          debugLogger.debug('AudioRecorder: MP3 conversion progress', progress);
        }
      );
    }
    
    debugLogger.info('AudioRecorder: MP3 export enabled state changed', { 
      enabled, 
      hasConverter: !!this.mp3Converter,
      supported: MP3Converter.isSupported()
    });
  }

  get hasRecording(): boolean {
    return this._recordedBlob !== null;
  }

  /**
   * Get the current error state
   */
  get error(): AudioRecorderError | null {
    return this._error;
  }

  /**
   * Check if there's an active error
   */
  get hasError(): boolean {
    return this._error !== null;
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
      case 'MEDIA_RECORDER_UNAVAILABLE':
        return 'Audio recording is not supported in this browser. Please try a different browser.';
      case 'PERMISSION_DENIED':
        return 'Microphone access denied. Please allow microphone access to record audio.';
      case 'RECORDING_FAILED':
        return 'Recording failed. Please try again.';
      case 'PLAYBACK_FAILED':
        return 'Failed to play recorded audio. Please try again.';
      case 'EXPORT_FAILED':
        return 'Failed to download recording. Please try again.';
      default:
        return 'An unknown recording error occurred.';
    }
  }

  /**
   * Check if recording is supported in the current browser
   */
  static isSupported(): boolean {
    return !!(window.MediaRecorder && navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  /**
   * Dispose of the audio recorder and clean up all resources
   */
  dispose(): void {
    debugLogger.info('AudioRecorder: Disposing');
    
    // Stop recording if active
    if (this._isRecording) {
      this.stopRecording();
    }

    // Stop performance replay if active
    if (this.performanceReplay) {
      this.performanceReplay.dispose();
      this.performanceReplay = null;
    }

    // Clear recording
    this.clearRecording();

    // Clean up resources
    this.cleanup();

    // Reset state
    this._error = null;
    this._recordedNotes = [];
    this._isTrackingNotes = false;
    this.noteLogger = null;
    this.audioEngine = null;
    
    // Clean up MP3 converter
    this.mp3Converter = null;
    this._isConvertingToMP3 = false;
    this._conversionProgress = null;
  }
}