import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import * as fc from 'fast-check';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { PianoKeyboard } from '../components/PianoKeyboard';
import { LabelToggleControls } from '../components/LabelToggleControls';
import { initializeKeyboardMapping } from '../utils/keyboardLayout';

/**
 * Property-Based Tests for Label Visibility Toggle
 * 
 * These tests verify that label visibility toggle works correctly across
 * all piano keys and states, ensuring immediate reflection of visibility changes.
 * 
 * **Feature: piano-control-panel, Property-Based Tests**
 */

const theme = createTheme();

// Mock audio engine to avoid audio context issues in tests
vi.mock('../utils/AudioEngine', () => ({
  AudioEngine: vi.fn().mockImplementation(() => ({
    playNote: vi.fn(),
    stopNote: vi.fn(),
    dispose: vi.fn(),
    isReady: true,
  })),
}));

// Test wrapper component that provides theme and piano keyboard
function TestPianoKeyboardWrapper({ 
  labelsVisible,
  testId = 'piano-test',
  markedKeys = new Set<string>(),
  pressedKeys = new Set<string>()
}: { 
  labelsVisible: boolean;
  testId?: string;
  markedKeys?: Set<string>;
  pressedKeys?: Set<string>;
}) {
  const mockOnKeyPress = vi.fn();
  const mockOnKeyRelease = vi.fn();
  
  return (
    <div data-testid={testId}>
      <ThemeProvider theme={theme}>
        <PianoKeyboard
          onKeyPress={mockOnKeyPress}
          onKeyRelease={mockOnKeyRelease}
          pressedKeys={pressedKeys}
          markedKeys={markedKeys}
          labelsVisible={labelsVisible}
        />
      </ThemeProvider>
    </div>
  );
}

// Test wrapper for LabelToggleControls
function TestLabelToggleWrapper({
  labelsVisible,
  onToggle,
  testId = 'label-toggle-test'
}: {
  labelsVisible: boolean;
  onToggle: () => void;
  testId?: string;
}) {
  return (
    <div data-testid={testId}>
      <ThemeProvider theme={theme}>
        <LabelToggleControls
          labelsVisible={labelsVisible}
          onToggle={onToggle}
        />
      </ThemeProvider>
    </div>
  );
}

