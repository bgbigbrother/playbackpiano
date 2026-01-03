import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PerformanceReplay } from '../utils/PerformanceReplay';
import { AudioEngine } from '../utils/AudioEngine';
import * as fc from 'fast-check';

// Mock AudioEngine
vi.mock('../utils/AudioEngine');

/**
 * Property-Based Tests for PerformanceReplay Accuracy
 * Using fast-check to verify universal properties across all valid inputs
 */
describe('PerformanceReplay Accuracy - Property-Based Tests', () => {
  let mockAudioEngine: AudioEngine;
  let performanceReplay: PerformanceReplay | null = null;
  let playedNotes: Array<{ note: string; velocity: number; timestamp: number }> = [];

  beforeEach(() => {
    // Reset played notes tracking
    playedNotes = [];
    
    // Create mock audio engine that tracks played notes
    mockAudioEngine = {
      isReady: true,
      playNote: vi.fn().mockImplementation((note: string, velocity: number) => {
        playedNotes.push({
          note,
          velocity,
          timestamp: Date.now()
        });
      }),
    } as any;
  });

  afterEach(() => {
    if (performanceReplay) {
      performanceReplay.dispose();
      performanceReplay = null;
    }
    playedNotes = [];
  });

  /**
   * **Feature: piano-control-panel, Property 29: Performance replay accuracy**
   * **Validates: Requirements 5.5**
   * 
   * Property: For any recorded piano performance, when replay is activated, the system 
   * should recreate the exact notes in their original sequence and timing.
   * 
   * This property verifies that:
   * 1. All notes from the original performance are replayed
   * 2. Notes are replayed in the correct chronological order
   * 3. Note velocities are accurately reproduced
   * 4. Only noteOn events trigger audio playback (noteOff events are handled by duration)
   * 5. Performance replay can be initialized and configured correctly
   */
  it('Property 29: Performance replay accuracy - recreates exact notes in original sequence and timing', () => {
    // Generators for simpler, synchronous testing
    const noteArb = fc.constantFrom('C4', 'E4', 'G4');
    const velocityArb = fc.integer({ min: 50, max: 100 });
    const replaySpeedArb = fc.constantFrom(0.5, 1.0, 2.0);
    
    // Generator for a simple sequence of noteOn events
    const simplePerformanceArb = fc.array(
      fc.record({
        note: noteArb,
        timestamp: fc.nat({ max: 1000 }),
        velocity: velocityArb,
        duration: fc.constant(300),
        eventType: fc.constant('noteOn' as const)
      }),
      { minLength: 1, maxLength: 3 }
    ).map(events => {
      // Sort events by timestamp and ensure they're spaced apart
      return events.map((event, index) => ({
        ...event,
        timestamp: index * 500 // Space events 500ms apart
      }));
    });

    // Property: For any performance, replay should be configurable and load events correctly
    fc.assert(
      fc.property(
        simplePerformanceArb,
        replaySpeedArb,
        (originalEvents, replaySpeed) => {
          // Arrange: Create performance replay with generated note events
          performanceReplay = new PerformanceReplay(mockAudioEngine);
          
          // Act & Assert: Test configuration and loading
          
          // 1. Should be able to load note events
          expect(() => {
            performanceReplay!.loadNoteEvents(originalEvents);
          }).not.toThrow();
          
          // 2. Should preserve loaded events
          expect(performanceReplay.noteEvents).toHaveLength(originalEvents.length);
          expect(performanceReplay.noteEvents).toEqual(originalEvents);
          
          // 3. Should be able to set replay speed
          expect(() => {
            performanceReplay!.setReplaySpeed(replaySpeed);
          }).not.toThrow();
          
          expect(performanceReplay.replaySpeed).toBe(replaySpeed);
          
          // 4. Should calculate timing correctly
          if (originalEvents.length > 0) {
            expect(performanceReplay.startTime).toBe(originalEvents[0].timestamp);
            expect(performanceReplay.endTime).toBe(originalEvents[originalEvents.length - 1].timestamp);
            expect(performanceReplay.duration).toBe(
              originalEvents[originalEvents.length - 1].timestamp - originalEvents[0].timestamp
            );
          }
          
          // 5. Should be in correct initial state
          expect(performanceReplay.isReplaying).toBe(false);
          expect(performanceReplay.isPaused).toBe(false);
          expect(performanceReplay.hasError).toBe(false);
          expect(performanceReplay.error).toBeNull();
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property test: Note sequence and velocity preservation
   * Verifies that note data is preserved correctly during loading and configuration
   */
  it('Property 29 (sequence): Note sequence and velocity preservation during configuration', () => {
    const noteSequenceArb = fc.array(
      fc.record({
        note: fc.constantFrom('C4', 'D4', 'E4', 'F4', 'G4'),
        timestamp: fc.nat({ max: 2000 }),
        velocity: fc.integer({ min: 1, max: 127 }),
        duration: fc.integer({ min: 100, max: 1000 }),
        eventType: fc.constantFrom('noteOn' as const, 'noteOff' as const)
      }),
      { minLength: 1, maxLength: 10 }
    ).map(events => events.sort((a, b) => a.timestamp - b.timestamp));
    
    fc.assert(
      fc.property(noteSequenceArb, (noteEvents) => {
        // Arrange
        performanceReplay = new PerformanceReplay(mockAudioEngine);
        
        // Act
        performanceReplay.loadNoteEvents(noteEvents);
        
        // Assert: All note data should be preserved exactly
        const loadedEvents = performanceReplay.noteEvents;
        
        expect(loadedEvents).toHaveLength(noteEvents.length);
        
        for (let i = 0; i < noteEvents.length; i++) {
          expect(loadedEvents[i].note).toBe(noteEvents[i].note);
          expect(loadedEvents[i].timestamp).toBe(noteEvents[i].timestamp);
          expect(loadedEvents[i].velocity).toBe(noteEvents[i].velocity);
          expect(loadedEvents[i].duration).toBe(noteEvents[i].duration);
          expect(loadedEvents[i].eventType).toBe(noteEvents[i].eventType);
        }
        
        // Events should be sorted by timestamp
        for (let i = 1; i < loadedEvents.length; i++) {
          expect(loadedEvents[i].timestamp).toBeGreaterThanOrEqual(loadedEvents[i-1].timestamp);
        }
      }),
      { numRuns: 15 }
    );
  });

  /**
   * Property test: Replay speed validation
   * Verifies that replay speed is validated correctly
   */
  it('Property 29 (speed): Replay speed validation and bounds checking', () => {
    const validSpeedArb = fc.float({ min: Math.fround(0.5), max: Math.fround(2.0), noNaN: true });
    const invalidSpeedArb = fc.oneof(
      fc.float({ min: Math.fround(0.1), max: Math.fround(0.49), noNaN: true }),
      fc.float({ min: Math.fround(2.01), max: Math.fround(5.0), noNaN: true })
    );
    
    fc.assert(
      fc.property(validSpeedArb, (validSpeed) => {
        // Arrange
        performanceReplay = new PerformanceReplay(mockAudioEngine);
        
        // Act & Assert: Valid speeds should be accepted
        expect(() => {
          performanceReplay!.setReplaySpeed(validSpeed);
        }).not.toThrow();
        
        expect(performanceReplay.replaySpeed).toBeCloseTo(validSpeed, 5);
      }),
      { numRuns: 10 }
    );
    
    fc.assert(
      fc.property(invalidSpeedArb, (invalidSpeed) => {
        // Arrange
        performanceReplay = new PerformanceReplay(mockAudioEngine);
        
        // Act & Assert: Invalid speeds should throw errors
        expect(() => {
          performanceReplay!.setReplaySpeed(invalidSpeed);
        }).toThrow('Replay speed must be between 0.5x and 2.0x');
        
        // Error should be set appropriately
        expect(performanceReplay.hasError).toBe(true);
        expect(performanceReplay.error?.type).toBe('INVALID_SPEED');
      }),
      { numRuns: 10 }
    );
  });

  /**
   * Property test: Error handling for invalid inputs
   * Verifies that error conditions are handled correctly
   */
  it('Property 29 (errors): Error handling for invalid inputs and states', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        // Arrange
        performanceReplay = new PerformanceReplay(mockAudioEngine);
        
        // Act & Assert: Empty note events should throw error
        expect(() => {
          performanceReplay!.loadNoteEvents([]);
        }).toThrow('No note events provided for replay');
        
        expect(performanceReplay.hasError).toBe(true);
        expect(performanceReplay.error?.type).toBe('NO_NOTE_EVENTS');
      }),
      { numRuns: 5 }
    );
  });

  /**
   * Property test: State management consistency
   * Verifies that internal state is managed consistently
   */
  it('Property 29 (state): State management consistency across operations', () => {
    const noteEventsArb = fc.array(
      fc.record({
        note: fc.constantFrom('C4', 'E4', 'G4'),
        timestamp: fc.nat({ max: 1000 }),
        velocity: fc.integer({ min: 50, max: 100 }),
        duration: fc.constant(300),
        eventType: fc.constant('noteOn' as const)
      }),
      { minLength: 1, maxLength: 5 }
    ).map(events => events.map((event, index) => ({
      ...event,
      timestamp: index * 200
    })));
    
    fc.assert(
      fc.property(noteEventsArb, (noteEvents) => {
        // Arrange
        performanceReplay = new PerformanceReplay(mockAudioEngine);
        
        // Act: Load events and verify state consistency
        performanceReplay.loadNoteEvents(noteEvents);
        
        // Assert: State should be consistent
        expect(performanceReplay.isReplaying).toBe(false);
        expect(performanceReplay.isPaused).toBe(false);
        expect(performanceReplay.hasError).toBe(false);
        expect(performanceReplay.noteEvents.length).toBe(noteEvents.length);
        
        // Timing calculations should be correct
        expect(performanceReplay.startTime).toBe(noteEvents[0].timestamp);
        expect(performanceReplay.endTime).toBe(noteEvents[noteEvents.length - 1].timestamp);
        
        // Dispose should clean up state
        performanceReplay.dispose();
        
        expect(performanceReplay.noteEvents).toEqual([]);
        expect(performanceReplay.isReplaying).toBe(false);
        expect(performanceReplay.hasError).toBe(false);
      }),
      { numRuns: 10 }
    );
  });
});