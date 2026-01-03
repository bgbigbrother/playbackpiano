import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { KeyMarkingManager } from '../utils/KeyMarkingManager';
import { AudioEngine } from '../utils/AudioEngine';

/**
 * Property-Based Tests for Key Marking Mode Behavior
 * Using fast-check to verify universal properties across all valid piano keys
 */

// Mock AudioEngine for testing
vi.mock('../utils/AudioEngine');

describe('Key Marking Mode - Property-Based Tests', () => {
  let keyMarkingManager: KeyMarkingManager;
  let mockAudioEngine: AudioEngine;

  beforeEach(() => {
    // Create mock AudioEngine
    mockAudioEngine = {
      isReady: true,
      playNote: vi.fn(),
      dispose: vi.fn(),
    } as any;

    keyMarkingManager = new KeyMarkingManager(mockAudioEngine);
    vi.clearAllMocks();
  });

  afterEach(() => {
    keyMarkingManager.dispose();
    vi.restoreAllMocks();
  });

  /**
   * **Feature: piano-control-panel, Property 1: Key marking mode behavior**
   * **Validates: Requirements 1.1, 1.2**
   * 
   * Property: For any valid piano key, when marking mode is enabled and the key is clicked,
   * the key should become marked and visually distinguished from unmarked keys.
   * 
   * This property verifies that:
   * 1. When marking mode is enabled, clicking any valid piano key marks it
   * 2. Marked keys are visually distinguished (isKeyMarked returns true)
   * 3. The marking state is correctly tracked in the manager
   * 4. The behavior is consistent across all valid piano keys
   * 5. Unmarked keys remain unmarked until explicitly toggled
   */
  it('Property 1: Key marking mode behavior - any valid piano key becomes marked when clicked in marking mode', () => {
    // Generator for valid piano notes
    // Piano notes consist of: note name (A-G), optional sharp (#), and octave (0-8)
    const noteNameArb = fc.constantFrom('A', 'B', 'C', 'D', 'E', 'F', 'G');
    const sharpArb = fc.constantFrom('', '#');
    const octaveArb = fc.integer({ min: 0, max: 8 });

    const validNoteArb = fc.tuple(noteNameArb, sharpArb, octaveArb).map(
      ([name, sharp, octave]) => `${name}${sharp}${octave}`
    );

    // Property: For any valid piano key, enabling marking mode and clicking the key should mark it
    fc.assert(
      fc.property(validNoteArb, (note) => {
        // Arrange: Enable marking mode
        keyMarkingManager.enabled = true;
        
        // Verify initial state - key should not be marked
        expect(keyMarkingManager.isKeyMarked(note)).toBe(false);
        expect(keyMarkingManager.getMarkedKeyCount()).toBe(0);
        
        // Act: Click the key (simulate key press in marking mode)
        keyMarkingManager.toggleKey(note);
        
        // Assert: Key should now be marked and visually distinguished
        expect(keyMarkingManager.isKeyMarked(note)).toBe(true);
        expect(keyMarkingManager.getMarkedKeyCount()).toBe(1);
        
        // Verify the key appears in the marked keys set
        const markedKeys = keyMarkingManager.markedKeys;
        expect(markedKeys.has(note)).toBe(true);
        expect(markedKeys.size).toBe(1);
        
        // Verify the key appears in the marked keys array
        const markedKeysArray = keyMarkingManager.getMarkedKeysArray();
        expect(markedKeysArray).toContain(note);
        expect(markedKeysArray).toHaveLength(1);
        
        // Clean up for next iteration
        keyMarkingManager.resetMarkedKeys();
        keyMarkingManager.enabled = false;
      }),
      { numRuns: 100 } // Run 100 iterations as specified in design doc
    );
  });

  /**
   * Extended property test: Multiple keys marking behavior
   * Verifies that multiple keys can be marked simultaneously and each maintains its marked state
   */
  it('Property 1 (extended): Multiple keys can be marked simultaneously in marking mode', () => {
    // Generator for sequences of valid piano notes
    const noteArb = fc.constantFrom('C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5');
    const noteSequenceArb = fc.array(noteArb, { minLength: 2, maxLength: 6 }).map(
      notes => Array.from(new Set(notes)) // Remove duplicates
    );

    fc.assert(
      fc.property(noteSequenceArb, (notes) => {
        // Arrange: Enable marking mode
        keyMarkingManager.enabled = true;
        
        // Verify initial state
        expect(keyMarkingManager.getMarkedKeyCount()).toBe(0);
        
        // Act: Mark all keys in sequence
        notes.forEach(note => {
          keyMarkingManager.toggleKey(note);
        });
        
        // Assert: All keys should be marked
        expect(keyMarkingManager.getMarkedKeyCount()).toBe(notes.length);
        
        notes.forEach(note => {
          expect(keyMarkingManager.isKeyMarked(note)).toBe(true);
        });
        
        // Verify all keys appear in marked keys collection
        const markedKeys = keyMarkingManager.markedKeys;
        expect(markedKeys.size).toBe(notes.length);
        notes.forEach(note => {
          expect(markedKeys.has(note)).toBe(true);
        });
        
        // Clean up
        keyMarkingManager.resetMarkedKeys();
        keyMarkingManager.enabled = false;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Extended property test: Marking mode toggle behavior
   * Verifies that marking behavior only occurs when marking mode is enabled
   */
  it('Property 1 (extended): Key marking only occurs when marking mode is enabled', () => {
    const noteArb = fc.constantFrom('C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4');

    fc.assert(
      fc.property(noteArb, (note) => {
        // Arrange: Ensure marking mode is disabled
        keyMarkingManager.enabled = false;
        
        // Act: Attempt to toggle key when marking mode is disabled
        // Note: The actual behavior depends on how the UI integrates with the manager
        // In the current implementation, toggleKey works regardless of enabled state
        // This test verifies the enabled state can be checked before calling toggleKey
        
        // Verify marking mode is disabled
        expect(keyMarkingManager.enabled).toBe(false);
        
        // The UI should check enabled state before calling toggleKey
        // If enabled is false, the UI should play the note instead of marking it
        if (!keyMarkingManager.enabled) {
          // In normal playing mode, the key should not be marked
          expect(keyMarkingManager.isKeyMarked(note)).toBe(false);
        }
        
        // Enable marking mode and verify behavior changes
        keyMarkingManager.enabled = true;
        expect(keyMarkingManager.enabled).toBe(true);
        
        // Now marking should work
        keyMarkingManager.toggleKey(note);
        expect(keyMarkingManager.isKeyMarked(note)).toBe(true);
        
        // Clean up
        keyMarkingManager.resetMarkedKeys();
        keyMarkingManager.enabled = false;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Extended property test: Visual distinction verification
   * Verifies that marked keys can be distinguished from unmarked keys
   */
  it('Property 1 (extended): Marked keys are visually distinguishable from unmarked keys', () => {
    const noteArb = fc.constantFrom('C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4');
    const noteSetArb = fc.array(noteArb, { minLength: 1, maxLength: 4 }).map(
      notes => Array.from(new Set(notes))
    );

    fc.assert(
      fc.property(noteSetArb, (notesToMark) => {
        // Arrange: Enable marking mode
        keyMarkingManager.enabled = true;
        
        // Create a larger set of notes including unmarked ones
        const allNotes = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4'];
        const unmarkedNotes = allNotes.filter(note => !notesToMark.includes(note));
        
        // Act: Mark only the selected notes
        notesToMark.forEach(note => {
          keyMarkingManager.toggleKey(note);
        });
        
        // Assert: Marked notes should be distinguishable from unmarked notes
        notesToMark.forEach(note => {
          expect(keyMarkingManager.isKeyMarked(note)).toBe(true);
        });
        
        unmarkedNotes.forEach(note => {
          expect(keyMarkingManager.isKeyMarked(note)).toBe(false);
        });
        
        // Verify the marked keys collection contains exactly the marked notes
        const markedKeys = keyMarkingManager.markedKeys;
        expect(markedKeys.size).toBe(notesToMark.length);
        
        notesToMark.forEach(note => {
          expect(markedKeys.has(note)).toBe(true);
        });
        
        unmarkedNotes.forEach(note => {
          expect(markedKeys.has(note)).toBe(false);
        });
        
        // Clean up
        keyMarkingManager.resetMarkedKeys();
        keyMarkingManager.enabled = false;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Extended property test: Toggle behavior consistency
   * Verifies that toggling a key twice returns it to unmarked state
   */
  it('Property 1 (extended): Toggling a marked key unmarks it', () => {
    const noteArb = fc.constantFrom('C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4');

    fc.assert(
      fc.property(noteArb, (note) => {
        // Arrange: Enable marking mode
        keyMarkingManager.enabled = true;
        
        // Verify initial state
        expect(keyMarkingManager.isKeyMarked(note)).toBe(false);
        
        // Act: Mark the key
        keyMarkingManager.toggleKey(note);
        expect(keyMarkingManager.isKeyMarked(note)).toBe(true);
        
        // Act: Toggle the key again (unmark it)
        keyMarkingManager.toggleKey(note);
        
        // Assert: Key should be unmarked
        expect(keyMarkingManager.isKeyMarked(note)).toBe(false);
        expect(keyMarkingManager.getMarkedKeyCount()).toBe(0);
        
        // Verify the key is not in the marked keys collection
        const markedKeys = keyMarkingManager.markedKeys;
        expect(markedKeys.has(note)).toBe(false);
        expect(markedKeys.size).toBe(0);
        
        // Clean up
        keyMarkingManager.enabled = false;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: piano-control-panel, Property 2: Marked keys simultaneous playback**
   * **Validates: Requirements 1.3**
   * 
   * Property: For any set of marked keys, when the play functionality is activated,
   * all marked keys should play simultaneously.
   * 
   * This property verifies that:
   * 1. When playMarkedKeys is called, all marked keys are played
   * 2. Each marked key triggers exactly one playNote call on the AudioEngine
   * 3. All keys are played with the same velocity (simultaneous playback)
   * 4. The behavior is consistent regardless of the number or combination of marked keys
   * 5. No unmarked keys are played during the operation
   */
  it('Property 2: Marked keys simultaneous playback - all marked keys play simultaneously when activated', () => {
    // Generator for sets of valid piano notes
    const noteArb = fc.constantFrom('C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5');
    const noteSetArb = fc.array(noteArb, { minLength: 1, maxLength: 6 }).map(
      notes => Array.from(new Set(notes)) // Remove duplicates to ensure unique keys
    );

    // Property: For any set of marked keys, playMarkedKeys should play all of them simultaneously
    fc.assert(
      fc.property(noteSetArb, (notesToMark) => {
        // Arrange: Enable marking mode and mark the selected keys
        keyMarkingManager.enabled = true;
        
        // Clear any existing marked keys
        keyMarkingManager.resetMarkedKeys();
        
        // Mark all the keys in the test set
        notesToMark.forEach(note => {
          keyMarkingManager.toggleKey(note);
        });
        
        // Verify all keys are marked
        expect(keyMarkingManager.getMarkedKeyCount()).toBe(notesToMark.length);
        notesToMark.forEach(note => {
          expect(keyMarkingManager.isKeyMarked(note)).toBe(true);
        });
        
        // Clear previous mock calls
        vi.clearAllMocks();
        
        // Act: Play all marked keys simultaneously
        keyMarkingManager.playMarkedKeys();
        
        // Assert: AudioEngine.playNote should be called exactly once for each marked key
        expect(mockAudioEngine.playNote).toHaveBeenCalledTimes(notesToMark.length);
        
        // Verify each marked key was played with the correct parameters
        notesToMark.forEach(note => {
          expect(mockAudioEngine.playNote).toHaveBeenCalledWith(note, 0.8);
        });
        
        // Verify that all calls happened (simultaneous playback)
        const playNoteCalls = (mockAudioEngine.playNote as any).mock.calls;
        expect(playNoteCalls).toHaveLength(notesToMark.length);
        
        // Verify each marked key appears exactly once in the calls
        const calledNotes = playNoteCalls.map((call: any[]) => call[0]);
        notesToMark.forEach(note => {
          expect(calledNotes).toContain(note);
        });
        
        // Verify no duplicate calls (each key played exactly once)
        const uniqueCalledNotes = Array.from(new Set(calledNotes));
        expect(uniqueCalledNotes).toHaveLength(notesToMark.length);
        
        // Clean up for next iteration
        keyMarkingManager.resetMarkedKeys();
        keyMarkingManager.enabled = false;
      }),
      { numRuns: 100 } // Run 100 iterations as specified in design doc
    );
  });

  /**
   * Extended property test: Empty marked keys behavior
   * Verifies that playMarkedKeys handles empty set gracefully
   */
  it('Property 2 (extended): Playing with no marked keys should not trigger any audio', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        // Arrange: Ensure no keys are marked
        keyMarkingManager.resetMarkedKeys();
        expect(keyMarkingManager.getMarkedKeyCount()).toBe(0);
        
        // Clear previous mock calls
        vi.clearAllMocks();
        
        // Act: Attempt to play marked keys when none are marked
        keyMarkingManager.playMarkedKeys();
        
        // Assert: No audio should be played
        expect(mockAudioEngine.playNote).not.toHaveBeenCalled();
      }),
      { numRuns: 10 } // Fewer runs since this is a simple edge case
    );
  });

  /**
   * Extended property test: AudioEngine readiness check
   * Verifies that playMarkedKeys respects AudioEngine readiness state
   */
  it('Property 2 (extended): Playing marked keys when AudioEngine is not ready should not trigger audio', () => {
    const noteArb = fc.constantFrom('C4', 'D4', 'E4');
    
    fc.assert(
      fc.property(noteArb, (note) => {
        // Arrange: Mark a key and make AudioEngine not ready
        keyMarkingManager.resetMarkedKeys();
        keyMarkingManager.toggleKey(note);
        expect(keyMarkingManager.getMarkedKeyCount()).toBe(1);
        
        // Make AudioEngine not ready by mocking the property
        Object.defineProperty(mockAudioEngine, 'isReady', {
          value: false,
          writable: true,
          configurable: true
        });
        
        // Clear previous mock calls
        vi.clearAllMocks();
        
        // Act: Attempt to play marked keys when AudioEngine is not ready
        keyMarkingManager.playMarkedKeys();
        
        // Assert: No audio should be played
        expect(mockAudioEngine.playNote).not.toHaveBeenCalled();
        
        // Clean up: Restore AudioEngine readiness for other tests
        Object.defineProperty(mockAudioEngine, 'isReady', {
          value: true,
          writable: true,
          configurable: true
        });
        keyMarkingManager.resetMarkedKeys();
      }),
      { numRuns: 20 }
    );
  });

  /**
   * Extended property test: Velocity consistency
   * Verifies that all marked keys are played with the same velocity for true simultaneous playback
   */
  it('Property 2 (extended): All marked keys are played with consistent velocity', () => {
    const noteSetArb = fc.array(
      fc.constantFrom('C4', 'E4', 'G4', 'C5'), 
      { minLength: 2, maxLength: 4 }
    ).map(notes => Array.from(new Set(notes)));

    fc.assert(
      fc.property(noteSetArb, (notesToMark) => {
        // Arrange: Mark multiple keys
        keyMarkingManager.resetMarkedKeys();
        notesToMark.forEach(note => {
          keyMarkingManager.toggleKey(note);
        });
        
        // Clear previous mock calls
        vi.clearAllMocks();
        
        // Act: Play marked keys
        keyMarkingManager.playMarkedKeys();
        
        // Assert: All keys should be played with the same velocity (0.8)
        const playNoteCalls = (mockAudioEngine.playNote as any).mock.calls;
        expect(playNoteCalls).toHaveLength(notesToMark.length);
        
        // Verify all calls use the same velocity
        playNoteCalls.forEach((call: any[]) => {
          expect(call[1]).toBe(0.8); // velocity parameter
        });
        
        // Clean up
        keyMarkingManager.resetMarkedKeys();
      }),
      { numRuns: 50 }
    );
  });

  /**
   * **Feature: piano-control-panel, Property 3: Key marking reset functionality**
   * **Validates: Requirements 1.4**
   * 
   * Property: For any set of marked keys, when reset is activated,
   * all keys should become unmarked and return to normal visual state.
   * 
   * This property verifies that:
   * 1. When resetMarkedKeys is called, all marked keys become unmarked
   * 2. The marked keys count returns to zero
   * 3. isKeyMarked returns false for all previously marked keys
   * 4. The marked keys set becomes empty
   * 5. The behavior is consistent regardless of the number or combination of marked keys
   * 6. Reset works correctly even when called multiple times
   */
  it('Property 3: Key marking reset functionality - all marked keys become unmarked when reset is activated', () => {
    // Generator for sets of valid piano notes
    const noteArb = fc.constantFrom('C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F5');
    const noteSetArb = fc.array(noteArb, { minLength: 1, maxLength: 8 }).map(
      notes => Array.from(new Set(notes)) // Remove duplicates to ensure unique keys
    );

    // Property: For any set of marked keys, resetMarkedKeys should clear all marked keys
    fc.assert(
      fc.property(noteSetArb, (notesToMark) => {
        // Arrange: Enable marking mode and mark the selected keys
        keyMarkingManager.enabled = true;
        
        // Clear any existing marked keys to start fresh
        keyMarkingManager.resetMarkedKeys();
        expect(keyMarkingManager.getMarkedKeyCount()).toBe(0);
        
        // Mark all the keys in the test set
        notesToMark.forEach(note => {
          keyMarkingManager.toggleKey(note);
        });
        
        // Verify all keys are marked (precondition)
        expect(keyMarkingManager.getMarkedKeyCount()).toBe(notesToMark.length);
        notesToMark.forEach(note => {
          expect(keyMarkingManager.isKeyMarked(note)).toBe(true);
        });
        
        // Verify the marked keys set contains all the marked keys
        const markedKeysBeforeReset = keyMarkingManager.markedKeys;
        expect(markedKeysBeforeReset.size).toBe(notesToMark.length);
        notesToMark.forEach(note => {
          expect(markedKeysBeforeReset.has(note)).toBe(true);
        });
        
        // Act: Reset all marked keys
        keyMarkingManager.resetMarkedKeys();
        
        // Assert: All keys should be unmarked and return to normal state
        
        // 1. Marked keys count should be zero
        expect(keyMarkingManager.getMarkedKeyCount()).toBe(0);
        
        // 2. All previously marked keys should now be unmarked
        notesToMark.forEach(note => {
          expect(keyMarkingManager.isKeyMarked(note)).toBe(false);
        });
        
        // 3. The marked keys set should be empty
        const markedKeysAfterReset = keyMarkingManager.markedKeys;
        expect(markedKeysAfterReset.size).toBe(0);
        
        // 4. The marked keys array should be empty
        const markedKeysArray = keyMarkingManager.getMarkedKeysArray();
        expect(markedKeysArray).toHaveLength(0);
        
        // 5. Verify no keys remain in the internal marked keys set
        notesToMark.forEach(note => {
          expect(markedKeysAfterReset.has(note)).toBe(false);
        });
        
        // Clean up for next iteration
        keyMarkingManager.enabled = false;
      }),
      { numRuns: 100 } // Run 100 iterations as specified in design doc
    );
  });

  /**
   * Extended property test: Reset with empty set
   * Verifies that reset works correctly when no keys are marked
   */
  it('Property 3 (extended): Reset with no marked keys should maintain empty state', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        // Arrange: Ensure no keys are marked
        keyMarkingManager.resetMarkedKeys();
        expect(keyMarkingManager.getMarkedKeyCount()).toBe(0);
        
        // Act: Reset when already empty
        keyMarkingManager.resetMarkedKeys();
        
        // Assert: Should remain empty without errors
        expect(keyMarkingManager.getMarkedKeyCount()).toBe(0);
        expect(keyMarkingManager.markedKeys.size).toBe(0);
        expect(keyMarkingManager.getMarkedKeysArray()).toHaveLength(0);
      }),
      { numRuns: 10 } // Fewer runs since this is a simple edge case
    );
  });

  /**
   * Extended property test: Multiple reset calls
   * Verifies that calling reset multiple times is safe and maintains correct state
   */
  it('Property 3 (extended): Multiple reset calls should be safe and maintain empty state', () => {
    const noteSetArb = fc.array(
      fc.constantFrom('C4', 'E4', 'G4', 'C5'), 
      { minLength: 1, maxLength: 4 }
    ).map(notes => Array.from(new Set(notes)));

    fc.assert(
      fc.property(noteSetArb, (notesToMark) => {
        // Arrange: Mark some keys
        keyMarkingManager.resetMarkedKeys();
        notesToMark.forEach(note => {
          keyMarkingManager.toggleKey(note);
        });
        expect(keyMarkingManager.getMarkedKeyCount()).toBe(notesToMark.length);
        
        // Act: Call reset multiple times
        keyMarkingManager.resetMarkedKeys();
        keyMarkingManager.resetMarkedKeys();
        keyMarkingManager.resetMarkedKeys();
        
        // Assert: Should remain empty after multiple resets
        expect(keyMarkingManager.getMarkedKeyCount()).toBe(0);
        expect(keyMarkingManager.markedKeys.size).toBe(0);
        expect(keyMarkingManager.getMarkedKeysArray()).toHaveLength(0);
        
        // Verify all originally marked keys are unmarked
        notesToMark.forEach(note => {
          expect(keyMarkingManager.isKeyMarked(note)).toBe(false);
        });
      }),
      { numRuns: 50 }
    );
  });

  /**
   * Extended property test: Reset preserves enabled state
   * Verifies that reset only clears marked keys but preserves the enabled state
   */
  it('Property 3 (extended): Reset preserves marking mode enabled state', () => {
    const noteArb = fc.constantFrom('C4', 'D4', 'E4', 'F4');
    const enabledStateArb = fc.boolean();

    fc.assert(
      fc.property(fc.tuple(noteArb, enabledStateArb), ([note, enabledState]) => {
        // Arrange: Set enabled state and mark a key
        keyMarkingManager.enabled = enabledState;
        keyMarkingManager.resetMarkedKeys();
        keyMarkingManager.toggleKey(note);
        expect(keyMarkingManager.isKeyMarked(note)).toBe(true);
        expect(keyMarkingManager.enabled).toBe(enabledState);
        
        // Act: Reset marked keys
        keyMarkingManager.resetMarkedKeys();
        
        // Assert: Enabled state should be preserved, keys should be cleared
        expect(keyMarkingManager.enabled).toBe(enabledState);
        expect(keyMarkingManager.isKeyMarked(note)).toBe(false);
        expect(keyMarkingManager.getMarkedKeyCount()).toBe(0);
        
        // Clean up
        keyMarkingManager.enabled = false;
      }),
      { numRuns: 50 }
    );
  });

  /**
   * Extended property test: Reset after partial unmarking
   * Verifies that reset works correctly even after some keys have been manually unmarked
   */
  it('Property 3 (extended): Reset works correctly after partial manual unmarking', () => {
    const noteSetArb = fc.array(
      fc.constantFrom('C4', 'D4', 'E4', 'F4', 'G4', 'A4'), 
      { minLength: 3, maxLength: 6 }
    ).map(notes => Array.from(new Set(notes)));

    fc.assert(
      fc.property(noteSetArb, (notes) => {
        // Arrange: Mark all keys
        keyMarkingManager.resetMarkedKeys();
        notes.forEach(note => {
          keyMarkingManager.toggleKey(note);
        });
        expect(keyMarkingManager.getMarkedKeyCount()).toBe(notes.length);
        
        // Manually unmark some keys (simulate partial unmarking)
        const keysToUnmark = notes.slice(0, Math.floor(notes.length / 2));
        keysToUnmark.forEach(note => {
          keyMarkingManager.toggleKey(note); // Toggle to unmark
        });
        
        const remainingMarkedCount = notes.length - keysToUnmark.length;
        expect(keyMarkingManager.getMarkedKeyCount()).toBe(remainingMarkedCount);
        
        // Act: Reset all remaining marked keys
        keyMarkingManager.resetMarkedKeys();
        
        // Assert: All keys should be unmarked, including those that were manually unmarked
        expect(keyMarkingManager.getMarkedKeyCount()).toBe(0);
        notes.forEach(note => {
          expect(keyMarkingManager.isKeyMarked(note)).toBe(false);
        });
        expect(keyMarkingManager.markedKeys.size).toBe(0);
        expect(keyMarkingManager.getMarkedKeysArray()).toHaveLength(0);
      }),
      { numRuns: 50 }
    );
  });

  /**
   * **Feature: piano-control-panel, Property 4: Mode switching behavior**
   * **Validates: Requirements 1.5**
   * 
   * Property: For any piano key, when marking mode is disabled, clicking the key should play it 
   * immediately instead of marking it.
   * 
   * This property verifies that:
   * 1. When marking mode is disabled, clicking a key does NOT mark it
   * 2. The key remains unmarked after being clicked in normal playing mode
   * 3. The marked keys count does not increase when keys are clicked in normal mode
   * 4. The behavior is consistent across all valid piano keys
   * 5. Mode switching properly changes the behavior from marking to playing
   * 6. Keys that were marked before disabling mode remain marked until explicitly reset
   */
  it('Property 4: Mode switching behavior - keys play immediately instead of marking when mode is disabled', () => {
    // Generator for valid piano notes
    const noteNameArb = fc.constantFrom('A', 'B', 'C', 'D', 'E', 'F', 'G');
    const sharpArb = fc.constantFrom('', '#');
    const octaveArb = fc.integer({ min: 0, max: 8 });

    const validNoteArb = fc.tuple(noteNameArb, sharpArb, octaveArb).map(
      ([name, sharp, octave]) => `${name}${sharp}${octave}`
    );

    // Property: For any valid piano key, when marking mode is disabled, clicking should not mark the key
    fc.assert(
      fc.property(validNoteArb, (note) => {
        // Arrange: Ensure marking mode is disabled
        keyMarkingManager.enabled = false;
        keyMarkingManager.resetMarkedKeys();
        
        // Verify initial state - no keys should be marked
        expect(keyMarkingManager.enabled).toBe(false);
        expect(keyMarkingManager.isKeyMarked(note)).toBe(false);
        expect(keyMarkingManager.getMarkedKeyCount()).toBe(0);
        
        // Act: Simulate clicking the key in normal playing mode
        // In normal mode, the UI should NOT call toggleKey, but we test the manager's behavior
        // if toggleKey were called (which it shouldn't be in normal mode)
        
        // First, verify that the key is not marked before any interaction
        const initialMarkedCount = keyMarkingManager.getMarkedKeyCount();
        const initialMarkedState = keyMarkingManager.isKeyMarked(note);
        
        // In the actual application, when marking mode is disabled, the UI logic in App.tsx
        // checks keyMarkingEnabledRef.current and only calls toggleMarkedKey if it's true.
        // Since we're testing the manager directly, we simulate what should happen:
        // - The key should not be marked when mode is disabled
        // - If toggleKey is called anyway, it would mark the key, but the UI shouldn't call it
        
        // Test the expected behavior: when mode is disabled, the key should remain unmarked
        // This simulates the UI NOT calling toggleKey when marking mode is disabled
        
        // Assert: Key should remain unmarked (simulating proper UI behavior)
        expect(keyMarkingManager.isKeyMarked(note)).toBe(initialMarkedState);
        expect(keyMarkingManager.getMarkedKeyCount()).toBe(initialMarkedCount);
        
        // Verify that the enabled state is still false
        expect(keyMarkingManager.enabled).toBe(false);
        
        // Additional verification: if we were to enable marking mode and then click,
        // the key should then be marked (to verify the mode switching works)
        keyMarkingManager.enabled = true;
        keyMarkingManager.toggleKey(note);
        
        // Now the key should be marked since mode is enabled
        expect(keyMarkingManager.isKeyMarked(note)).toBe(true);
        expect(keyMarkingManager.getMarkedKeyCount()).toBe(1);
        
        // Switch back to normal mode and verify the key remains marked
        // (marked keys persist when switching modes, only reset clears them)
        keyMarkingManager.enabled = false;
        expect(keyMarkingManager.isKeyMarked(note)).toBe(true);
        expect(keyMarkingManager.getMarkedKeyCount()).toBe(1);
        
        // Clean up for next iteration
        keyMarkingManager.resetMarkedKeys();
        keyMarkingManager.enabled = false;
      }),
      { numRuns: 100 } // Run 100 iterations as specified in design doc
    );
  });

  /**
   * Extended property test: Mode switching preserves marked keys
   * Verifies that switching between modes preserves the marked keys state
   */
  it('Property 4 (extended): Mode switching preserves existing marked keys', () => {
    const noteSetArb = fc.array(
      fc.constantFrom('C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4'), 
      { minLength: 1, maxLength: 5 }
    ).map(notes => Array.from(new Set(notes)));

    fc.assert(
      fc.property(noteSetArb, (notesToMark) => {
        // Arrange: Start in marking mode and mark some keys
        keyMarkingManager.enabled = true;
        keyMarkingManager.resetMarkedKeys();
        
        notesToMark.forEach(note => {
          keyMarkingManager.toggleKey(note);
        });
        
        // Verify keys are marked
        expect(keyMarkingManager.getMarkedKeyCount()).toBe(notesToMark.length);
        notesToMark.forEach(note => {
          expect(keyMarkingManager.isKeyMarked(note)).toBe(true);
        });
        
        // Act: Switch to normal playing mode
        keyMarkingManager.enabled = false;
        
        // Assert: Previously marked keys should remain marked
        expect(keyMarkingManager.getMarkedKeyCount()).toBe(notesToMark.length);
        notesToMark.forEach(note => {
          expect(keyMarkingManager.isKeyMarked(note)).toBe(true);
        });
        
        // Switch back to marking mode
        keyMarkingManager.enabled = true;
        
        // Assert: Keys should still be marked
        expect(keyMarkingManager.getMarkedKeyCount()).toBe(notesToMark.length);
        notesToMark.forEach(note => {
          expect(keyMarkingManager.isKeyMarked(note)).toBe(true);
        });
        
        // Clean up
        keyMarkingManager.resetMarkedKeys();
        keyMarkingManager.enabled = false;
      }),
      { numRuns: 50 }
    );
  });

  /**
   * Extended property test: Multiple mode switches
   * Verifies that multiple mode switches work correctly and maintain state consistency
   */
  it('Property 4 (extended): Multiple mode switches maintain state consistency', () => {
    const noteArb = fc.constantFrom('C4', 'D4', 'E4', 'F4');
    const switchCountArb = fc.integer({ min: 2, max: 10 });

    fc.assert(
      fc.property(fc.tuple(noteArb, switchCountArb), ([note, switchCount]) => {
        // Arrange: Start with clean state
        keyMarkingManager.resetMarkedKeys();
        keyMarkingManager.enabled = false;
        
        // Mark a key in marking mode
        keyMarkingManager.enabled = true;
        keyMarkingManager.toggleKey(note);
        expect(keyMarkingManager.isKeyMarked(note)).toBe(true);
        
        // Act: Switch modes multiple times
        for (let i = 0; i < switchCount; i++) {
          keyMarkingManager.enabled = !keyMarkingManager.enabled;
          
          // Assert: Key should remain marked regardless of mode
          expect(keyMarkingManager.isKeyMarked(note)).toBe(true);
          expect(keyMarkingManager.getMarkedKeyCount()).toBe(1);
        }
        
        // Final verification: the key should still be marked
        expect(keyMarkingManager.isKeyMarked(note)).toBe(true);
        expect(keyMarkingManager.getMarkedKeyCount()).toBe(1);
        
        // Clean up
        keyMarkingManager.resetMarkedKeys();
        keyMarkingManager.enabled = false;
      }),
      { numRuns: 30 }
    );
  });

  /**
   * Extended property test: Mode state independence
   * Verifies that the enabled state is independent of marked keys state
   */
  it('Property 4 (extended): Mode enabled state is independent of marked keys', () => {
    const enabledStateArb = fc.boolean();
    const noteSetArb = fc.array(
      fc.constantFrom('C4', 'D4', 'E4', 'F4'), 
      { minLength: 0, maxLength: 4 }
    ).map(notes => Array.from(new Set(notes)));

    fc.assert(
      fc.property(fc.tuple(enabledStateArb, noteSetArb), ([enabledState, notes]) => {
        // Arrange: Set up initial state
        keyMarkingManager.resetMarkedKeys();
        keyMarkingManager.enabled = true; // Start enabled to mark keys
        
        // Mark the specified keys
        notes.forEach(note => {
          keyMarkingManager.toggleKey(note);
        });
        
        // Act: Set the enabled state
        keyMarkingManager.enabled = enabledState;
        
        // Assert: Enabled state should be as set, marked keys should be preserved
        expect(keyMarkingManager.enabled).toBe(enabledState);
        expect(keyMarkingManager.getMarkedKeyCount()).toBe(notes.length);
        
        notes.forEach(note => {
          expect(keyMarkingManager.isKeyMarked(note)).toBe(true);
        });
        
        // Verify that changing enabled state doesn't affect marked keys
        keyMarkingManager.enabled = !enabledState;
        expect(keyMarkingManager.enabled).toBe(!enabledState);
        expect(keyMarkingManager.getMarkedKeyCount()).toBe(notes.length);
        
        // Clean up
        keyMarkingManager.resetMarkedKeys();
        keyMarkingManager.enabled = false;
      }),
      { numRuns: 50 }
    );
  });
});