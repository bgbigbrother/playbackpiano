import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PerformanceReplay } from '../utils/PerformanceReplay';
import { AudioEngine } from '../utils/AudioEngine';
import { TimedNoteEvent } from '../utils/AudioRecorder';

// Mock AudioEngine
vi.mock('../utils/AudioEngine');

describe('PerformanceReplay', () => {
  let mockAudioEngine: AudioEngine;
  let performanceReplay: PerformanceReplay;

  beforeEach(() => {
    // Create mock audio engine
    mockAudioEngine = {
      isReady: true,
      playNote: vi.fn(),
    } as any;

    performanceReplay = new PerformanceReplay(mockAudioEngine);
  });

  it('should initialize with empty note events', () => {
    expect(performanceReplay.noteEvents).toEqual([]);
    expect(performanceReplay.isReplaying).toBe(false);
    expect(performanceReplay.isPaused).toBe(false);
    expect(performanceReplay.replaySpeed).toBe(1.0);
  });

  it('should load note events correctly', () => {
    const noteEvents: TimedNoteEvent[] = [
      { note: 'C4', timestamp: 0, velocity: 80, duration: 500, eventType: 'noteOn' },
      { note: 'E4', timestamp: 250, velocity: 75, duration: 500, eventType: 'noteOn' },
      { note: 'G4', timestamp: 500, velocity: 70, duration: 500, eventType: 'noteOn' },
    ];

    performanceReplay.loadNoteEvents(noteEvents);

    expect(performanceReplay.noteEvents).toEqual(noteEvents);
    expect(performanceReplay.startTime).toBe(0);
    expect(performanceReplay.endTime).toBe(500);
    expect(performanceReplay.duration).toBe(500);
  });

  it('should throw error when loading empty note events', () => {
    expect(() => {
      performanceReplay.loadNoteEvents([]);
    }).toThrow('No note events provided for replay');
  });

  it('should set replay speed within valid range', () => {
    performanceReplay.setReplaySpeed(0.5);
    expect(performanceReplay.replaySpeed).toBe(0.5);

    performanceReplay.setReplaySpeed(2.0);
    expect(performanceReplay.replaySpeed).toBe(2.0);

    performanceReplay.setReplaySpeed(1.5);
    expect(performanceReplay.replaySpeed).toBe(1.5);
  });

  it('should throw error for invalid replay speed', () => {
    expect(() => {
      performanceReplay.setReplaySpeed(0.3);
    }).toThrow('Replay speed must be between 0.5x and 2.0x');

    expect(() => {
      performanceReplay.setReplaySpeed(2.5);
    }).toThrow('Replay speed must be between 0.5x and 2.0x');
  });

  it('should throw error when starting replay without audio engine ready', async () => {
    // Create a new mock with isReady set to false
    const mockAudioEngineNotReady = {
      isReady: false,
      playNote: vi.fn(),
    } as any;
    
    const performanceReplayNotReady = new PerformanceReplay(mockAudioEngineNotReady);
    
    const noteEvents: TimedNoteEvent[] = [
      { note: 'C4', timestamp: 0, velocity: 80, duration: 500, eventType: 'noteOn' },
    ];
    
    performanceReplayNotReady.loadNoteEvents(noteEvents);

    await expect(performanceReplayNotReady.startReplay()).rejects.toThrow('Audio engine is not ready for playback');
  });

  it('should throw error when starting replay without note events', async () => {
    await expect(performanceReplay.startReplay()).rejects.toThrow('No note events loaded for replay');
  });

  it('should dispose correctly', () => {
    const noteEvents: TimedNoteEvent[] = [
      { note: 'C4', timestamp: 0, velocity: 80, duration: 500, eventType: 'noteOn' },
    ];
    
    performanceReplay.loadNoteEvents(noteEvents);
    performanceReplay.dispose();

    expect(performanceReplay.noteEvents).toEqual([]);
    expect(performanceReplay.isReplaying).toBe(false);
    expect(performanceReplay.hasError).toBe(false);
  });
});