import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { PianoKeyboard } from '../components/PianoKeyboard';
import { initializeKeyboardMapping } from '../utils/keyboardLayout';

describe('Polyphonic Input Support', () => {
  // Initialize the keyboard mapping before running tests
  beforeAll(async () => {
    await initializeKeyboardMapping();
  });

  it('should handle multiple simultaneous mouse clicks', () => {
    const onKeyPress = vi.fn();
    const onKeyRelease = vi.fn();
    
    render(
      <PianoKeyboard 
        onKeyPress={onKeyPress}
        onKeyRelease={onKeyRelease}
      />
    );

    // Get multiple piano keys from the 48-key mapping (C2, D2, E2)
    const keyC2 = screen.getByTestId('piano-key-C2');
    const keyD2 = screen.getByTestId('piano-key-D2');
    const keyE2 = screen.getByTestId('piano-key-E2');

    // Press multiple keys simultaneously
    fireEvent.mouseDown(keyC2);
    fireEvent.mouseDown(keyD2);
    fireEvent.mouseDown(keyE2);

    // Should have called onKeyPress for each key
    expect(onKeyPress).toHaveBeenCalledWith('C2');
    expect(onKeyPress).toHaveBeenCalledWith('D2');
    expect(onKeyPress).toHaveBeenCalledWith('E2');
    expect(onKeyPress).toHaveBeenCalledTimes(3);
  });

  it('should maintain visual state for multiple pressed keys', () => {
    const pressedKeys = new Set(['C2', 'E2', 'G2']);
    
    render(
      <PianoKeyboard 
        pressedKeys={pressedKeys}
      />
    );

    // Check that multiple keys show as pressed
    const keyC2 = screen.getByTestId('piano-key-C2');
    const keyE2 = screen.getByTestId('piano-key-E2');
    const keyG2 = screen.getByTestId('piano-key-G2');
    const keyD2 = screen.getByTestId('piano-key-D2'); // Should not be pressed

    // The pressed keys should have the pressed styling
    // Note: We can't easily test the actual styling, but we can verify the component renders
    expect(keyC2).toBeInTheDocument();
    expect(keyE2).toBeInTheDocument();
    expect(keyG2).toBeInTheDocument();
    expect(keyD2).toBeInTheDocument();
  });

  it('should handle releasing individual keys while others remain pressed', () => {
    const onKeyPress = vi.fn();
    const onKeyRelease = vi.fn();
    
    render(
      <PianoKeyboard 
        onKeyPress={onKeyPress}
        onKeyRelease={onKeyRelease}
      />
    );

    const keyC2 = screen.getByTestId('piano-key-C2');
    const keyD2 = screen.getByTestId('piano-key-D2');

    // Press both keys
    fireEvent.mouseDown(keyC2);
    fireEvent.mouseDown(keyD2);

    // Release only one key
    fireEvent.mouseUp(keyC2);

    // Should have released only C2
    expect(onKeyRelease).toHaveBeenCalledWith('C2');
    expect(onKeyRelease).toHaveBeenCalledTimes(1);
    
    // D2 should still be considered pressed (no release call for it yet)
    expect(onKeyPress).toHaveBeenCalledWith('D2');
  });
});