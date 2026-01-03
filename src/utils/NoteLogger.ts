import { AudioEngine } from './AudioEngine';
import { debugLogger } from './debugLogger';

/**
 * Interface for a note entry in the log
 */
export interface NoteEntry {
  id: string;
  note: string;
  timestamp: number;
  velocity?: number;
  duration?: number;
}

/**
 * NoteLogger handles recording, storing, and replaying piano note sequences
 * Maintains chronological order and manages capacity limits
 */
export class NoteLogger {
  private _entries: NoteEntry[] = [];
  private _maxEntries: number = 1000; // Default maximum capacity
  private audioEngine: AudioEngine;
  private nextId: number = 1;

  constructor(audioEngine: AudioEngine, maxEntries: number = 1000) {
    this.audioEngine = audioEngine;
    this._maxEntries = maxEntries;
    debugLogger.info('NoteLogger: Initialized', { maxEntries });
  }

  /**
   * Get a copy of all note entries in chronological order
   */
  get entries(): NoteEntry[] {
    return [...this._entries];
  }

  /**
   * Get the maximum number of entries allowed
   */
  get maxEntries(): number {
    return this._maxEntries;
  }

  /**
   * Set the maximum number of entries allowed
   */
  set maxEntries(value: number) {
    if (value <= 0) {
      debugLogger.warn('NoteLogger: Invalid maxEntries value, must be positive', { value });
      return;
    }

    this._maxEntries = value;
    
    // Trim entries if current count exceeds new limit
    if (this._entries.length > this._maxEntries) {
      const removedCount = this._entries.length - this._maxEntries;
      this._entries = this._entries.slice(-this._maxEntries);
      debugLogger.info('NoteLogger: Trimmed entries due to capacity change', { 
        removedCount, 
        newMaxEntries: this._maxEntries,
        currentCount: this._entries.length 
      });
    }
  }

  /**
   * Log a note entry with current timestamp
   * @param note - The note that was played (e.g., 'C4', 'F#3')
   * @param velocity - Optional velocity/volume (0-1)
   */
  logNote(note: string, velocity?: number): void {
    if (!note || typeof note !== 'string') {
      debugLogger.warn('NoteLogger: Invalid note parameter', { note });
      return;
    }

    const timestamp = Date.now();
    const entry: NoteEntry = {
      id: `note_${this.nextId++}`,
      note,
      timestamp,
      velocity
    };

    // Add to the end of the array (chronological order)
    this._entries.push(entry);

    // Manage capacity - remove oldest entries if we exceed the limit
    if (this._entries.length > this._maxEntries) {
      const removedEntries = this._entries.splice(0, this._entries.length - this._maxEntries);
      debugLogger.debug('NoteLogger: Removed oldest entries due to capacity limit', { 
        removedCount: removedEntries.length,
        maxEntries: this._maxEntries,
        currentCount: this._entries.length
      });
    }

    debugLogger.debug('NoteLogger: Note logged', { 
      note, 
      velocity, 
      timestamp, 
      totalEntries: this._entries.length 
    });
  }

  /**
   * Clear all logged entries
   */
  clearLog(): void {
    const previousCount = this._entries.length;
    this._entries = [];
    this.nextId = 1; // Reset ID counter
    debugLogger.info('NoteLogger: Log cleared', { previousCount });
  }