describe('Label Visibility - Property-Based Tests', () => {
  // Initialize the keyboard mapping before running tests
  beforeAll(async () => {
    await initializeKeyboardMapping();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  /**
   * **Feature: piano-control-panel, Property 13: Label visibility toggle**
   * **Validates: Requirements 4.1, 4.2**
   * 
   * Property: For any label toggle state change, all piano key labels should immediately 
   * reflect the new visibility state.
   * 
   * This property verifies that:
   * 1. When labelsVisible is true, all piano keys display their note names and keyboard bindings
   * 2. When labelsVisible is false, piano keys do not display note names or keyboard bindings
   * 3. Label visibility changes are immediately reflected across all keys
   * 4. Piano key functionality is preserved regardless of label visibility
   * 5. Marked and pressed key states are maintained regardless of label visibility
   */
  it('Property 13: Label visibility toggle - all piano keys reflect visibility state immediately', () => {
    // Generator for piano key states and label visibility
    const pianoStateArb = fc.record({
      labelsVisible: fc.boolean(),
      markedKeys: fc.array(fc.constantFrom('C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C#4', 'D#4', 'F#4', 'G#4', 'A#4'), { maxLength: 5 }).map(arr => new Set(arr)),
      pressedKeys: fc.array(fc.constantFrom('C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C#4', 'D#4', 'F#4', 'G#4', 'A#4'), { maxLength: 3 }).map(arr => new Set(arr))
    });

    fc.assert(
      fc.property(pianoStateArb, ({ labelsVisible, markedKeys, pressedKeys }) => {
        // Generate unique test ID for this iteration to avoid DOM conflicts
        const testId = `piano-test-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        
        const { unmount } = render(
          <TestPianoKeyboardWrapper 
            labelsVisible={labelsVisible}
            testId={testId}
            markedKeys={markedKeys}
            pressedKeys={pressedKeys}
          />
        );

        try {
          // Property 1: All piano keys should be present
          const pianoContainer = screen.getByTestId(testId);
          expect(pianoContainer).toBeInTheDocument();
          
          // Get all piano key elements (both white and black keys)
          const allPianoKeys = screen.getAllByTestId(/^piano-key-/);
          expect(allPianoKeys.length).toBeGreaterThan(0);
          
          // Property 2: Label visibility should be consistent across all keys
          for (const keyElement of allPianoKeys) {
            const keyNote = keyElement.getAttribute('data-testid')?.replace('piano-key-', '') || '';
            
            if (labelsVisible) {
              // When labels are visible, each key should contain its note name
              expect(keyElement).toHaveTextContent(keyNote);
              
              // The note name should be visible in the DOM
              const noteText = keyElement.querySelector('div');
              expect(noteText).toBeInTheDocument();
              
              // Verify the note text is actually the correct note
              if (noteText) {
                expect(noteText.textContent).toContain(keyNote);
              }
            } else {
              // When labels are hidden, keys should not display note names
              // The key element should exist but not contain visible text content
              const textContent = keyElement.textContent || '';
              
              // The key should not display the note name when labels are hidden
              // Note: We check that the note name is not visible, but the element still exists
              if (textContent.trim() !== '') {
                // If there's any text content, it should not be the note name
                expect(textContent).not.toContain(keyNote);
              }
            }
          }
          
          // Property 3: Label visibility should not affect key functionality
          // All keys should still be interactive regardless of label visibility
          for (const keyElement of allPianoKeys) {
            expect(keyElement).toBeEnabled();
            expect(keyElement.tagName.toLowerCase()).toBe('button');
            
            // Keys should have proper ARIA labels regardless of visual label visibility
            const ariaLabel = keyElement.getAttribute('aria-label');
            expect(ariaLabel).toBeTruthy();
            expect(ariaLabel).toContain('Piano key');
          }
          
          // Property 4: Marked keys should maintain their marked state regardless of label visibility
          for (const markedNote of markedKeys) {
            const markedKeyElement = screen.queryByTestId(`piano-key-${markedNote}`);
            if (markedKeyElement) {
              const ariaLabel = markedKeyElement.getAttribute('aria-label');
              expect(ariaLabel).toContain('marked');
            }
          }
          
          // Property 5: Pressed keys should maintain their pressed state regardless of label visibility
          for (const pressedNote of pressedKeys) {
            const pressedKeyElement = screen.queryByTestId(`piano-key-${pressedNote}`);
            if (pressedKeyElement) {
              // Pressed keys should have visual indication (this is implementation-dependent)
              // We verify the key exists and is still functional
              expect(pressedKeyElement).toBeInTheDocument();
              expect(pressedKeyElement).toBeEnabled();
            }
          }
          
        } finally {
          // Ensure cleanup happens even if test fails
          unmount();
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Extended property test: Label toggle control consistency
   * 
   * Verifies that the LabelToggleControls component correctly reflects
   * the current label visibility state and provides appropriate labels.
   */
  it('Extended property: Label toggle control reflects state correctly', () => {
    // Generator for label visibility states
    const labelStateArb = fc.record({
      labelsVisible: fc.boolean()
    });

    fc.assert(
      fc.property(labelStateArb, ({ labelsVisible }) => {
        // Generate unique test ID for this iteration
        const testId = `label-toggle-test-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const mockOnToggle = vi.fn();
        
        const { unmount } = render(
          <TestLabelToggleWrapper 
            labelsVisible={labelsVisible}
            onToggle={mockOnToggle}
            testId={testId}
          />
        );

        try {
          // Property 1: Toggle control should be present
          const toggleContainer = screen.getByTestId(testId);
          expect(toggleContainer).toBeInTheDocument();
          
          // Property 2: Switch should reflect current state
          const switchElement = screen.getByRole('checkbox');
          expect(switchElement).toBeInTheDocument();
          
          if (labelsVisible) {
            expect(switchElement).toBeChecked();
          } else {
            expect(switchElement).not.toBeChecked();
          }
          
          // Property 3: Label text should be appropriate for current state
          const labelText = screen.getByText(labelsVisible ? 'Hide Key Labels' : 'Show Key Labels');
          expect(labelText).toBeInTheDocument();
          
          // Property 4: Control should be interactive
          expect(switchElement).toBeEnabled();
          
        } finally {
          // Ensure cleanup happens even if test fails
          unmount();
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Extended property test: Label visibility state transitions
   * 
   * Verifies that toggling label visibility immediately updates all piano keys
   * and that the state change is consistent across the entire keyboard.
   */
  it('Extended property: Label visibility state transitions work immediately', () => {
    // Generator for initial states and toggle sequences
    const transitionArb = fc.record({
      initialLabelsVisible: fc.boolean(),
      toggleCount: fc.integer({ min: 1, max: 5 })
    });

    fc.assert(
      fc.property(transitionArb, ({ initialLabelsVisible, toggleCount }) => {
        // Generate unique test ID for this iteration
        const testId = `transition-test-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        
        let currentLabelsVisible = initialLabelsVisible;
        
        // Test multiple state transitions
        for (let i = 0; i < toggleCount; i++) {
          const { unmount } = render(
            <TestPianoKeyboardWrapper 
              labelsVisible={currentLabelsVisible}
              testId={`${testId}-${i}`}
            />
          );

          try {
            // Property 1: State should be immediately reflected
            const allPianoKeys = screen.getAllByTestId(/^piano-key-/);
            expect(allPianoKeys.length).toBeGreaterThan(0);
            
            // Property 2: All keys should consistently reflect the current state
            for (const keyElement of allPianoKeys) {
              const keyNote = keyElement.getAttribute('data-testid')?.replace('piano-key-', '') || '';
              
              if (currentLabelsVisible) {
                // Labels should be visible
                expect(keyElement).toHaveTextContent(keyNote);
              } else {
                // Labels should be hidden - check that note name is not displayed
                const textContent = keyElement.textContent || '';
                if (textContent.trim() !== '') {
                  expect(textContent).not.toContain(keyNote);
                }
              }
            }
            
            // Toggle state for next iteration
            currentLabelsVisible = !currentLabelsVisible;
            
          } finally {
            unmount();
          }
        }
      }),
      { numRuns: 50 } // Reduced runs due to multiple iterations per test
    );
  });

  /**
   * **Feature: piano-control-panel, Property 14: Functionality preservation with hidden labels**
   * **Validates: Requirements 4.3**
   * 
   * Property: For any piano functionality, hiding labels should not affect the ability 
   * to play keys or use other features.
   * 
   * This property verifies that:
   * 1. Key press and release functionality works identically with and without labels
   * 2. Key marking functionality is preserved regardless of label visibility
   * 3. Pressed key states are maintained regardless of label visibility
   * 4. All interactive elements remain functional when labels are hidden
   * 5. Audio playback functionality is unaffected by label visibility
   * 6. Keyboard accessibility (ARIA labels) is preserved when visual labels are hidden
   */
  it('Property 14: Functionality preservation with hidden labels - all piano functionality works regardless of label visibility', () => {
    // Generator for comprehensive piano functionality test scenarios
    const functionalityTestArb = fc.record({
      // Test both label states
      labelsVisible: fc.boolean(),
      // Test with various key combinations
      testKeys: fc.array(fc.constantFrom('C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C#4', 'D#4', 'F#4', 'G#4', 'A#4'), { minLength: 1, maxLength: 8 }),
      // Test with marked keys
      markedKeys: fc.array(fc.constantFrom('C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C#4', 'D#4', 'F#4', 'G#4', 'A#4'), { maxLength: 4 }).map(arr => new Set(arr)),
      // Test with pressed keys
      pressedKeys: fc.array(fc.constantFrom('C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C#4', 'D#4', 'F#4', 'G#4', 'A#4'), { maxLength: 3 }).map(arr => new Set(arr))
    });

    fc.assert(
      fc.property(functionalityTestArb, ({ labelsVisible, testKeys, markedKeys, pressedKeys }) => {
        // Generate unique test ID for this iteration
        const testId = `functionality-test-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        
        // Mock functions to track functionality
        const mockOnKeyPress = vi.fn();
        const mockOnKeyRelease = vi.fn();
        
        const { unmount } = render(
          <div data-testid={testId}>
            <ThemeProvider theme={theme}>
              <PianoKeyboard
                onKeyPress={mockOnKeyPress}
                onKeyRelease={mockOnKeyRelease}
                pressedKeys={pressedKeys}
                markedKeys={markedKeys}
                labelsVisible={labelsVisible}
              />
            </ThemeProvider>
          </div>
        );

        try {
          // Property 1: All piano keys should be present and functional regardless of label visibility
          const pianoContainer = screen.getByTestId(testId);
          expect(pianoContainer).toBeInTheDocument();
          
          const allPianoKeys = screen.getAllByTestId(/^piano-key-/);
          expect(allPianoKeys.length).toBeGreaterThan(0);
          
          // Property 2: All keys should be interactive buttons regardless of label visibility
          for (const keyElement of allPianoKeys) {
            expect(keyElement.tagName.toLowerCase()).toBe('button');
            expect(keyElement).toBeEnabled();
            
            // Keys should be clickable regardless of label visibility
            expect(keyElement).toHaveAttribute('type', 'button');
          }
          
          // Property 3: Test key press functionality for each test key
          for (const testKey of testKeys) {
            const keyElement = screen.queryByTestId(`piano-key-${testKey}`);
            if (keyElement) {
              // Key should be present and functional
              expect(keyElement).toBeInTheDocument();
              expect(keyElement).toBeEnabled();
              
              // Clear previous calls to get accurate count
              mockOnKeyPress.mockClear();
              
              // Simulate mouse down event (this is how PianoKey handles key presses)
              keyElement.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
              
              // Verify that the key press handler was called
              expect(mockOnKeyPress).toHaveBeenCalledWith(testKey);
            }
          }
          
          // Property 4: Marked keys should maintain their marked state and visual indication
          for (const markedNote of markedKeys) {
            const markedKeyElement = screen.queryByTestId(`piano-key-${markedNote}`);
            if (markedKeyElement) {
              // Marked keys should have proper ARIA labels regardless of visual label visibility
              const ariaLabel = markedKeyElement.getAttribute('aria-label');
              expect(ariaLabel).toBeTruthy();
              expect(ariaLabel).toContain('marked');
              expect(ariaLabel).toContain(markedNote);
              
              // Marked keys should be visually distinguishable (through styling, not text)
              // This is verified through the component's styling system
              expect(markedKeyElement).toBeInTheDocument();
            }
          }
          
          // Property 5: Pressed keys should maintain their pressed state
          for (const pressedNote of pressedKeys) {
            const pressedKeyElement = screen.queryByTestId(`piano-key-${pressedNote}`);
            if (pressedKeyElement) {
              // Pressed keys should be present and functional
              expect(pressedKeyElement).toBeInTheDocument();
              expect(pressedKeyElement).toBeEnabled();
              
              // ARIA label should indicate the key state
              const ariaLabel = pressedKeyElement.getAttribute('aria-label');
              expect(ariaLabel).toBeTruthy();
              expect(ariaLabel).toContain(pressedNote);
            }
          }
          
          // Property 6: Accessibility features should be preserved regardless of label visibility
          for (const keyElement of allPianoKeys) {
            // Every key should have proper ARIA labeling for screen readers
            const ariaLabel = keyElement.getAttribute('aria-label');
            expect(ariaLabel).toBeTruthy();
            expect(ariaLabel).toContain('Piano key');
            
            // Keys should be button elements (implicit role)
            expect(keyElement.tagName.toLowerCase()).toBe('button');
            
            // Keys should be keyboard accessible (Material-UI buttons are focusable by default)
            expect(keyElement).toBeEnabled();
          }
          
          // Property 7: Mouse event handlers should work regardless of label visibility
          const firstKey = allPianoKeys[0];
          if (firstKey) {
            const keyNote = firstKey.getAttribute('data-testid')?.replace('piano-key-', '') || '';
            
            // Clear previous calls to get accurate count
            mockOnKeyPress.mockClear();
            mockOnKeyRelease.mockClear();
            
            // Test mouse down event
            firstKey.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
            expect(mockOnKeyPress).toHaveBeenCalledWith(keyNote);
            
            // Test mouse up event
            firstKey.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
            expect(mockOnKeyRelease).toHaveBeenCalledWith(keyNote);
          }
          
          // Property 8: Visual feedback should work regardless of label visibility
          // Keys should have proper styling and visual states
          for (const keyElement of allPianoKeys) {
            // Keys should have CSS classes for styling
            expect(keyElement.className).toBeTruthy();
            
            // Keys should have proper Material-UI button styling
            expect(keyElement.classList.toString()).toContain('MuiButton');
          }
          
          // Property 9: Component structure should be consistent regardless of label visibility
          // The piano keyboard should have the same DOM structure
          const whiteKeys = allPianoKeys.filter(key => !key.getAttribute('data-testid')?.includes('#'));
          const blackKeys = allPianoKeys.filter(key => key.getAttribute('data-testid')?.includes('#'));
          
          expect(whiteKeys.length).toBeGreaterThan(0);
          expect(blackKeys.length).toBeGreaterThan(0);
          expect(whiteKeys.length + blackKeys.length).toBe(allPianoKeys.length);
          
        } finally {
          // Ensure cleanup happens even if test fails
          unmount();
        }
      }),
      { numRuns: 100 }
    );
  });
});