import { AudioEngine } from './AudioEngine';
import { TimedNoteEvent } from './AudioRecorder';
import { debugLogger } from './debugLogger';

export interface PerformanceReplayError {
  type: 'AUDIO_ENGINE_UNAVAILABLE' | 'NO_NOTE_EVENTS' | 'REPLAY_FAILED' | 'INVALID_SPEED';
  message: string;
  originalError?: Error;
}

/**
 * PerformanceReplay recreates piano performances by playing back the exact notes
 * in their recorded sequence and timing, providing a different experience from audio playback
 */
export class PerformanceReplay {
  private audioEngine: AudioEngine;
  private _noteEvents: TimedNoteEvent[] = [];
  private _startTime = 0;
  private _endTime = 0;
  private _isReplaying = false;
  private _isPaused = false;
  private _replaySpeed = 1.0; // 1.0 = normal speed
  private _error: PerformanceReplayError | null = null;
  
  // Replay state management
  private replayTimeouts: number[] = [];
  private replayStartTime = 0;
  private pausedAt = 0;
  private currentEventIndex = 0;

  constructor(audioEngine: AudioEngine) {
    if (!audioEngine) {
      throw new Error('AudioEngine is required for PerformanceReplay');
    }
    
    this.audioEngine = audioEngine;
    debugLogger.info('PerformanceReplay: Initialized');
  }

  /**
   * Load note events for replay
   * @param noteEvents - Array of timed note events to replay
   */
  loadNoteEvents(noteEvents: TimedNoteEvent[]): void {
    if (!noteEvents || noteEvents.length === 0) {
      this._error = {
        type: 'NO_NOTE_EVENTS',
        message: 'No note events provided for replay'
      };
      throw new Error(this._error.message);
    }

    // Sort events by timestamp to ensure correct playback order
    this._noteEvents = [...noteEvents].sort((a, b) => a.timestamp - b.timestamp);
    
    // Calculate start and end times
    this._startTime = this._noteEvents[0].timestamp;
    this._endTime = this._noteEvents[this._noteEvents.length - 1].timestamp;
    
    // Clear any previous error
    this._error = null;
    
    debugLogger.info('PerformanceReplay: Note events loaded', {
      eventCount: this._noteEvents.length,
      startTime: this._startTime,
      endTime: this._endTime,
      duration: this._endTime - this._startTime
    });
  }

  /**
   * Start replaying the loaded note events
   */
  async startReplay(): Promise<void> {
    debugLogger.info('PerformanceReplay: Starting replay');

    try {
      // Validate prerequisites
      if (!this.audioEngine.isReady) {
        this._error = {
          type: 'AUDIO_ENGINE_UNAVAILABLE',
          message: 'Audio engine is not ready for playback'
        };
        throw new Error(this._error.message);
      }

      if (this._noteEvents.length === 0) {
        this._error = {
          type: 'NO_NOTE_EVENTS',
          message: 'No note events loaded for replay'
        };
        throw new Error(this._error.message);
      }

      // Stop any current replay
      if (this._isReplaying) {
        this.stopReplay();
      }

      // Clear any previous error
      this._error = null;

      // Initialize replay state
      this._isReplaying = true;
      this._isPaused = false;
      this.replayStartTime = Date.now();
      this.currentEventIndex = 0;
      this.pausedAt = 0;

      // Schedule all note events
      this.scheduleNoteEvents();

      debugLogger.info('PerformanceReplay: Replay started successfully', {
        eventCount: this._noteEvents.length,
        speed: this._replaySpeed,
        duration: (this._endTime - this._startTime) / this._replaySpeed
      });

    } catch (error) {
      this._isReplaying = false;
      debugLogger.error('PerformanceReplay: Failed to start replay', { error });
      throw error;
    }
  }

