import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { renderHook, act } from '@testing-library/react';
import { useKeyboardInput } from '../hooks/useKeyboardInput';
import { getPianoNoteForKey } from '../utils/keyboardLayout';

/**
 * Property-Based Tests for Unmapped Key Rejection
 * Using fast-check to verify that unmapped keyboard inputs are properly ignored
 */

// Mock the keyboardLayout utility to use the actual 48-key mapping logic
vi.mock('../utils/keyboardLayout', async () => {
  const actual = await vi.importActual('../utils/keyboardLayout');
  return {
    ...actual,
    getPianoNoteForKey: vi.fn((key: string) => {
      // Simulate the actual mapping from 48_key_mapping.json
      const mapping: Record<string, string> = {
        // White keys
        'z': 'C2', 'x': 'D2', 'c': 'E2', 'v': 'F2', 'b': 'G2', 'n': 'A2', 'm': 'B2',
        'q': 'C3', 'w': 'D3', 'e': 'E3', 'r': 'F3', 't': 'G3', 'y': 'A3', 'u': 'B3',
        'i': 'C4', 'o': 'D4', 'p': 'E4', '[': 'F4', ']': 'G4', '\\': 'A4', ';': 'B4',
        "'": 'C5', ',': 'D5', '.': 'E5', '/': 'F5', '1': 'G5', '8': 'A5',
        // Black keys
        's': 'C#2', 'd': 'D#2', 'g': 'F#2', 'h': 'G#2', 'j': 'A#2',
        '2': 'C#3', '3': 'D#3', '5': 'F#3', '6': 'G#3', '7': 'A#3',
        '9': 'C#4', '0': 'D#4', '=': 'F#4', 'a': 'G#4', 'f': 'A#4',
        'k': 'C#5', 'l': 'D#5', '`': 'F#5', '4': 'G#5', '-': 'A#5'
      };
      return mapping[key.toLowerCase()] || null;
    })
  };
});

