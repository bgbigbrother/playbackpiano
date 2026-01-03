import { describe, it, expect, beforeEach, afterEach, vi, beforeAll } from 'vitest';
import { AudioEngine } from '../utils/AudioEngine';
import * as fc from 'fast-check';

// Mock Tone.js completely for testing
vi.mock('tone', () => ({
  context: {
    rawContext: {
      latencyHint: 'interactive',
      sampleRate: 44100,
      state: 'running'
    },
    state: 'running',
    sampleRate: 44100,
    latencyHint: 'interactive'
  },
  Sampler: vi.fn().mockImplementation(() => ({
    triggerAttack: vi.fn(),
    triggerRelease: vi.fn(),
    dispose: vi.fn(),
    loaded: true
  })),
  start: vi.fn(),
  Transport: {
    start: vi.fn(),
    stop: vi.fn(),
    pause: vi.fn()
  }
}));

/**
 * Property-Based Tests for Concurrent Input Handling
 * Using fast-check to verify polyphonic audio playback
 */

describe('Concurrent Input - Property-Based Tests', () => {
  let audioEngine: AudioEngine | null = null;

  // Mock Web Audio API for testing
  beforeAll(() => {
    // Mock AudioContext if not available
    Object.defineProperty(window, 'AudioContext', {
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        createOscillator: vi.fn(),
        createGain: vi.fn(),
        destination: {},
        currentTime: 0,
        sampleRate: 44100,
        state: 'running',
        suspend: vi.fn(),
        resume: vi.fn(),
        close: vi.fn(),
      })),
    });

    // Also mock webkitAudioContext for older browsers
    Object.defineProperty(window, 'webkitAudioContext', {
      writable: true,
      value: window.AudioContext,
    });
  });

  beforeEach(() => {
    // Create AudioEngine instance - should work with mocked Tone.js
    audioEngine = new AudioEngine();
    
    // Simulate successful initialization and loading
    // @ts-expect-error - Accessing private property for testing
    audioEngine._isInitialized = true;
    // @ts-expect-error - Accessing private property for testing
    audioEngine._isLoaded = true;
  });

  afterEach(() => {
    if (audioEngine) {
      audioEngine.dispose();
    }
  });

  /**
   * **Feature: web-piano, Property 3: Concurrent input produces concurrent audio**
   * **Validates: Requirements 2.3, 3.3**
   * 
   * Property: For any set of simultaneous piano key inputs, the system should
   * produce concurrent audio output for all triggered notes.
   * 
   * This property verifies that:
   * 1. Multiple notes can be played simultaneously (polyphonic playback)
   * 2. Each note in a chord triggers its own audio output
   * 3. The audio system handles concurrent playback without dropping notes
   * 4. Both mouse and keyboard inputs support polyphonic behavior
   */
  it('Property 3: Concurrent input produces concurrent audio - multiple simultaneous notes trigger concurrent playback', () => {
    // AudioEngine should be available with mocked Tone.js
    expect(audioEngine).not.toBeNull();

    // Generator for valid piano notes
    const noteNameArb = fc.constantFrom('A', 'B', 'C', 'D', 'E', 'F', 'G');
    const sharpArb = fc.constantFrom('', '#');
    const octaveArb = fc.integer({ min: 0, max: 8 });
    
    const validNoteArb = fc.tuple(noteNameArb, sharpArb, octaveArb).map(
      ([name, sharp, octave]) => `${name}${sharp}${octave}`
    );

    // Generator for sets of concurrent notes (2-5 notes played simultaneously)
    const concurrentNotesArb = fc.uniqueArray(validNoteArb, { 
      minLength: 2, 
      maxLength: 5 
    });

    // Property: For any set of concurrent notes, all should trigger audio playback
    fc.assert(
      fc.property(concurrentNotesArb, (notes) => {
        // Create a fresh mock for each iteration
        const mockTriggerAttack = vi.fn();
        const mockTriggerRelease = vi.fn();
        
        // Mock the sampler for this test iteration
        // @ts-expect-error - Accessing private property for testing
        audioEngine.sampler = {
          triggerAttack: mockTriggerAttack,
          triggerRelease: mockTriggerRelease,
          dispose: vi.fn(),
        };
        // @ts-expect-error - Accessing private property for testing
        audioEngine.activeNotes = new Set(); // Clear active notes for each test
        
        // Act: Play all notes simultaneously (simulating concurrent input)
        notes.forEach(note => {
          audioEngine!.playNote(note);
        });
        
        // Assert: All notes should have triggered audio playback
        expect(mockTriggerAttack).toHaveBeenCalledTimes(notes.length);
        
        // Verify each note was triggered exactly once
        notes.forEach(note => {
          expect(mockTriggerAttack).toHaveBeenCalledWith(
            note,
            undefined,
            expect.any(Number)
          );
        });
        
        // Additional verification: No notes should be dropped
        // The number of calls should equal the number of unique notes
        const uniqueNotes = new Set(notes);
        expect(mockTriggerAttack).toHaveBeenCalledTimes(uniqueNotes.size);
      }),
      { numRuns: 100 } // Run 100 iterations as specified in design doc
    );
  });

  /**
   * Extended property test: Concurrent note release
   * Verifies that releasing individual notes from a chord works correctly
   */
  it('Property 3 (extended): Individual note release from concurrent playback', () => {
    expect(audioEngine).not.toBeNull();

    const noteArb = fc.constantFrom('C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4');
    const concurrentNotesArb = fc.uniqueArray(noteArb, { 
      minLength: 2, 
      maxLength: 4 
    });

    fc.assert(
      fc.property(concurrentNotesArb, (notes) => {
        const mockTriggerAttack = vi.fn();
        const mockTriggerRelease = vi.fn();
        
        // Mock the sampler for this test iteration
        // @ts-expect-error - Accessing private property for testing
        audioEngine.sampler = {
          triggerAttack: mockTriggerAttack,
          triggerRelease: mockTriggerRelease,
          dispose: vi.fn(),
        };
        // @ts-expect-error - Accessing private property for testing
        audioEngine.activeNotes = new Set();
        
        // Play all notes
        notes.forEach(note => {
          audioEngine!.playNote(note);
        });
        
        // Release one note (the first one)
        const noteToRelease = notes[0];
        audioEngine!.releaseNote(noteToRelease);
        
        // Assert: The released note should have been released
        expect(mockTriggerRelease).toHaveBeenCalledWith(noteToRelease);
        expect(mockTriggerRelease).toHaveBeenCalledTimes(1);
        
        // The other notes should still be tracked as active
        // @ts-expect-error - Accessing private property for testing
        const activeNotes = audioEngine.activeNotes;
        expect(activeNotes.has(noteToRelease)).toBe(false);
        
        // Other notes should still be in active set
        notes.slice(1).forEach(note => {
          expect(activeNotes.has(note)).toBe(true);
        });
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Extended property test: Prevent duplicate concurrent playback
   * Verifies that playing the same note multiple times doesn't stack audio
   */
  it('Property 3 (extended): Duplicate concurrent notes do not stack', () => {
    expect(audioEngine).not.toBeNull();

    const noteArb = fc.constantFrom('C4', 'D4', 'E4', 'F4', 'G4');

    fc.assert(
      fc.property(noteArb, (note) => {
        const mockTriggerAttack = vi.fn();
        const mockTriggerRelease = vi.fn();
        
        // Mock the sampler for this test iteration
        // @ts-expect-error - Accessing private property for testing
        audioEngine.sampler = {
          triggerAttack: mockTriggerAttack,
          triggerRelease: mockTriggerRelease,
          dispose: vi.fn(),
        };
        // @ts-expect-error - Accessing private property for testing
        audioEngine.activeNotes = new Set();
        
        // Try to play the same note multiple times rapidly
        audioEngine!.playNote(note);
        audioEngine!.playNote(note); // Should be ignored
        audioEngine!.playNote(note); // Should be ignored
        
        // Assert: The note should only be triggered once
        // This prevents volume stacking and audio glitches
        expect(mockTriggerAttack).toHaveBeenCalledTimes(1);
        expect(mockTriggerAttack).toHaveBeenCalledWith(
          note,
          undefined,
          expect.any(Number)
        );
      }),
      { numRuns: 100 }
    );
  });
});
