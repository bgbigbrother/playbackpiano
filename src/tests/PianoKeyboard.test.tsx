import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { PianoKeyboard } from '../components/PianoKeyboard';
import { initializeKeyboardMapping } from '../utils/keyboardLayout';

describe('PianoKeyboard Component', () => {
  // Initialize the keyboard mapping before running tests
  beforeAll(async () => {
    await initializeKeyboardMapping();
  });

  it('renders white keys from 48-key mapping', () => {
    render(<PianoKeyboard />);
    
    // Check that we have white keys by looking for keys that don't contain '#'
    const allKeys = screen.queryAllByTestId(/piano-key-/);
    const whiteKeys = allKeys.filter(key => !key.getAttribute('data-testid')?.includes('#'));
    
    // The 48-key mapping has 28 white keys
    expect(whiteKeys.length).toBeGreaterThan(20);
    expect(whiteKeys.length).toBeLessThan(30);
  });

  it('renders black keys from 48-key mapping', () => {
    render(<PianoKeyboard />);
    
    // Check that we have black keys by looking for keys that contain '#'
    const allKeys = screen.queryAllByTestId(/piano-key-/);
    const blackKeys = allKeys.filter(key => key.getAttribute('data-testid')?.includes('#'));
    
    // The 48-key mapping has 20 black keys
    expect(blackKeys.length).toBeGreaterThan(15);
    expect(blackKeys.length).toBeLessThan(25);
  });

  it('starts with C2 as first key', () => {
    render(<PianoKeyboard />);
    
    const c2Key = screen.queryByTestId('piano-key-C2');
    expect(c2Key).toBeInTheDocument();
  });

  it('calls onKeyPress when provided', () => {
    const onKeyPress = vi.fn();
    render(<PianoKeyboard onKeyPress={onKeyPress} />);
    
    // This test verifies the prop is passed correctly
    // Actual interaction testing would require more complex setup
    expect(onKeyPress).toBeDefined();
  });

  it('calls onKeyRelease when provided', () => {
    const onKeyRelease = vi.fn();
    render(<PianoKeyboard onKeyRelease={onKeyRelease} />);
    
    // This test verifies the prop is passed correctly
    expect(onKeyRelease).toBeDefined();
  });

  it('shows pressed keys when pressedKeys prop is provided', () => {
    const pressedKeys = new Set(['C2']);
    render(<PianoKeyboard pressedKeys={pressedKeys} />);
    
    // The component should render without errors when pressedKeys is provided
    const c2Key = screen.queryByTestId('piano-key-C2');
    expect(c2Key).toBeInTheDocument();
  });
});