  /**
   * Replay all logged notes in their original sequence and timing
   * @returns Promise that resolves when replay is complete
   */
  async replayLog(): Promise<void> {
    if (this._entries.length === 0) {
      debugLogger.info('NoteLogger: No entries to replay');
      return;
    }

    if (!this.audioEngine.isReady) {
      debugLogger.warn('NoteLogger: AudioEngine not ready, cannot replay log');
      throw new Error('Audio engine not ready for playback');
    }

    debugLogger.info('NoteLogger: Starting log replay', { 
      entryCount: this._entries.length,
      duration: this.getLogDuration()
    });

    // Get the first timestamp as reference point
    const startTimestamp = this._entries[0].timestamp;
    const replayStartTime = Date.now();

    // Schedule all notes based on their relative timing
    const promises: Promise<void>[] = [];

    for (const entry of this._entries) {
      const relativeDelay = entry.timestamp - startTimestamp;
      
      const promise = new Promise<void>((resolve) => {
        setTimeout(() => {
          try {
            this.audioEngine.playNote(entry.note, entry.velocity || 0.8);
            debugLogger.debug('NoteLogger: Replayed note', { 
              note: entry.note, 
              originalTimestamp: entry.timestamp,
              delay: relativeDelay
            });
          } catch (error) {
            debugLogger.error('NoteLogger: Failed to replay note', { 
              note: entry.note, 
              error 
            });
          }
          resolve();
        }, relativeDelay);
      });

      promises.push(promise);
    }

    // Wait for all notes to be scheduled
    await Promise.all(promises);
    
    const replayDuration = Date.now() - replayStartTime;
    debugLogger.info('NoteLogger: Log replay completed', { 
      entryCount: this._entries.length,
      replayDuration
    });
  }

  /**
   * Get the total duration of the logged sequence in milliseconds
   */
  getLogDuration(): number {
    if (this._entries.length < 2) {
      return 0;
    }

    const firstTimestamp = this._entries[0].timestamp;
    const lastTimestamp = this._entries[this._entries.length - 1].timestamp;
    return lastTimestamp - firstTimestamp;
  }

  /**
   * Get the count of logged entries
   */
  getEntryCount(): number {
    return this._entries.length;
  }

  /**
   * Export the log as a JSON string for saving/sharing
   */
  exportLog(): string {
    const exportData = {
      entries: this._entries,
      exportTimestamp: Date.now(),
      version: '1.0'
    };
    
    debugLogger.info('NoteLogger: Log exported', { 
      entryCount: this._entries.length,
      exportTimestamp: exportData.exportTimestamp
    });
    
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import a log from JSON string
   * @param jsonData - JSON string containing exported log data
   */
  importLog(jsonData: string): void {
    try {
      const importData = JSON.parse(jsonData);
      
      if (!importData.entries || !Array.isArray(importData.entries)) {
        throw new Error('Invalid log format: missing entries array');
      }

      // Validate entries format
      const validEntries: NoteEntry[] = [];
      for (const entry of importData.entries) {
        if (entry.note && typeof entry.note === 'string' && 
            entry.timestamp && typeof entry.timestamp === 'number') {
          validEntries.push({
            id: entry.id || `imported_${this.nextId++}`,
            note: entry.note,
            timestamp: entry.timestamp,
            velocity: entry.velocity,
            duration: entry.duration
          });
        }
      }

      this._entries = validEntries;
      
      // Ensure chronological order
      this._entries.sort((a, b) => a.timestamp - b.timestamp);
      
      // Apply capacity limit
      if (this._entries.length > this._maxEntries) {
        this._entries = this._entries.slice(-this._maxEntries);
      }

      debugLogger.info('NoteLogger: Log imported successfully', { 
        importedCount: validEntries.length,
        finalCount: this._entries.length
      });

    } catch (error) {
      debugLogger.error('NoteLogger: Failed to import log', { error });
      throw new Error(`Failed to import log: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get entries within a specific time range
   * @param startTime - Start timestamp (inclusive)
   * @param endTime - End timestamp (inclusive)
   */
  getEntriesInRange(startTime: number, endTime: number): NoteEntry[] {
    return this._entries.filter(entry => 
      entry.timestamp >= startTime && entry.timestamp <= endTime
    );
  }

  /**
   * Get the most recent N entries
   * @param count - Number of recent entries to return
   */
  getRecentEntries(count: number): NoteEntry[] {
    if (count <= 0) {
      return [];
    }
    
    return this._entries.slice(-count);
  }

  /**
   * Dispose of the logger and clean up resources
   */
  dispose(): void {
    this._entries = [];
    this.nextId = 1;
    debugLogger.info('NoteLogger: Disposed');
  }
}