describe('Unmapped Key Rejection - Property-Based Tests', () => {
  let onKeyPress: ReturnType<typeof vi.fn>;
  let onKeyRelease: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onKeyPress = vi.fn();
    onKeyRelease = vi.fn();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * **Feature: web-piano, Property 7: Unmapped key rejection**
   * **Validates: Requirements 3.5**
   * 
   * Property: For any unmapped keyboard input, the system should produce no 
   * audio output or visual feedback.
   * 
   * This property verifies that:
   * 1. Unmapped keys do not trigger the onKeyPress callback
   * 2. Unmapped keys do not trigger the onKeyRelease callback
   * 3. The system correctly identifies unmapped keys
   * 4. No side effects occur when unmapped keys are pressed
   * 5. The system remains stable when processing unmapped inputs
   */
  it('Property 7: Unmapped key rejection - unmapped keys produce no audio or visual feedback', () => {
    // Generator for common unmapped keyboard keys
    // These are keys that should NOT trigger piano sounds
    const unmappedKeyArb = fc.constantFrom(
      'Escape', 'Tab', 'Enter', 'Shift', 'Control', 'Alt', 'Meta',
      'CapsLock', 'Backspace', 'Delete', 'Insert', 'Home', 'End',
      'PageUp', 'PageDown', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
      'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
      ' ' // Space bar
    );

    // Property: For any unmapped key, no callbacks should be triggered
    fc.assert(
      fc.property(unmappedKeyArb, (unmappedKey) => {
        // Arrange: Render the hook
        const { result } = renderHook(() => useKeyboardInput({
          onKeyPress,
          onKeyRelease,
          enabled: true
        }));

        // Act: Simulate pressing and releasing an unmapped key
        act(() => {
          const keydownEvent = new KeyboardEvent('keydown', { key: unmappedKey });
          window.dispatchEvent(keydownEvent);
        });

        act(() => {
          const keyupEvent = new KeyboardEvent('keyup', { key: unmappedKey });
          window.dispatchEvent(keyupEvent);
        });

        // Assert: No callbacks should have been triggered
        expect(onKeyPress).not.toHaveBeenCalled();
        expect(onKeyRelease).not.toHaveBeenCalled();

        // Verify that getPianoNoteForKey correctly returns null for unmapped keys
        const note = getPianoNoteForKey(unmappedKey);
        expect(note).toBeNull();
      }),
      { numRuns: 100 } // Run 100 iterations as specified in design doc
    );
  });

  /**
   * Extended property test: Mixed mapped and unmapped keys
   * Verifies that unmapped keys don't interfere with mapped key processing
   */
  it('Property 7 (extended): Unmapped keys do not interfere with mapped key processing', () => {
    // Generator for mapped keys (subset of the 48-key mapping)
    const mappedKeyArb = fc.constantFrom('z', 'x', 'c', 'q', 'w', 'e', 's', 'd', 'a');
    
    // Generator for unmapped keys
    const unmappedKeyArb = fc.constantFrom(
      'Escape', 'Tab', 'Enter', 'Shift', 'Control', 'Alt',
      'ArrowUp', 'ArrowDown', 'F1', 'F5', ' '
    );

    // Generator for sequences of mixed keys
    const mixedKeysArb = fc.array(
      fc.oneof(
        mappedKeyArb.map(k => ({ key: k, isMapped: true })),
        unmappedKeyArb.map(k => ({ key: k, isMapped: false }))
      ),
      { minLength: 3, maxLength: 10 }
    );

    fc.assert(
      fc.property(mixedKeysArb, (keySequence) => {
        // Create fresh callbacks for each iteration
        const localOnKeyPress = vi.fn();
        const localOnKeyRelease = vi.fn();
        
        // Arrange
        const { result, unmount } = renderHook(() => useKeyboardInput({
          onKeyPress: localOnKeyPress,
          onKeyRelease: localOnKeyRelease,
          enabled: true
        }));

        // Act: Press all keys in sequence (only unique keys to avoid key repeat prevention)
        const uniqueKeys = Array.from(new Set(keySequence.map(k => k.key)));
        act(() => {
          uniqueKeys.forEach((key) => {
            const keydownEvent = new KeyboardEvent('keydown', { key });
            window.dispatchEvent(keydownEvent);
          });
        });

        // Assert: Only mapped keys should trigger callbacks
        const uniqueKeySequence = uniqueKeys.map(key => ({
          key,
          isMapped: keySequence.find(k => k.key === key)?.isMapped || false
        }));
        const expectedMappedCount = uniqueKeySequence.filter(k => k.isMapped).length;
        expect(localOnKeyPress).toHaveBeenCalledTimes(expectedMappedCount);

        // Verify that unmapped keys were correctly ignored
        uniqueKeySequence.forEach(({ key, isMapped }) => {
          const note = getPianoNoteForKey(key);
          if (isMapped) {
            expect(note).not.toBeNull();
          } else {
            expect(note).toBeNull();
          }
        });

        // Clean up: Release all keys and unmount hook
        act(() => {
          uniqueKeys.forEach((key) => {
            const keyupEvent = new KeyboardEvent('keyup', { key });
            window.dispatchEvent(keyupEvent);
          });
        });
        
        unmount();
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Extended property test: Rapid unmapped key presses
   * Verifies system stability under rapid unmapped key input
   */
  it('Property 7 (extended): System remains stable under rapid unmapped key input', () => {
    // Generator for sequences of unmapped keys
    const unmappedKeyArb = fc.constantFrom(
      'Escape', 'Tab', 'Enter', 'Shift', 'Control', 'Alt', 'Meta',
      'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'F1', 'F12', ' '
    );

    const rapidUnmappedKeysArb = fc.array(unmappedKeyArb, { 
      minLength: 5, 
      maxLength: 20 
    });

    fc.assert(
      fc.property(rapidUnmappedKeysArb, (unmappedKeys) => {
        // Arrange
        const { result } = renderHook(() => useKeyboardInput({
          onKeyPress,
          onKeyRelease,
          enabled: true
        }));

        // Act: Rapidly press and release unmapped keys
        act(() => {
          unmappedKeys.forEach(key => {
            const keydownEvent = new KeyboardEvent('keydown', { key });
            window.dispatchEvent(keydownEvent);
            
            const keyupEvent = new KeyboardEvent('keyup', { key });
            window.dispatchEvent(keyupEvent);
          });
        });

        // Assert: No callbacks should have been triggered
        expect(onKeyPress).not.toHaveBeenCalled();
        expect(onKeyRelease).not.toHaveBeenCalled();

        // Verify system stability: getPressedKeys should return empty array
        const pressedKeys = result.current.getPressedKeys();
        expect(pressedKeys).toEqual([]);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Extended property test: Unmapped keys with modifiers
   * Verifies that unmapped keys with modifier keys (Ctrl, Alt, etc.) are also ignored
   */
  it('Property 7 (extended): Unmapped keys with modifiers are ignored', () => {
    // Generator for unmapped keys
    const unmappedKeyArb = fc.constantFrom(
      'Escape', 'Tab', 'Enter', 'Backspace', 'Delete',
      'ArrowUp', 'ArrowDown', 'F1', 'F5', ' '
    );

    fc.assert(
      fc.property(unmappedKeyArb, (unmappedKey) => {
        // Arrange
        const { result } = renderHook(() => useKeyboardInput({
          onKeyPress,
          onKeyRelease,
          enabled: true
        }));

        // Act: Press unmapped key with various modifier combinations
        act(() => {
          // Plain key
          const plainEvent = new KeyboardEvent('keydown', { key: unmappedKey });
          window.dispatchEvent(plainEvent);

          // With Ctrl
          const ctrlEvent = new KeyboardEvent('keydown', { 
            key: unmappedKey, 
            ctrlKey: true 
          });
          window.dispatchEvent(ctrlEvent);

          // With Alt
          const altEvent = new KeyboardEvent('keydown', { 
            key: unmappedKey, 
            altKey: true 
          });
          window.dispatchEvent(altEvent);

          // With Shift
          const shiftEvent = new KeyboardEvent('keydown', { 
            key: unmappedKey, 
            shiftKey: true 
          });
          window.dispatchEvent(shiftEvent);
        });

        // Assert: No callbacks should have been triggered
        expect(onKeyPress).not.toHaveBeenCalled();
        expect(onKeyRelease).not.toHaveBeenCalled();

        // Verify the key is unmapped
        const note = getPianoNoteForKey(unmappedKey);
        expect(note).toBeNull();
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Extended property test: Verify all non-piano keys are unmapped
   * Tests a comprehensive set of keyboard keys to ensure proper filtering
   */
  it('Property 7 (extended): Comprehensive unmapped key coverage', () => {
    // Generator for various categories of unmapped keys
    const controlKeyArb = fc.constantFrom('Escape', 'Tab', 'Enter', 'Backspace', 'Delete');
    const modifierKeyArb = fc.constantFrom('Shift', 'Control', 'Alt', 'Meta', 'CapsLock');
    const navigationKeyArb = fc.constantFrom(
      'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
      'Home', 'End', 'PageUp', 'PageDown'
    );
    const functionKeyArb = fc.constantFrom(
      'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 
      'F9', 'F10', 'F11', 'F12'
    );
    const specialKeyArb = fc.constantFrom(' ', 'Insert', 'PrintScreen', 'ScrollLock', 'Pause');

    const anyUnmappedKeyArb = fc.oneof(
      controlKeyArb,
      modifierKeyArb,
      navigationKeyArb,
      functionKeyArb,
      specialKeyArb
    );

    fc.assert(
      fc.property(anyUnmappedKeyArb, (unmappedKey) => {
        // Arrange
        const { result } = renderHook(() => useKeyboardInput({
          onKeyPress,
          onKeyRelease,
          enabled: true
        }));

        // Act
        act(() => {
          const keydownEvent = new KeyboardEvent('keydown', { key: unmappedKey });
          window.dispatchEvent(keydownEvent);
        });

        // Assert
        expect(onKeyPress).not.toHaveBeenCalled();
        
        // Verify the key is correctly identified as unmapped
        const note = getPianoNoteForKey(unmappedKey);
        expect(note).toBeNull();
      }),
      { numRuns: 100 }
    );
  });
});
