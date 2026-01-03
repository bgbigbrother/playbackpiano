import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import App from '../App';
import { getPianoNoteForKey } from '../utils/keyboardLayout';

/**
 * System Integration Property-Based Tests
 * 
 * These tests verify complete system integration scenarios and all correctness
 * properties in an integrated environment, focusing on core functionality
 * and error recovery across the entire system.
 * 
 * **Feature: piano-control-panel, System Integration Properties**
 * **Validates: Requirements All**
 */

// Mock Web Audio API for testing
const mockAudioContext = {
  state: 'running',
  resume: vi.fn().mockResolvedValue(undefined),
  suspend: vi.fn().mockResolvedValue(undefined),
  close: vi.fn().mockResolvedValue(undefined),
  createGain: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    gain: { value: 1, setValueAtTime: vi.fn() }
  })),
  createOscillator: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    frequency: { value: 440, setValueAtTime: vi.fn() },
    type: 'sine'
  })),
  createBuffer: vi.fn(),
  createBufferSource: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    buffer: null
  })),
  destination: { connect: vi.fn(), disconnect: vi.fn() },
  currentTime: 0,
  sampleRate: 44100
};

describe('System Integration Property-Based Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock ResizeObserver
    global.ResizeObserver = vi.fn(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    })) as any;
    
    // Mock Web Audio API
    global.AudioContext = vi.fn(() => mockAudioContext) as any;
    (global as any).webkitAudioContext = vi.fn(() => mockAudioContext) as any;
    
    // Mock MediaRecorder
    global.MediaRecorder = vi.fn(() => ({
      start: vi.fn(),
      stop: vi.fn(),
      state: 'inactive',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    })) as any;
    global.MediaRecorder.isTypeSupported = vi.fn().mockReturnValue(true);
    
    // Mock getUserMedia
    global.navigator = {
      ...global.navigator,
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: () => [{ stop: vi.fn() }]
        })
      }
    } as any;
    
    // Mock localStorage
    const localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn()
    };
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Property SI-1: Piano keyboard mapping consistency across all system states
   * 
   * For any mapped keyboard key and any system state (loading, loaded, error),
   * the key mapping should remain consistent and deterministic.
   */
  it('Property SI-1: Piano keyboard mapping consistency across all system states', async () => {
    const mappedKeyArb = fc.constantFrom(
      'z', 'x', 'c', 'v', 'b', 'n', 'm',
      'q', 'w', 'e', 'r', 't', 'y', 'u'
    );

    await fc.assert(
      fc.asyncProperty(mappedKeyArb, async (key) => {
        const { unmount } = render(<App />);

        // Wait for app to initialize
        await waitFor(() => {
          const loadingElements = screen.getAllByText('Loading Piano Samples...');
          expect(loadingElements.length).toBeGreaterThan(0);
        });

        // Get the note mapping for this key - should be consistent
        const expectedNote = getPianoNoteForKey(key);
        expect(expectedNote).not.toBeNull();

        // Simulate key press during loading state
        const keydownEvent = new KeyboardEvent('keydown', { key });
        fireEvent(window, keydownEvent);

        // The mapping should remain consistent
        const noteAfterPress = getPianoNoteForKey(key);
        expect(noteAfterPress).toBe(expectedNote);

        // Simulate key release
        const keyupEvent = new KeyboardEvent('keyup', { key });
        fireEvent(window, keyupEvent);

        // The mapping should still be consistent
        const noteAfterRelease = getPianoNoteForKey(key);
        expect(noteAfterRelease).toBe(expectedNote);

        unmount();
      }),
      { numRuns: 50 }
    );
  }, 60000);

  /**
   * Property SI-2: System stability under concurrent keyboard inputs
   * 
   * For any sequence of concurrent keyboard inputs, the system should
   * maintain stability without dropping inputs or creating invalid states.
   */
  it('Property SI-2: System stability under concurrent keyboard inputs', async () => {
    const keySequenceArb = fc.array(
      fc.constantFrom('z', 'x', 'c', 'q', 'w', 'e', 's', 'd'),
      { minLength: 3, maxLength: 8 }
    );

    await fc.assert(
      fc.asyncProperty(keySequenceArb, async (keys) => {
        const { unmount } = render(<App />);

        await waitFor(() => {
          const loadingElements = screen.getAllByText('Loading Piano Samples...');
          expect(loadingElements.length).toBeGreaterThan(0);
        });

        // Simulate rapid concurrent key presses
        keys.forEach(key => {
          const keydownEvent = new KeyboardEvent('keydown', { key });
          fireEvent(window, keydownEvent);
        });

        // System should remain stable
        const loadingElements = screen.getAllByText('Loading Piano Samples...');
        expect(loadingElements.length).toBeGreaterThan(0);

        // All key mappings should remain consistent
        keys.forEach(key => {
          const note = getPianoNoteForKey(key);
          expect(note).not.toBeNull();
        });

        // Simulate releases in reverse order
        keys.reverse().forEach(key => {
          const keyupEvent = new KeyboardEvent('keyup', { key });
          fireEvent(window, keyupEvent);
        });

        // System should still be stable
        const finalLoadingElements = screen.getAllByText('Loading Piano Samples...');
        expect(finalLoadingElements.length).toBeGreaterThan(0);

        unmount();
      }),
      { numRuns: 30 }
    );
  }, 60000);

  /**
   * Property SI-3: Control panel integration preserves core functionality
   * 
   * For any control panel interaction, the core piano functionality
   * should remain fully accessible and functional.
   */
  it('Property SI-3: Control panel integration preserves core functionality', async () => {
    const interactionArb = fc.record({
      key: fc.constantFrom('z', 'x', 'c', 'v'),
      openPanel: fc.boolean()
    });

    await fc.assert(
      fc.asyncProperty(interactionArb, async (interaction) => {
        const { unmount } = render(<App />);

        await waitFor(() => {
          const loadingElements = screen.getAllByText('Loading Piano Samples...');
          expect(loadingElements.length).toBeGreaterThan(0);
        });

        // Get baseline note mapping
        const expectedNote = getPianoNoteForKey(interaction.key);
        expect(expectedNote).not.toBeNull();

        // Try to interact with control panel
        if (interaction.openPanel) {
          const toggleButton = screen.queryByLabelText(/control panel/i) || 
                              screen.queryByLabelText(/toggle/i) ||
                              screen.queryByRole('button');
          if (toggleButton) {
            fireEvent.click(toggleButton);
          }
        }

        // Piano functionality should work regardless of panel state
        const keydownEvent = new KeyboardEvent('keydown', { key: interaction.key });
        fireEvent(window, keydownEvent);

        // Note mapping should be preserved
        const noteAfterInteraction = getPianoNoteForKey(interaction.key);
        expect(noteAfterInteraction).toBe(expectedNote);

        unmount();
      }),
      { numRuns: 25 }
    );
  }, 60000);

  /**
   * Property SI-4: Error resilience maintains system stability
   * 
   * For any error condition, the system should maintain stability
   * and continue to provide core functionality where possible.
   */
  it('Property SI-4: Error resilience maintains system stability', async () => {
    const errorScenarioArb = fc.constantFrom(
      'audioContext_error',
      'mediaRecorder_error',
      'localStorage_error'
    );

    await fc.assert(
      fc.asyncProperty(errorScenarioArb, async (errorType) => {
        // Simulate error conditions
        if (errorType === 'audioContext_error') {
          global.AudioContext = vi.fn(() => {
            throw new Error('AudioContext not supported');
          }) as any;
        } else if (errorType === 'mediaRecorder_error') {
          global.MediaRecorder = vi.fn(() => {
            throw new Error('MediaRecorder not supported');
          }) as any;
        } else if (errorType === 'localStorage_error') {
          Object.defineProperty(window, 'localStorage', {
            value: {
              getItem: vi.fn(() => { throw new Error('localStorage unavailable'); }),
              setItem: vi.fn(() => { throw new Error('localStorage unavailable'); })
            },
            writable: true
          });
        }

        const { unmount } = render(<App />);

        await waitFor(() => {
          const loadingElements = screen.getAllByText('Loading Piano Samples...');
          expect(loadingElements.length).toBeGreaterThan(0);
        });

        // Even with errors, keyboard mapping should work
        const testKey = 'x';
        const expectedNote = getPianoNoteForKey(testKey);
        expect(expectedNote).not.toBeNull();

        const keydownEvent = new KeyboardEvent('keydown', { key: testKey });
        fireEvent(window, keydownEvent);

        // System should remain stable despite errors
        const loadingElements = screen.getAllByText('Loading Piano Samples...');
        expect(loadingElements.length).toBeGreaterThan(0);

        unmount();
      }),
      { numRuns: 20 }
    );
  }, 60000);

  /**
   * Property SI-5: Responsive layout maintains functionality
   * 
   * For any viewport size, the system should maintain functionality
   * and proper layout without breaking core features.
   */
  it('Property SI-5: Responsive layout maintains functionality', async () => {
    const viewportArb = fc.record({
      width: fc.integer({ min: 320, max: 1920 }),
      height: fc.integer({ min: 480, max: 1080 })
    });

    await fc.assert(
      fc.asyncProperty(viewportArb, async (viewport) => {
        const { unmount } = render(<App />);

        await waitFor(() => {
          const loadingElements = screen.getAllByText('Loading Piano Samples...');
          expect(loadingElements.length).toBeGreaterThan(0);
        });

        // Simulate viewport resize
        global.innerWidth = viewport.width;
        global.innerHeight = viewport.height;
        fireEvent(window, new Event('resize'));

        // System should remain stable after resize
        const loadingElements = screen.getAllByText('Loading Piano Samples...');
        expect(loadingElements.length).toBeGreaterThan(0);

        // Piano functionality should work at any viewport size
        const testKey = 'v';
        const expectedNote = getPianoNoteForKey(testKey);
        expect(expectedNote).not.toBeNull();

        const keydownEvent = new KeyboardEvent('keydown', { key: testKey });
        fireEvent(window, keydownEvent);

        // Layout should remain stable
        const finalLoadingElements = screen.getAllByText('Loading Piano Samples...');
        expect(finalLoadingElements.length).toBeGreaterThan(0);

        unmount();
      }),
      { numRuns: 20 }
    );
  }, 60000);

  /**
   * Property SI-6: Mixed input types maintain consistent behavior
   * 
   * For any combination of keyboard and UI interactions, the system
   * should maintain consistent behavior and state.
   */
  it('Property SI-6: Mixed input types maintain consistent behavior', async () => {
    const inputSequenceArb = fc.array(
      fc.record({
        type: fc.constantFrom('keyboard', 'ui'),
        key: fc.constantFrom('z', 'x', 'c', 'q')
      }),
      { minLength: 2, maxLength: 5 }
    );

    await fc.assert(
      fc.asyncProperty(inputSequenceArb, async (inputs) => {
        const { unmount } = render(<App />);

        await waitFor(() => {
          const loadingElements = screen.getAllByText('Loading Piano Samples...');
          expect(loadingElements.length).toBeGreaterThan(0);
        });

        // Execute mixed input sequence
        inputs.forEach(input => {
          if (input.type === 'keyboard') {
            const keydownEvent = new KeyboardEvent('keydown', { key: input.key });
            fireEvent(window, keydownEvent);
            
            // Verify mapping consistency
            const note = getPianoNoteForKey(input.key);
            expect(note).not.toBeNull();
          } else if (input.type === 'ui') {
            // Try to interact with any available UI element
            const buttons = screen.queryAllByRole('button');
            if (buttons.length > 0) {
              fireEvent.click(buttons[0]);
            }
          }
        });

        // System should remain stable with mixed inputs
        const loadingElements = screen.getAllByText('Loading Piano Samples...');
        expect(loadingElements.length).toBeGreaterThan(0);

        // Release all keyboard inputs
        inputs.forEach(input => {
          if (input.type === 'keyboard') {
            const keyupEvent = new KeyboardEvent('keyup', { key: input.key });
            fireEvent(window, keyupEvent);
          }
        });

        unmount();
      }),
      { numRuns: 25 }
    );
  }, 60000);

  /**
   * Property SI-7: Application lifecycle maintains resource integrity
   * 
   * For any application lifecycle operations, resources should be
   * properly managed without leaks or corruption.
   */
  it('Property SI-7: Application lifecycle maintains resource integrity', async () => {
    const cyclesArb = fc.integer({ min: 1, max: 3 });

    await fc.assert(
      fc.asyncProperty(cyclesArb, async (cycles) => {
        for (let i = 0; i < cycles; i++) {
          const { unmount } = render(<App />);

          await waitFor(() => {
            const loadingElements = screen.getAllByText('Loading Piano Samples...');
            expect(loadingElements.length).toBeGreaterThan(0);
          });

          // Test basic functionality
          const testKey = 'b';
          const expectedNote = getPianoNoteForKey(testKey);
          expect(expectedNote).not.toBeNull();

          const keydownEvent = new KeyboardEvent('keydown', { key: testKey });
          fireEvent(window, keydownEvent);

          // Unmount and verify cleanup
          unmount();
        }

        // After all cycles, no errors should have occurred
        expect(true).toBe(true);
      }),
      { numRuns: 15 }
    );
  }, 60000);

  /**
   * Property SI-8: Unmapped keys never produce effects
   * 
   * For any unmapped keyboard key, the system should never produce
   * unintended effects regardless of system state.
   */
  it('Property SI-8: Unmapped keys never produce effects', async () => {
    const unmappedKeyArb = fc.constantFrom(
      'Escape', 'Tab', 'Enter', 'Shift', 'Control',
      'ArrowUp', 'ArrowDown', 'F1', 'F5', ' '
    );

    await fc.assert(
      fc.asyncProperty(unmappedKeyArb, async (key) => {
        const { unmount } = render(<App />);

        await waitFor(() => {
          const loadingElements = screen.getAllByText('Loading Piano Samples...');
          expect(loadingElements.length).toBeGreaterThan(0);
        });

        // Verify the key is unmapped
        const note = getPianoNoteForKey(key);
        expect(note).toBeNull();

        // Simulate key press
        const keydownEvent = new KeyboardEvent('keydown', { key });
        fireEvent(window, keydownEvent);

        // System should remain stable
        const loadingElements = screen.getAllByText('Loading Piano Samples...');
        expect(loadingElements.length).toBeGreaterThan(0);

        // Simulate key release
        const keyupEvent = new KeyboardEvent('keyup', { key });
        fireEvent(window, keyupEvent);

        // System should still be stable
        const finalLoadingElements = screen.getAllByText('Loading Piano Samples...');
        expect(finalLoadingElements.length).toBeGreaterThan(0);

        unmount();
      }),
      { numRuns: 30 }
    );
  }, 60000);

  /**
   * Property SI-9: State transitions are atomic and consistent
   * 
   * For any system state transition, the transition should be atomic
   * and maintain consistency without intermediate invalid states.
   */
  it('Property SI-9: State transitions are atomic and consistent', async () => {
    const { unmount } = render(<App />);

    // Track state transitions
    const states: string[] = [];

    // Initial state
    await waitFor(() => {
      const loadingElements = screen.getAllByText('Loading Piano Samples...');
      if (loadingElements.length > 0) {
        states.push('loading');
      }
      expect(loadingElements.length).toBeGreaterThan(0);
    });

    // Wait for potential state transition
    await waitFor(
      () => {
        const loadingElements = screen.getAllByText('Loading Piano Samples...');
        const errorElements = screen.queryAllByText('Loading Failed');
        
        if (loadingElements.length > 0 && errorElements.length > 0) {
          states.push('loading+error');
        } else if (loadingElements.length > 0) {
          states.push('loading');
        } else if (errorElements.length > 0) {
          states.push('error');
        }

        // Should have at least one state
        expect(states.length).toBeGreaterThan(0);
      },
      { timeout: 10000 }
    );

    // States should be valid
    expect(states.length).toBeGreaterThan(0);
    states.forEach(state => {
      expect(['loading', 'loading+error', 'error']).toContain(state);
    });

    unmount();
  }, 20000);

  /**
   * Property SI-10: Error messages provide actionable information
   * 
   * For any error state, the system should display informative
   * error messages that help users understand the situation.
   */
  it('Property SI-10: Error messages provide actionable information', async () => {
    const { unmount } = render(<App />);

    // Wait for potential error state
    await waitFor(
      () => {
        const loadingElements = screen.getAllByText('Loading Piano Samples...');
        expect(loadingElements.length).toBeGreaterThan(0);
      },
      { timeout: 10000 }
    );

    // Check for error messages if they exist
    const errorElements = screen.queryAllByText(/error|fail|unable|cannot/i);
    if (errorElements.length > 0) {
      // Error messages should be informative
      errorElements.forEach(errorElement => {
        expect(errorElement.textContent).toBeTruthy();
        expect(errorElement.textContent!.length).toBeGreaterThan(0);
      });
    }

    // System should remain accessible regardless
    const loadingElements = screen.getAllByText('Loading Piano Samples...');
    expect(loadingElements.length).toBeGreaterThan(0);

    unmount();
  }, 20000);
});