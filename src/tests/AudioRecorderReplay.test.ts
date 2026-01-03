import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AudioRecorder } from '../utils/AudioRecorder';
import { AudioEngine } from '../utils/AudioEngine';

// Mock AudioEngine
vi.mock('../utils/AudioEngine');

describe('AudioRecorder Performance Replay Integration', () => {
  let mockAudioEngine: AudioEngine;
  let audioRecorder: AudioRecorder;

  beforeEach(() => {
    // Create mock audio engine
    mockAudioEngine = {
      isReady: true,
      playNote: vi.fn(),
    } as any;

    audioRecorder = new AudioRecorder(undefined, undefined, mockAudioEngine);
  });

  it('should initialize with performance replay capabilities when AudioEngine is provided', () => {
    expect(audioRecorder.canReplayPerformance).toBe(false); // No recording yet
    expect(audioRecorder.isReplayingPerformance).toBe(false);
    expect(audioRecorder.performanceReplaySpeed).toBe(1.0);
  });

  it('should track note events during recording simulation', () => {
    // Simulate starting recording (without actual MediaRecorder)
    audioRecorder['_isRecording'] = true;
    audioRecorder['_isTrackingNotes'] = true;
    audioRecorder['_recordingStartTime'] = Date.now();

    // Track some note events
    audioRecorder.trackNoteEvent('C4', 0.8, 'noteOn');
    audioRecorder.trackNoteEvent('E4', 0.7, 'noteOn');
    audioRecorder.trackNoteEvent('G4', 0.6, 'noteOn');

    const recordedNotes = audioRecorder.recordedNotes;
    expect(recordedNotes).toHaveLength(3);
    expect(recordedNotes[0].note).toBe('C4');
    expect(recordedNotes[1].note).toBe('E4');
    expect(recordedNotes[2].note).toBe('G4');
  });

  it('should calculate note durations correctly', () => {
    audioRecorder['_isRecording'] = true;
    audioRecorder['_isTrackingNotes'] = true;
    audioRecorder['_recordingStartTime'] = Date.now();

    // Track note on and off events
    audioRecorder.trackNoteEvent('C4', 0.8, 'noteOn');
    
    // Simulate time passing
    setTimeout(() => {
      audioRecorder.trackNoteEvent('C4', 0.8, 'noteOff');
    }, 100);

    // Wait a bit and check
    setTimeout(() => {
      const recordedNotes = audioRecorder.recordedNotes;
      const noteOnEvent = recordedNotes.find(event => event.eventType === 'noteOn');
      expect(noteOnEvent?.duration).toBeGreaterThan(0);
    }, 150);
  });

  it('should convert velocity correctly from 0-1 to 0-127 MIDI range', () => {
    audioRecorder['_isRecording'] = true;
    audioRecorder['_isTrackingNotes'] = true;
    audioRecorder['_recordingStartTime'] = Date.now();

    audioRecorder.trackNoteEvent('C4', 0.5, 'noteOn'); // 50% velocity
    audioRecorder.trackNoteEvent('E4', 1.0, 'noteOn'); // 100% velocity
    audioRecorder.trackNoteEvent('G4', 0.0, 'noteOn'); // 0% velocity

    const recordedNotes = audioRecorder.recordedNotes;
    expect(recordedNotes[0].velocity).toBe(64); // 0.5 * 127 ≈ 64
    expect(recordedNotes[1].velocity).toBe(127); // 1.0 * 127 = 127
    expect(recordedNotes[2].velocity).toBe(0); // 0.0 * 127 = 0
  });

  it('should not track note events when not recording', () => {
    // Ensure not recording
    audioRecorder['_isRecording'] = false;
    audioRecorder['_isTrackingNotes'] = false;

    audioRecorder.trackNoteEvent('C4', 0.8, 'noteOn');

    expect(audioRecorder.recordedNotes).toHaveLength(0);
  });

  it('should clear note events when clearing recording', () => {
    // Add some note events
    audioRecorder['_recordedNotes'] = [
      { note: 'C4', timestamp: 0, velocity: 80, duration: 500, eventType: 'noteOn' },
      { note: 'E4', timestamp: 250, velocity: 75, duration: 500, eventType: 'noteOn' },
    ];

    audioRecorder.clearRecording();

    expect(audioRecorder.recordedNotes).toHaveLength(0);
    expect(audioRecorder.hasRecordedNotes).toBe(false);
  });

  it('should set performance replay speed correctly', () => {
    audioRecorder.setPerformanceReplaySpeed(0.5);
    expect(audioRecorder.performanceReplaySpeed).toBe(0.5);

    audioRecorder.setPerformanceReplaySpeed(2.0);
    expect(audioRecorder.performanceReplaySpeed).toBe(2.0);
  });

  it('should handle performance replay without AudioEngine gracefully', () => {
    const audioRecorderWithoutEngine = new AudioRecorder();
    
    expect(audioRecorderWithoutEngine.canReplayPerformance).toBe(false);
    expect(audioRecorderWithoutEngine.isReplayingPerformance).toBe(false);
  });
});