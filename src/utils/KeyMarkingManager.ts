import { AudioEngine } from './AudioEngine';
import { debugLogger } from './debugLogger';

/**
 * KeyMarkingManager handles the logic for marking piano keys and playing them simultaneously
 * Integrates with the existing AudioEngine for sound playback
 */
export class KeyMarkingManager {
  private _markedKeys: Set<string> = new Set();
  private _enabled: boolean = false;
  private audioEngine: AudioEngine;

  constructor(audioEngine: AudioEngine) {
    this.audioEngine = audioEngine;
    debugLogger.info('KeyMarkingManager: Initialized');
  }

  /**
   * Get the current enabled state
   */
  get enabled(): boolean {
    return this._enabled;
  }

  /**
   * Set the enabled state for key marking mode
   */
  set enabled(value: boolean) {
    this._enabled = value;
    debugLogger.info('KeyMarkingManager: Enabled state changed', { enabled: value });
  }

  /**
   * Get a copy of the currently marked keys
   */
  get markedKeys(): Set<string> {
    return new Set(this._markedKeys);
  }

  /**
   * Toggle a key's marked state
   * @param note - The note to toggle (e.g., 'C4', 'F#3')
   */
  toggleKey(note: string): void {
    if (!note || typeof note !== 'string') {
      debugLogger.warn('KeyMarkingManager: Invalid note parameter', { note });
      return;
    }

    if (this._markedKeys.has(note)) {
      this._markedKeys.delete(note);
      debugLogger.debug('KeyMarkingManager: Key unmarked', { note, totalMarked: this._markedKeys.size });
    } else {
      this._markedKeys.add(note);
      debugLogger.debug('KeyMarkingManager: Key marked', { note, totalMarked: this._markedKeys.size });
    }
  }

  /**
   * Play all currently marked keys simultaneously
   * Uses the AudioEngine to trigger all marked notes at once
   */
  playMarkedKeys(): void {
    if (this._markedKeys.size === 0) {
      debugLogger.info('KeyMarkingManager: No keys marked, nothing to play');
      return;
    }

    if (!this.audioEngine.isReady) {
      debugLogger.warn('KeyMarkingManager: AudioEngine not ready, cannot play marked keys');
      return;
    }

    debugLogger.info('KeyMarkingManager: Playing marked keys', { 
      keys: Array.from(this._markedKeys),
      count: this._markedKeys.size 
    });

    // Play all marked keys simultaneously with default velocity
    const velocity = 0.8;
    this._markedKeys.forEach(note => {
      try {
        this.audioEngine.playNote(note, velocity);
      } catch (error) {
        debugLogger.error('KeyMarkingManager: Failed to play marked key', { note, error });
      }
    });
  }

  /**
   * Clear all marked keys and return them to normal state
   */
  resetMarkedKeys(): void {
    const previousCount = this._markedKeys.size;
    this._markedKeys.clear();
    debugLogger.info('KeyMarkingManager: All keys reset', { previousCount });
  }

  /**
   * Check if a specific key is marked
   * @param note - The note to check
   * @returns true if the key is marked, false otherwise
   */
  isKeyMarked(note: string): boolean {
    if (!note || typeof note !== 'string') {
      return false;
    }
    return this._markedKeys.has(note);
  }

  /**
   * Get the count of currently marked keys
   */
  getMarkedKeyCount(): number {
    return this._markedKeys.size;
  }

  /**
   * Get an array of all marked keys for iteration
   */
  getMarkedKeysArray(): string[] {
    return Array.from(this._markedKeys);
  }

  /**
   * Set the marked keys from an external source (e.g., loading from settings)
   * @param keys - Set of keys to mark
   */
  setMarkedKeys(keys: Set<string>): void {
    this._markedKeys = new Set(keys);
    debugLogger.info('KeyMarkingManager: Marked keys set from external source', { 
      count: this._markedKeys.size,
      keys: Array.from(this._markedKeys)
    });
  }

  /**
   * Dispose of the manager and clean up resources
   */
  dispose(): void {
    this._markedKeys.clear();
    this._enabled = false;
    debugLogger.info('KeyMarkingManager: Disposed');
  }
}