  /**
   * Schedule all note events for playback
   */
  private scheduleNoteEvents(): void {
    // Clear any existing timeouts
    this.clearTimeouts();

    const baseTimestamp = this._noteEvents[0].timestamp;

    for (let i = 0; i < this._noteEvents.length; i++) {
      const event = this._noteEvents[i];
      
      // Calculate delay from start, adjusted for replay speed
      const relativeDelay = (event.timestamp - baseTimestamp) / this._replaySpeed;
      
      const timeoutId = window.setTimeout(() => {
        if (this._isReplaying && !this._isPaused) {
          this.playNoteEvent(event, i);
        }
      }, relativeDelay);

      this.replayTimeouts.push(timeoutId);
    }

    // Schedule replay completion
    const totalDuration = (this._endTime - this._startTime) / this._replaySpeed;
    const completionTimeoutId = window.setTimeout(() => {
      if (this._isReplaying) {
        this.onReplayComplete();
      }
    }, totalDuration + 100); // Add small buffer

    this.replayTimeouts.push(completionTimeoutId);
  }

  /**
   * Play a single note event
   */
  private playNoteEvent(event: TimedNoteEvent, eventIndex: number): void {
    try {
      // Only play noteOn events for replay (noteOff events are handled by note duration)
      if (event.eventType === 'noteOn') {
        // Convert MIDI velocity (0-127) back to 0-1 range
        const velocity = event.velocity / 127;
        
        this.audioEngine.playNote(event.note, velocity);
        
        debugLogger.debug('PerformanceReplay: Note played', {
          note: event.note,
          velocity,
          timestamp: event.timestamp,
          eventIndex
        });
      }

      this.currentEventIndex = eventIndex;

    } catch (error) {
      debugLogger.error('PerformanceReplay: Failed to play note event', {
        event,
        eventIndex,
        error
      });
      
      // Don't stop the entire replay for individual note failures
      // Just log the error and continue
    }
  }

  /**
   * Handle replay completion
   */
  private onReplayComplete(): void {
    debugLogger.info('PerformanceReplay: Replay completed');
    
    this._isReplaying = false;
    this._isPaused = false;
    this.currentEventIndex = 0;
    this.clearTimeouts();
  }

  /**
   * Pause the current replay
   */
  pauseReplay(): void {
    if (!this._isReplaying || this._isPaused) {
      debugLogger.warn('PerformanceReplay: Cannot pause - not replaying or already paused');
      return;
    }

    debugLogger.info('PerformanceReplay: Pausing replay');
    
    this._isPaused = true;
    this.pausedAt = Date.now() - this.replayStartTime;
    
    // Clear all scheduled timeouts
    this.clearTimeouts();
  }

  /**
   * Resume a paused replay
   */
  resumeReplay(): void {
    if (!this._isReplaying || !this._isPaused) {
      debugLogger.warn('PerformanceReplay: Cannot resume - not replaying or not paused');
      return;
    }

    debugLogger.info('PerformanceReplay: Resuming replay', { pausedAt: this.pausedAt });
    
    this._isPaused = false;
    
    // Adjust replay start time to account for pause duration
    this.replayStartTime = Date.now() - this.pausedAt;
    
    // Reschedule remaining events
    this.scheduleRemainingEvents();
  }

  /**
   * Schedule remaining events after resume
   */
  private scheduleRemainingEvents(): void {
    this.clearTimeouts();

    const baseTimestamp = this._noteEvents[0].timestamp;
    const currentReplayTime = this.pausedAt * this._replaySpeed;

    for (let i = this.currentEventIndex; i < this._noteEvents.length; i++) {
      const event = this._noteEvents[i];
      const eventTime = event.timestamp - baseTimestamp;
      
      // Skip events that should have already played
      if (eventTime <= currentReplayTime) {
        continue;
      }
      
      // Calculate remaining delay
      const remainingDelay = (eventTime - currentReplayTime) / this._replaySpeed;
      
      const timeoutId = window.setTimeout(() => {
        if (this._isReplaying && !this._isPaused) {
          this.playNoteEvent(event, i);
        }
      }, remainingDelay);

      this.replayTimeouts.push(timeoutId);
    }

    // Schedule completion for remaining duration
    const totalDuration = (this._endTime - baseTimestamp) / this._replaySpeed;
    const remainingDuration = totalDuration - (currentReplayTime / this._replaySpeed);
    
    if (remainingDuration > 0) {
      const completionTimeoutId = window.setTimeout(() => {
        if (this._isReplaying) {
          this.onReplayComplete();
        }
      }, remainingDuration + 100);

      this.replayTimeouts.push(completionTimeoutId);
    }
  }

