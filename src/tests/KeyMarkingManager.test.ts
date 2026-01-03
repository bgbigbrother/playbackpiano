import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KeyMarkingManager } from '../utils/KeyMarkingManager';
import { AudioEngine } from '../utils/AudioEngine';

// Mock the AudioEngine
vi.mock('../utils/AudioEngine');

describe('KeyMarkingManager', () => {
  let keyMarkingManager: KeyMarkingManager;
  let mockAudioEngine: AudioEngine;

  beforeEach(() => {
    // Create a mock AudioEngine
    mockAudioEngine = {
      isReady: true,
      playNote: vi.fn(),
      dispose: vi.fn(),
    } as any;

    keyMarkingManager = new KeyMarkingManager(mockAudioEngine);
  });

  describe('initialization', () => {
    it('initializes with correct default values', () => {
      expect(keyMarkingManager.enabled).toBe(false);
      expect(keyMarkingManager.markedKeys.size).toBe(0);
      expect(keyMarkingManager.getMarkedKeyCount()).toBe(0);
    });
  });

  describe('enabled state management', () => {
    it('can enable and disable marking mode', () => {
      expect(keyMarkingManager.enabled).toBe(false);
      
      keyMarkingManager.enabled = true;
      expect(keyMarkingManager.enabled).toBe(true);
      
      keyMarkingManager.enabled = false;
      expect(keyMarkingManager.enabled).toBe(false);
    });
  });

  describe('key marking functionality', () => {
    it('can mark and unmark keys', () => {
      const note = 'C4';
      
      // Initially not marked
      expect(keyMarkingManager.isKeyMarked(note)).toBe(false);
      expect(keyMarkingManager.getMarkedKeyCount()).toBe(0);
      
      // Mark the key
      keyMarkingManager.toggleKey(note);
      expect(keyMarkingManager.isKeyMarked(note)).toBe(true);
      expect(keyMarkingManager.getMarkedKeyCount()).toBe(1);
      
      // Unmark the key
      keyMarkingManager.toggleKey(note);
      expect(keyMarkingManager.isKeyMarked(note)).toBe(false);
      expect(keyMarkingManager.getMarkedKeyCount()).toBe(0);
    });

    it('can mark multiple keys', () => {
      const notes = ['C4', 'E4', 'G4'];
      
      notes.forEach(note => {
        keyMarkingManager.toggleKey(note);
        expect(keyMarkingManager.isKeyMarked(note)).toBe(true);
      });
      
      expect(keyMarkingManager.getMarkedKeyCount()).toBe(3);
      
      const markedKeysArray = keyMarkingManager.getMarkedKeysArray();
      expect(markedKeysArray).toHaveLength(3);
      notes.forEach(note => {
        expect(markedKeysArray).toContain(note);
      });
    });

    it('handles invalid note parameters gracefully', () => {
      // Should not crash or mark anything
      keyMarkingManager.toggleKey('');
      keyMarkingManager.toggleKey(null as any);
      keyMarkingManager.toggleKey(undefined as any);
      
      expect(keyMarkingManager.getMarkedKeyCount()).toBe(0);
      
      // Should return false for invalid notes
      expect(keyMarkingManager.isKeyMarked('')).toBe(false);
      expect(keyMarkingManager.isKeyMarked(null as any)).toBe(false);
      expect(keyMarkingManager.isKeyMarked(undefined as any)).toBe(false);
    });
  });

  describe('playing marked keys', () => {
    it('plays all marked keys when audio engine is ready', () => {
      const notes = ['C4', 'E4', 'G4'];
      
      // Mark the keys
      notes.forEach(note => keyMarkingManager.toggleKey(note));
      
      // Play marked keys
      keyMarkingManager.playMarkedKeys();
      
      // Verify all notes were played
      expect(mockAudioEngine.playNote).toHaveBeenCalledTimes(3);
      notes.forEach(note => {
        expect(mockAudioEngine.playNote).toHaveBeenCalledWith(note, 0.8);
      });
    });

    it('does nothing when no keys are marked', () => {
      keyMarkingManager.playMarkedKeys();
      expect(mockAudioEngine.playNote).not.toHaveBeenCalled();
    });

    it('does nothing when audio engine is not ready', () => {
      // Create a new mock with isReady = false
      const notReadyAudioEngine = {
        isReady: false,
        playNote: vi.fn(),
        dispose: vi.fn(),
      } as any;
      
      const keyMarkingManager = new KeyMarkingManager(notReadyAudioEngine);
      
      keyMarkingManager.toggleKey('C4');
      keyMarkingManager.playMarkedKeys();
      
      expect(notReadyAudioEngine.playNote).not.toHaveBeenCalled();
    });

    it('continues playing other keys if one fails', () => {
      const notes = ['C4', 'E4', 'G4'];
      
      // Mock playNote to throw error on second call
      (mockAudioEngine.playNote as any).mockImplementationOnce(() => {})
        .mockImplementationOnce(() => { throw new Error('Test error'); })
        .mockImplementationOnce(() => {});
      
      // Mark the keys
      notes.forEach(note => keyMarkingManager.toggleKey(note));
      
      // Should not throw and should attempt to play all keys
      expect(() => keyMarkingManager.playMarkedKeys()).not.toThrow();
      expect(mockAudioEngine.playNote).toHaveBeenCalledTimes(3);
    });
  });

  describe('reset functionality', () => {
    it('clears all marked keys', () => {
      const notes = ['C4', 'E4', 'G4'];
      
      // Mark some keys
      notes.forEach(note => keyMarkingManager.toggleKey(note));
      expect(keyMarkingManager.getMarkedKeyCount()).toBe(3);
      
      // Reset
      keyMarkingManager.resetMarkedKeys();
      expect(keyMarkingManager.getMarkedKeyCount()).toBe(0);
      
      // Verify all keys are unmarked
      notes.forEach(note => {
        expect(keyMarkingManager.isKeyMarked(note)).toBe(false);
      });
    });
  });

  describe('external key management', () => {
    it('can set marked keys from external source', () => {
      const notes = new Set(['C4', 'E4', 'G4']);
      
      keyMarkingManager.setMarkedKeys(notes);
      
      expect(keyMarkingManager.getMarkedKeyCount()).toBe(3);
      notes.forEach(note => {
        expect(keyMarkingManager.isKeyMarked(note)).toBe(true);
      });
    });
  });

  describe('disposal', () => {
    it('cleans up resources on disposal', () => {
      // Mark some keys and enable
      keyMarkingManager.toggleKey('C4');
      keyMarkingManager.enabled = true;
      
      expect(keyMarkingManager.getMarkedKeyCount()).toBe(1);
      expect(keyMarkingManager.enabled).toBe(true);
      
      // Dispose
      keyMarkingManager.dispose();
      
      expect(keyMarkingManager.getMarkedKeyCount()).toBe(0);
      expect(keyMarkingManager.enabled).toBe(false);
    });
  });
});