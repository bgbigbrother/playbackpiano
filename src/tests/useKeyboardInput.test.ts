import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useKeyboardInput } from '../hooks/useKeyboardInput';

// Mock the keyboardLayout utility
vi.mock('../utils/keyboardLayout', () => ({
  getPianoNoteForKey: vi.fn((key: string) => {
    const mapping: Record<string, string> = {
      'z': 'A0',
      'x': 'A#0',
      'c': 'B0',
      'v': 'C1',
      'b': 'D1',
      'n': 'E1'
    };
    return mapping[key] || null;
  })
}));

describe('useKeyboardInput', () => {
  let onKeyPress: ReturnType<typeof vi.fn>;
  let onKeyRelease: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onKeyPress = vi.fn();
    onKeyRelease = vi.fn();
    
    // Clear any existing event listeners
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up any remaining event listeners
    vi.restoreAllMocks();
  });

  it('should call onKeyPress when a mapped key is pressed', () => {
    renderHook(() => useKeyboardInput({
      onKeyPress,
      onKeyRelease,
      enabled: true
    }));

    // Simulate keydown event
    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'z' });
      window.dispatchEvent(event);
    });

    expect(onKeyPress).toHaveBeenCalledWith('A0');
  });

  it('should call onKeyRelease when a mapped key is released', () => {
    renderHook(() => useKeyboardInput({
      onKeyPress,
      onKeyRelease,
      enabled: true
    }));

    // Simulate keydown then keyup
    act(() => {
      const keydownEvent = new KeyboardEvent('keydown', { key: 'z' });
      window.dispatchEvent(keydownEvent);
    });

    act(() => {
      const keyupEvent = new KeyboardEvent('keyup', { key: 'z' });
      window.dispatchEvent(keyupEvent);
    });

    expect(onKeyRelease).toHaveBeenCalledWith('A0');
  });

  it('should not call callbacks for unmapped keys', () => {
    renderHook(() => useKeyboardInput({
      onKeyPress,
      onKeyRelease,
      enabled: true
    }));

    // Simulate keydown event for unmapped key
    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      window.dispatchEvent(event);
    });

    expect(onKeyPress).not.toHaveBeenCalled();
  });

  it('should ignore multiple unmapped keys without any side effects', () => {
    renderHook(() => useKeyboardInput({
      onKeyPress,
      onKeyRelease,
      enabled: true
    }));

    // Simulate multiple unmapped keys
    const unmappedKeys = ['Escape', 'Tab', 'Enter', 'Shift', 'Control', 'Alt', 'Meta', 'F1', 'F12'];
    
    act(() => {
      unmappedKeys.forEach(key => {
        const keydownEvent = new KeyboardEvent('keydown', { key });
        window.dispatchEvent(keydownEvent);
        
        const keyupEvent = new KeyboardEvent('keyup', { key });
        window.dispatchEvent(keyupEvent);
      });
    });

    // Should not have called any callbacks
    expect(onKeyPress).not.toHaveBeenCalled();
    expect(onKeyRelease).not.toHaveBeenCalled();
  });

  it('should handle mixed mapped and unmapped keys correctly', () => {
    renderHook(() => useKeyboardInput({
      onKeyPress,
      onKeyRelease,
      enabled: true
    }));

    act(() => {
      // Press unmapped key first
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      window.dispatchEvent(escapeEvent);
      
      // Press mapped key
      const zEvent = new KeyboardEvent('keydown', { key: 'z' });
      window.dispatchEvent(zEvent);
      
      // Press another unmapped key
      const tabEvent = new KeyboardEvent('keydown', { key: 'Tab' });
      window.dispatchEvent(tabEvent);
    });

    // Should only have been called for the mapped key
    expect(onKeyPress).toHaveBeenCalledTimes(1);
    expect(onKeyPress).toHaveBeenCalledWith('A0');
  });

  it('should not call callbacks when disabled', () => {
    renderHook(() => useKeyboardInput({
      onKeyPress,
      onKeyRelease,
      enabled: false
    }));

    // Simulate keydown event
    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'z' });
      window.dispatchEvent(event);
    });

    expect(onKeyPress).not.toHaveBeenCalled();
  });

  it('should prevent key repeat', () => {
    renderHook(() => useKeyboardInput({
      onKeyPress,
      onKeyRelease,
      enabled: true
    }));

    // Simulate multiple keydown events for the same key
    act(() => {
      const event1 = new KeyboardEvent('keydown', { key: 'z' });
      window.dispatchEvent(event1);
      
      const event2 = new KeyboardEvent('keydown', { key: 'z' });
      window.dispatchEvent(event2);
    });

    // Should only be called once
    expect(onKeyPress).toHaveBeenCalledTimes(1);
  });

  it('should release all keys on window blur', () => {
    renderHook(() => useKeyboardInput({
      onKeyPress,
      onKeyRelease,
      enabled: true
    }));

    // Press multiple keys
    act(() => {
      const event1 = new KeyboardEvent('keydown', { key: 'z' });
      window.dispatchEvent(event1);
      
      const event2 = new KeyboardEvent('keydown', { key: 'x' });
      window.dispatchEvent(event2);
    });

    // Simulate window blur
    act(() => {
      const blurEvent = new Event('blur');
      window.dispatchEvent(blurEvent);
    });

    // Should release both keys
    expect(onKeyRelease).toHaveBeenCalledWith('A0');
    expect(onKeyRelease).toHaveBeenCalledWith('A#0');
    expect(onKeyRelease).toHaveBeenCalledTimes(2);
  });
});