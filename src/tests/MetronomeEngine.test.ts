import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MetronomeEngine } from '../utils/MetronomeEngine';
import * as Tone from 'tone';

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

describe('MetronomeEngine', () => {
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

  describe('Initialization', () => {
    it('should initialize with default BPM of 100', () => {
      expect(metronome.bpm).toBe(100);
      expect(metronome.isActive).toBe(false);
      expect(metronome.isReady).toBe(true);
    });

    it('should have correct BPM range', () => {
      const range = metronome.bpmRange;
      expect(range.min).toBe(30);
      expect(range.max).toBe(300);
    });

    it('should not have errors on successful initialization', () => {
      expect(metronome.hasError).toBe(false);
      expect(metronome.error).toBeNull();
    });
  });

  describe('BPM Management', () => {
    it('should set BPM within valid range', () => {
      metronome.setBPM(120);
      expect(metronome.bpm).toBe(120);
      expect(Tone.Transport.bpm.value).toBe(120);
    });

    it('should clamp BPM to minimum value', () => {
      metronome.setBPM(10); // Below minimum of 30
      expect(metronome.bpm).toBe(30);
    });

    it('should clamp BPM to maximum value', () => {
      metronome.setBPM(500); // Above maximum of 300
      expect(metronome.bpm).toBe(300);
    });

    it('should update Transport BPM immediately', () => {
      metronome.setBPM(140);
      expect(Tone.Transport.bpm.value).toBe(140);
    });
  });

  describe('Start/Stop Functionality', () => {
    it('should start metronome successfully', () => {
      metronome.start();
      expect(metronome.isActive).toBe(true);
      expect(Tone.Transport.scheduleRepeat).toHaveBeenCalled();
      expect(Tone.Transport.start).toHaveBeenCalled();
    });

    it('should stop metronome successfully', () => {
      metronome.start();
      metronome.stop();
      expect(metronome.isActive).toBe(false);
      expect(Tone.Transport.stop).toHaveBeenCalled();
      expect(Tone.Transport.clear).toHaveBeenCalled();
    });

    it('should not start if already active', () => {
      metronome.start();
      vi.clearAllMocks();
      
      metronome.start(); // Try to start again
      expect(Tone.Transport.scheduleRepeat).not.toHaveBeenCalled();
    });

    it('should not stop if already stopped', () => {
      vi.clearAllMocks();
      
      metronome.stop(); // Try to stop when not active
      expect(Tone.Transport.stop).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should provide user-friendly error messages', () => {
      // Test with a mock error
      const metronomeWithError = new MetronomeEngine();
      metronomeWithError['_error'] = {
        type: 'CONTEXT_UNAVAILABLE',
        message: 'Test error'
      };

      const errorMessage = metronomeWithError.getErrorMessage();
      expect(errorMessage).toBe('Audio system not available. Please try refreshing the page.');
    });

    it('should clear errors when requested', () => {
      const metronomeWithError = new MetronomeEngine();
      metronomeWithError['_error'] = {
        type: 'TRANSPORT_ERROR',
        message: 'Test error'
      };

      expect(metronomeWithError.hasError).toBe(true);
      metronomeWithError.clearError();
      expect(metronomeWithError.hasError).toBe(false);
    });
  });

  describe('Disposal', () => {
    it('should clean up resources on disposal', () => {
      metronome.start();
      metronome.dispose();
      
      expect(metronome.isActive).toBe(false);
      expect(metronome['_isInitialized']).toBe(false);
    });

    it('should stop metronome before disposal if active', () => {
      metronome.start();
      vi.clearAllMocks();
      
      metronome.dispose();
      expect(Tone.Transport.stop).toHaveBeenCalled();
    });
  });
});