  /**
   * Stop the current replay
   */
  stopReplay(): void {
    debugLogger.info('PerformanceReplay: Stopping replay');
    
    this._isReplaying = false;
    this._isPaused = false;
    this.currentEventIndex = 0;
    this.pausedAt = 0;
    
    this.clearTimeouts();
  }

  /**
   * Clear all scheduled timeouts
   */
  private clearTimeouts(): void {
    this.replayTimeouts.forEach(timeoutId => {
      clearTimeout(timeoutId);
    });
    this.replayTimeouts = [];
  }

  /**
   * Set the replay speed
   * @param speed - Replay speed multiplier (0.5x to 2.0x)
   */
  setReplaySpeed(speed: number): void {
    if (speed < 0.5 || speed > 2.0) {
      this._error = {
        type: 'INVALID_SPEED',
        message: 'Replay speed must be between 0.5x and 2.0x'
      };
      throw new Error(this._error.message);
    }

    const wasReplaying = this._isReplaying;
    const wasPaused = this._isPaused;
    
    // If currently replaying, we need to restart with new speed
    if (wasReplaying) {
      const currentProgress = this.getCurrentProgress();
      this.stopReplay();
      
      this._replaySpeed = speed;
      
      // Restart from current position
      if (!wasPaused) {
        this.startReplayFromProgress(currentProgress);
      }
    } else {
      this._replaySpeed = speed;
    }

    debugLogger.info('PerformanceReplay: Speed changed', { 
      speed,
      wasReplaying,
      wasPaused
    });
  }

  /**
   * Start replay from a specific progress point (0-1)
   */
  private async startReplayFromProgress(progress: number): Promise<void> {
    const totalDuration = this._endTime - this._startTime;
    const startTime = this._startTime + (totalDuration * progress);
    
    // Filter events that should still play
    const remainingEvents = this._noteEvents.filter(event => event.timestamp >= startTime);
    
    if (remainingEvents.length === 0) {
      return;
    }

    // Temporarily replace events and start replay
    const originalEvents = this._noteEvents;
    this._noteEvents = remainingEvents;
    
    try {
      await this.startReplay();
    } finally {
      this._noteEvents = originalEvents;
    }
  }

  /**
   * Get current replay progress (0-1)
   */
  private getCurrentProgress(): number {
    if (!this._isReplaying) {
      return 0;
    }

    const totalDuration = this._endTime - this._startTime;
    const elapsed = this._isPaused ? this.pausedAt : (Date.now() - this.replayStartTime);
    const adjustedElapsed = elapsed * this._replaySpeed;
    
    return Math.min(1, adjustedElapsed / totalDuration);
  }

  /**
   * Get the current replay speed
   */
  get replaySpeed(): number {
    return this._replaySpeed;
  }

  /**
   * Check if currently replaying
   */
  get isReplaying(): boolean {
    return this._isReplaying;
  }

  /**
   * Check if currently paused
   */
  get isPaused(): boolean {
    return this._isPaused;
  }

  /**
   * Get the loaded note events
   */
  get noteEvents(): TimedNoteEvent[] {
    return [...this._noteEvents];
  }

  /**
   * Get the start time of the performance
   */
  get startTime(): number {
    return this._startTime;
  }

  /**
   * Get the end time of the performance
   */
  get endTime(): number {
    return this._endTime;
  }

  /**
   * Get the total duration in milliseconds
   */
  get duration(): number {
    return this._endTime - this._startTime;
  }

  /**
   * Get the current error state
   */
  get error(): PerformanceReplayError | null {
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
      case 'AUDIO_ENGINE_UNAVAILABLE':
        return 'Audio engine is not ready. Please wait for the piano to load.';
      case 'NO_NOTE_EVENTS':
        return 'No performance data available for replay.';
      case 'REPLAY_FAILED':
        return 'Failed to replay performance. Please try again.';
      case 'INVALID_SPEED':
        return 'Invalid replay speed. Speed must be between 0.5x and 2.0x.';
      default:
        return 'An unknown replay error occurred.';
    }
  }

  /**
   * Dispose of the performance replay and clean up resources
   */
  dispose(): void {
    debugLogger.info('PerformanceReplay: Disposing');
    
    // Stop any active replay
    if (this._isReplaying) {
      this.stopReplay();
    }

    // Clear all data
    this._noteEvents = [];
    this._error = null;
    this.clearTimeouts();
  }
}