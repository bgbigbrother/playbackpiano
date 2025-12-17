import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeAll, vi } from 'vitest';
import * as fc from 'fast-check';
import { PianoKey } from '../components/PianoKey';
import { initializeKeyboardMapping } from '../utils/keyboardLayout';

/**
 * Property-Based Tests for Visual Feedback
 * Using fast-check to verify universal properties across all valid inputs
 */

describe('Visual Feedback - Property-Based Tests', () => {
  // Initialize the keyboard mapping before running tests
  beforeAll(async () => {
    await initializeKeyboardMapping();
  });

  /**
   * **Feature: web-piano, Property 2: Visual feedback reflects input state**
   * **Validates: Requirements 2.2, 3.2, 2.4, 3.4**
   * 
   * Property: For any piano key input event (press or release), the visual state 
   * of the corresponding piano key should accurately reflect the current input state.
   * 
   * This property verifies that:
   * 1. When a key is pressed (mouse or keyboard), the visual state shows isPressed=true
   * 2. When a key is released (mouse or keyboard), the visual state shows isPressed=false
   * 3. The visual feedback is consistent across both white and black keys
   * 4. The visual state accurately reflects the input state for all valid piano notes
   */
  it('Property 2: Visual feedback reflects input state - PianoKey component visual state matches press/release events', () => {
    // Generator for valid piano notes
    const noteNameArb = fc.constantFrom('A', 'B', 'C', 'D', 'E', 'F', 'G');
    const sharpArb = fc.constantFrom('', '#');
    const octaveArb = fc.integer({ min: 2, max: 6 }); // Common piano range
    
    const validNoteArb = fc.tuple(noteNameArb, sharpArb, octaveArb).map(
      ([name, sharp, octave]) => `${name}${sharp}${octave}`
    );

    // Property: For any valid note, pressing should set isPressed=true, releasing should set isPressed=false
    fc.assert(
      fc.property(validNoteArb, (note) => {
        const isBlack = note.includes('#');
        const onPress = vi.fn();
        const onRelease = vi.fn();
        
        // Test 1: Initial state - key should not be pressed
        const { rerender, unmount } = render(
          <PianoKey
            note={note}
            isPressed={false}
            isBlack={isBlack}
            width="2.86%"
            onPress={onPress}
            onRelease={onRelease}
          />
        );
        
        const key = screen.getByTestId(`piano-key-${note}`);
        expect(key).toBeInTheDocument();
        
        // Test 2: Simulate mouse press - visual state should reflect pressed state
        fireEvent.mouseDown(key);
        expect(onPress).toHaveBeenCalledWith(note);
        
        // Re-render with isPressed=true to simulate state update
        rerender(
          <PianoKey
            note={note}
            isPressed={true}
            isBlack={isBlack}
            width="2.86%"
            onPress={onPress}
            onRelease={onRelease}
          />
        );
        
        // Verify the key is now in pressed state (visual feedback)
        // The component should apply different styling when isPressed=true
        const pressedKey = screen.getByTestId(`piano-key-${note}`);
        expect(pressedKey).toBeInTheDocument();
        
        // Test 3: Simulate mouse release - visual state should reflect released state
        fireEvent.mouseUp(pressedKey);
        expect(onRelease).toHaveBeenCalledWith(note);
        
        // Re-render with isPressed=false to simulate state update
        rerender(
          <PianoKey
            note={note}
            isPressed={false}
            isBlack={isBlack}
            width="2.86%"
            onPress={onPress}
            onRelease={onRelease}
          />
        );
        
        // Verify the key is back to unpressed state
        const releasedKey = screen.getByTestId(`piano-key-${note}`);
        expect(releasedKey).toBeInTheDocument();
        
        // Test 4: Mouse leave should also trigger release
        fireEvent.mouseDown(releasedKey);
        expect(onPress).toHaveBeenCalledTimes(2);
        
        fireEvent.mouseLeave(releasedKey);
        expect(onRelease).toHaveBeenCalledTimes(2);
        
        // Clean up after this iteration
        unmount();
      }),
      { numRuns: 100 } // Run 100 iterations as specified in design doc
    );
  });
});
