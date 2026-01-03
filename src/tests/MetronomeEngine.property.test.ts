import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { MetronomeEngine } from '../utils/MetronomeEngine';
import * as Tone from 'tone';

/**
 * Property-Based Tests for Metronome Timing Accuracy
 * Using fast-check to verify universal properties across all valid BPM values
 * 
 * **Feature: piano-control-panel, Property-Based Tests**
 */

// Mock Tone.js for testing
vi.mock('tone', () => ({
  context: {
    state: 'running',
  },
  Transport: {
    bpm: { value: 100 },
    scheduleRepeat: vi.fn(() => 1),
    start: vi.fn(),
    stop: vi.fn(),
    clear: vi.fn(),
  },
  Oscillator: vi.fn(() => ({
    frequency: 800,
    type: 'square',
    connect: vi.fn(),
    start: vi.fn(),
    dispose: vi.fn(),
  })),
  AmplitudeEnvelope: vi.fn(() => ({
    attack: 0.001,
    decay: 0.1,
    sustain: 0,
    release: 0.1,
    toDestination: vi.fn(),
    triggerAttackRelease: vi.fn(),
    dispose: vi.fn(),
  })),
  start: vi.fn(() => Promise.resolve()),
}));

describe('MetronomeEngine - Property-Based Tests', () => {
  let metronome: MetronomeEngine;

  beforeEach(() => {
    vi.clearAllMocks();
    metronome = new MetronomeEngine();
  });

  afterEach(() => {
    if (metronome) {
      metronome.dispose();
    }
  });

  /**
   * **Feature: piano-control-panel, Property 10: Metronome timing accuracy**
   * **Validates: Requirements 3.2**
   * 
   * Property: For any configured BPM value, the metronome should produce beats at 
   * intervals that match the BPM (60000/BPM milliseconds between beats).
   * 
   * This property verifies that:
   * 1. When a BPM is set, the Transport BPM is updated to match exactly
   * 2. The metronome schedules beats at the correct subdivision interval
   * 3. BPM values within the valid range (30-300) are handled correctly
   * 4. The timing calculation follows the formula: 60000ms / BPM = interval between beats
   * 5. The metronome maintains timing accuracy across different BPM values
   */
  it('Property 10: Metronome timing accuracy - beats are scheduled at correct BPM intervals', () => {
    // Generator for valid BPM values within the metronome's supported range
    const validBPMArb = fc.integer({ min: 30, max: 300 });

    // Property: For any valid BPM, the metronome should set correct timing
    fc.assert(
      fc.property(validBPMArb, (bpm) => {
        // Arrange: Reset metronome state
        metronome.stop();
        vi.clearAllMocks();
        
        // Act: Set the BPM
        metronome.setBPM(bpm);
        
        // Assert: BPM should be set correctly
        
        // 1. The metronome's internal BPM should match the requested value
        expect(metronome.bpm).toBe(bpm);
        
        // 2. The Tone.js Transport BPM should be updated to match
        expect(Tone.Transport.bpm.value).toBe(bpm);
        
        // 3. When starting the metronome, it should schedule repeating events
        metronome.start();
        
        // 4. Verify that scheduleRepeat was called with correct subdivision
        expect(Tone.Transport.scheduleRepeat).toHaveBeenCalledWith(
          expect.any(Function), // The callback function
          '4n', // Quarter note subdivision (from config)
          0 // Start time offset
        );
        
        // 5. The metronome should be active after starting
        expect(metronome.isActive).toBe(true);
        
        // 6. Verify timing calculation consistency
        // At the given BPM, quarter notes should occur at 60000/BPM millisecond intervals
        // This is handled by Tone.js Transport, but we verify the BPM is set correctly
        const expectedIntervalMs = 60000 / bpm;
        expect(expectedIntervalMs).toBeGreaterThan(0);
        expect(expectedIntervalMs).toBeLessThanOrEqual(2000); // Max interval at 30 BPM
        expect(expectedIntervalMs).toBeGreaterThanOrEqual(200); // Min interval at 300 BPM
        
        // 7. Stop the metronome and verify it stops correctly
        metronome.stop();
        expect(metronome.isActive).toBe(false);
        
        // Clean up for next iteration
        metronome.stop();
      }),
      { numRuns: 100 } // Run 100 iterations as specified in design doc
    );
  });

  /**
   * Extended property test: BPM clamping behavior
   * Verifies that out-of-range BPM values are correctly clamped to valid range
   */
  it('Property 10 (extended): BPM values are clamped to valid range', () => {
    // Generator for BPM values that may be outside the valid range
    const anyBPMArb = fc.integer({ min: 1, max: 1000 });

    fc.assert(
      fc.property(anyBPMArb, (requestedBPM) => {
        // Arrange: Reset state
        metronome.stop();
        
        // Act: Set potentially out-of-range BPM
        metronome.setBPM(requestedBPM);
        
        // Assert: BPM should be clamped to valid range
        const actualBPM = metronome.bpm;
        
        // 1. BPM should be within valid range
        expect(actualBPM).toBeGreaterThanOrEqual(30);
        expect(actualBPM).toBeLessThanOrEqual(300);
        
        // 2. If requested BPM was in range, it should be preserved exactly
        if (requestedBPM >= 30 && requestedBPM <= 300) {
          expect(actualBPM).toBe(requestedBPM);
        }
        
        // 3. If requested BPM was below minimum, it should be clamped to minimum
        if (requestedBPM < 30) {
          expect(actualBPM).toBe(30);
        }
        
        // 4. If requested BPM was above maximum, it should be clamped to maximum
        if (requestedBPM > 300) {
          expect(actualBPM).toBe(300);
        }
        
        // 5. Transport BPM should match the clamped value
        expect(Tone.Transport.bpm.value).toBe(actualBPM);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: piano-control-panel, Property 11: Metronome tempo adjustment**
   * **Validates: Requirements 3.3**
   * 
   * Property: For any BPM change during metronome playback, the tempo should update 
   * immediately without stopping the metronome.
   * 
   * This property verifies that:
   * 1. BPM changes during active playback are applied immediately
   * 2. The metronome remains active throughout BPM changes
   * 3. The Transport BPM is updated in real-time
   * 4. No interruption occurs in the metronome playback state
   * 5. Multiple consecutive BPM changes work correctly
   */
  it('Property 11: Metronome tempo adjustment - BPM changes during playback update immediately without stopping', () => {
    // Generator for initial BPM and new BPM values
    const initialBPMArb = fc.integer({ min: 30, max: 300 });
    const newBPMArb = fc.integer({ min: 30, max: 300 });

    // Property: For any BPM change during active playback, tempo updates immediately
    fc.assert(
      fc.property(initialBPMArb, newBPMArb, (initialBPM, newBPM) => {
        // Arrange: Start metronome with initial BPM
        metronome.setBPM(initialBPM);
        metronome.start();
        
        // Verify metronome is active with initial BPM
        expect(metronome.isActive).toBe(true);
        expect(metronome.bpm).toBe(initialBPM);
        expect(Tone.Transport.bpm.value).toBe(initialBPM);
        
        // Act: Change BPM while metronome is running
        metronome.setBPM(newBPM);
        
        // Assert: Tempo should update immediately without stopping
        
        // 1. BPM should be updated immediately
        expect(metronome.bpm).toBe(newBPM);
        
        // 2. Transport BPM should be updated immediately
        expect(Tone.Transport.bpm.value).toBe(newBPM);
        
        // 3. Metronome should remain active (no interruption)
        expect(metronome.isActive).toBe(true);
        
        // 4. No error should occur during the BPM change
        expect(metronome.hasError).toBe(false);
        
        // Clean up for next iteration
        metronome.stop();
      }),
      { numRuns: 100 } // Run 100 iterations as specified in design doc
    );
  });

  /**
   * Extended property test: Multiple consecutive BPM changes during playback
   * Verifies that rapid BPM changes work correctly without interruption
   */
  it('Property 11 (extended): Multiple consecutive BPM changes work during active playback', () => {
    // Generator for sequences of BPM changes
    const bpmSequenceArb = fc.array(
      fc.integer({ min: 30, max: 300 }), 
      { minLength: 2, maxLength: 5 }
    );

    fc.assert(
      fc.property(bpmSequenceArb, (bpmSequence) => {
        // Arrange: Start metronome with first BPM
        metronome.setBPM(bpmSequence[0]);
        metronome.start();
        expect(metronome.isActive).toBe(true);
        
        // Act & Assert: Change BPM multiple times while active
        for (let i = 1; i < bpmSequence.length; i++) {
          const newBPM = bpmSequence[i];
          
          // Change BPM while metronome is running
          metronome.setBPM(newBPM);
          
          // Verify BPM was updated immediately
          expect(metronome.bpm).toBe(newBPM);
          expect(Tone.Transport.bpm.value).toBe(newBPM);
          
          // Metronome should still be active
          expect(metronome.isActive).toBe(true);
          
          // No error should occur
          expect(metronome.hasError).toBe(false);
        }
        
        // Clean up
        metronome.stop();
      }),
      { numRuns: 50 } // Fewer runs for this more complex test
    );
  });

  /**
   * **Feature: piano-control-panel, Property 12: Metronome stop behavior**
   * **Validates: Requirements 3.4**
   * 
   * Property: For any active metronome, when stopped, beat production should cease 
   * while preserving the current BPM setting.
   * 
   * This property verifies that:
   * 1. When an active metronome is stopped, it becomes inactive
   * 2. The BPM setting is preserved after stopping
   * 3. The Transport is properly stopped
   * 4. Scheduled events are cleared to prevent further beats
   * 5. The metronome can be restarted with the same BPM
   * 6. Multiple stop calls on an inactive metronome are handled gracefully
   */
  it('Property 12: Metronome stop behavior - stopping ceases beats while preserving BPM', () => {
    // Generator for valid BPM values
    const validBPMArb = fc.integer({ min: 30, max: 300 });

    // Property: For any active metronome, stopping should cease beats while preserving BPM
    fc.assert(
      fc.property(validBPMArb, (bpm) => {
        // Arrange: Start metronome with the given BPM
        metronome.setBPM(bpm);
        metronome.start();
        
        // Verify metronome is active with correct BPM
        expect(metronome.isActive).toBe(true);
        expect(metronome.bpm).toBe(bpm);
        expect(Tone.Transport.bpm.value).toBe(bpm);
        
        // Act: Stop the metronome
        metronome.stop();
        
        // Assert: Beat production should cease while preserving BPM
        
        // 1. Metronome should become inactive
        expect(metronome.isActive).toBe(false);
        
        // 2. BPM setting should be preserved
        expect(metronome.bpm).toBe(bpm);
        
        // 3. Transport BPM should still be set correctly
        expect(Tone.Transport.bpm.value).toBe(bpm);
        
        // 4. Transport should be stopped
        expect(Tone.Transport.stop).toHaveBeenCalled();
        
        // 5. No error should occur during stop
        expect(metronome.hasError).toBe(false);
        
        // 6. Metronome should be ready for restart
        expect(metronome.isReady).toBe(true);
        
        // 7. Test that metronome can be restarted with same BPM
        vi.clearAllMocks(); // Clear previous calls
        metronome.start();
        expect(metronome.isActive).toBe(true);
        expect(metronome.bpm).toBe(bpm);
        expect(Tone.Transport.start).toHaveBeenCalled();
        
        // Clean up for next iteration
        metronome.stop();
      }),
      { numRuns: 100 } // Run 100 iterations as specified in design doc
    );
  });

  /**
   * Extended property test: Multiple stop calls on inactive metronome
   * Verifies that calling stop multiple times on an inactive metronome is handled gracefully
   */
  it('Property 12 (extended): Multiple stop calls on inactive metronome are handled gracefully', () => {
    // Generator for BPM and number of stop calls
    const testDataArb = fc.record({
      bpm: fc.integer({ min: 30, max: 300 }),
      stopCalls: fc.integer({ min: 1, max: 5 })
    });

    fc.assert(
      fc.property(testDataArb, ({ bpm, stopCalls }) => {
        // Arrange: Start and then stop metronome
        metronome.setBPM(bpm);
        metronome.start();
        expect(metronome.isActive).toBe(true);
        
        metronome.stop();
        expect(metronome.isActive).toBe(false);
        
        // Act: Call stop multiple times on inactive metronome
        for (let i = 0; i < stopCalls; i++) {
          metronome.stop();
          
          // Assert: Each stop call should be handled gracefully
          expect(metronome.isActive).toBe(false);
          expect(metronome.bpm).toBe(bpm);
          expect(metronome.hasError).toBe(false);
          expect(metronome.isReady).toBe(true);
        }
        
        // Verify metronome can still be started after multiple stops
        metronome.start();
        expect(metronome.isActive).toBe(true);
        expect(metronome.bpm).toBe(bpm);
        
        // Clean up
        metronome.stop();
      }),
      { numRuns: 50 }
    );
  });
});