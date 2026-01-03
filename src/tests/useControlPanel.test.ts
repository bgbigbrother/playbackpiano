import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useControlPanel } from '../hooks/useControlPanel';

describe('useControlPanel', () => {
  it('initializes with correct default values', () => {
    const { result } = renderHook(() => useControlPanel());
    
    expect(result.current.isOpen).toBe(false);
    expect(result.current.keyMarkingEnabled).toBe(false);
    expect(result.current.metronomeVisible).toBe(false);
    expect(result.current.labelsVisible).toBe(true); // Default to visible
    expect(result.current.recorderVisible).toBe(false);
    expect(result.current.markedKeys.size).toBe(0);
    expect(result.current.noteLog).toEqual([]);
    expect(result.current.metronomeActive).toBe(false);
    expect(result.current.bpm).toBe(100); // Default BPM
    expect(result.current.isRecording).toBe(false);
    expect(result.current.recordedAudio).toBe(null);
    expect(result.current.recordingDuration).toBe(0);
  });

  it('toggles panel visibility', () => {
    const { result } = renderHook(() => useControlPanel());
    
    act(() => {
      result.current.togglePanel();
    });
    
    expect(result.current.isOpen).toBe(true);
    
    act(() => {
      result.current.togglePanel();
    });
    
    expect(result.current.isOpen).toBe(false);
  });

  it('toggles feature visibility', () => {
    const { result } = renderHook(() => useControlPanel());
    
    act(() => {
      result.current.toggleKeyMarking();
    });
    expect(result.current.keyMarkingEnabled).toBe(true);
    
    act(() => {
      result.current.toggleMetronomeVisible();
    });
    expect(result.current.metronomeVisible).toBe(true);
    
    act(() => {
      result.current.toggleLabelsVisible();
    });
    expect(result.current.labelsVisible).toBe(false);
    
    act(() => {
      result.current.toggleRecorderVisible();
    });
    expect(result.current.recorderVisible).toBe(true);
  });

  it('manages marked keys correctly', () => {
    const { result } = renderHook(() => useControlPanel());
    
    // Add a key
    act(() => {
      result.current.toggleMarkedKey('C4');
    });
    expect(result.current.markedKeys.has('C4')).toBe(true);
    expect(result.current.markedKeys.size).toBe(1);
    
    // Add another key
    act(() => {
      result.current.toggleMarkedKey('E4');
    });
    expect(result.current.markedKeys.has('E4')).toBe(true);
    expect(result.current.markedKeys.size).toBe(2);
    
    // Remove a key
    act(() => {
      result.current.toggleMarkedKey('C4');
    });
    expect(result.current.markedKeys.has('C4')).toBe(false);
    expect(result.current.markedKeys.has('E4')).toBe(true);
    expect(result.current.markedKeys.size).toBe(1);
    
    // Clear all keys
    act(() => {
      result.current.clearMarkedKeys();
    });
    expect(result.current.markedKeys.size).toBe(0);
  });

  it('manages note log correctly', () => {
    const { result } = renderHook(() => useControlPanel());
    
    // Add a note
    act(() => {
      result.current.addNoteEntry('C4');
    });
    expect(result.current.noteLog).toHaveLength(1);
    expect(result.current.noteLog[0].note).toBe('C4');
    expect(result.current.noteLog[0].id).toBeDefined();
    expect(result.current.noteLog[0].timestamp).toBeDefined();
    
    // Add another note
    act(() => {
      result.current.addNoteEntry('E4');
    });
    expect(result.current.noteLog).toHaveLength(2);
    expect(result.current.noteLog[1].note).toBe('E4');
    
    // Clear log
    act(() => {
      result.current.clearNoteLog();
    });
    expect(result.current.noteLog).toHaveLength(0);
  });

  it('manages metronome state correctly', () => {
    const { result } = renderHook(() => useControlPanel());
    
    // Toggle metronome
    act(() => {
      result.current.toggleMetronome();
    });
    expect(result.current.metronomeActive).toBe(true);
    
    // Set BPM
    act(() => {
      result.current.setBPM(120);
    });
    expect(result.current.bpm).toBe(120);
    
    // Test BPM clamping
    act(() => {
      result.current.setBPM(400); // Above max
    });
    expect(result.current.bpm).toBe(300); // Should be clamped to max
    
    act(() => {
      result.current.setBPM(10); // Below min
    });
    expect(result.current.bpm).toBe(30); // Should be clamped to min
  });

  it('limits note log to 100 entries', () => {
    const { result } = renderHook(() => useControlPanel());
    
    // Add 105 notes
    act(() => {
      for (let i = 0; i < 105; i++) {
        result.current.addNoteEntry(`C${i % 8}`);
      }
    });
    
    // Should only keep the last 100
    expect(result.current.noteLog).toHaveLength(100);
    
    // The first 5 entries should have been removed
    expect(result.current.noteLog[0].note).toBe('C5');
    expect(result.current.noteLog[99].note).toBe('C0');
  });
});