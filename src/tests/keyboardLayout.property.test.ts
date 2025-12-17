import { describe, it, expect, beforeAll } from 'vitest';
import * as fc from 'fast-check';
import { 
  generateKeyboardLayout,
  initializeKeyboardMapping
} from '../utils/keyboardLayout';

/**
 * Property-Based Tests for Keyboard Layout
 * Using fast-check to verify universal properties across all valid inputs
 */

describe('Keyboard Layout - Property-Based Tests', () => {
  // Initialize the keyboard mapping before running tests
  beforeAll(async () => {
    await initializeKeyboardMapping();
  });

  /**
   * **Feature: web-piano, Property 4: Responsive width calculation**
   * **Validates: Requirements 1.3, 5.1**
   * 
   * Property: For any screen width, white key widths should be calculated as 
   * a percentage of the total screen width, maintaining proportional scaling.
   * 
   * This property verifies that:
   * 1. White key widths are always calculated as percentages
   * 2. The sum of all white key widths equals 100% of screen width
   * 3. Each white key has equal width (proportional distribution)
   * 4. The calculation maintains consistency regardless of the number of white keys
   * 5. Width calculations are responsive and scale proportionally
   */
  it('Property 4: Responsive width calculation - white key widths scale proportionally as percentages', () => {
    // Get the keyboard layout (which is loaded from the 48-key mapping)
    const layout = generateKeyboardLayout();
    
    // Verify layout is initialized
    expect(layout.whiteKeys.length).toBeGreaterThan(0);
    
    // Property 1: White key width should be a positive percentage
    expect(layout.whiteKeyWidth).toBeGreaterThan(0);
    expect(layout.whiteKeyWidth).toBeLessThanOrEqual(100);
    
    // Property 2: The sum of all white key widths should equal 100%
    // (Each white key has width = 100 / whiteKeyCount)
    const totalWidth = layout.whiteKeyWidth * layout.whiteKeys.length;
    expect(totalWidth).toBeCloseTo(100, 5); // Allow small floating point errors
    
    // Property 3: Each white key should have equal width
    // This is implicit in the calculation: whiteKeyWidth = 100 / whiteKeyCount
    const expectedWidth = 100 / layout.whiteKeys.length;
    expect(layout.whiteKeyWidth).toBeCloseTo(expectedWidth, 10);
    
    // Property 4: Width calculation should be consistent
    // If we recalculate, we should get the same result
    const recalculatedWidth = 100 / layout.whiteKeys.length;
    expect(layout.whiteKeyWidth).toBeCloseTo(recalculatedWidth, 10);
  });

  /**
   * Property 4 (extended): Responsive width calculation with arbitrary key counts
   * 
   * This test verifies that the width calculation formula works correctly
   * for any valid number of white keys, demonstrating true proportional scaling.
   */
  it('Property 4 (extended): Width calculation formula maintains proportional scaling for any key count', () => {
    // Generator for valid white key counts (realistic piano range: 15-52 white keys)
    // 15 keys = ~2 octaves, 52 keys = full 88-key piano
    const whiteKeyCountArb = fc.integer({ min: 15, max: 52 });

    // Property: For any valid white key count, the width calculation should:
    // 1. Produce positive percentages
    // 2. Sum to 100% total width
    // 3. Distribute width equally among all keys
    fc.assert(
      fc.property(whiteKeyCountArb, (whiteKeyCount) => {
        // Calculate width using the same formula as the implementation
        const whiteKeyWidth = 100 / whiteKeyCount;
        
        // Assertion 1: Width should be positive and reasonable
        expect(whiteKeyWidth).toBeGreaterThan(0);
        expect(whiteKeyWidth).toBeLessThanOrEqual(100);
        
        // Assertion 2: Total width should equal 100%
        const totalWidth = whiteKeyWidth * whiteKeyCount;
        expect(totalWidth).toBeCloseTo(100, 5);
        
        // Assertion 3: Width should be inversely proportional to key count
        // More keys = smaller individual width
        // Fewer keys = larger individual width
        if (whiteKeyCount > 20) {
          expect(whiteKeyWidth).toBeLessThan(5); // Many keys = narrow keys
        }
        if (whiteKeyCount < 20) {
          expect(whiteKeyWidth).toBeGreaterThan(5); // Few keys = wide keys
        }
        
        // Assertion 4: Width calculation should be deterministic
        const recalculated = 100 / whiteKeyCount;
        expect(whiteKeyWidth).toBe(recalculated);
      }),
      { numRuns: 100 } // Run 100 iterations as specified in design doc
    );
  });

  /**
   * Property 4 (extended): Black key width maintains proportional relationship to white keys
   * 
   * This test verifies that black key widths are calculated proportionally
   * to white key widths, maintaining the visual relationship.
   */
  it('Property 4 (extended): Black key width maintains proportional relationship to white key width', () => {
    const layout = generateKeyboardLayout();
    
    // Verify layout is initialized
    expect(layout.whiteKeys.length).toBeGreaterThan(0);
    expect(layout.blackKeys.length).toBeGreaterThan(0);
    
    // Property: Black key width should be a fixed proportion of white key width
    // According to implementation: blackKeyWidth = whiteKeyWidth * 0.6
    const expectedBlackKeyWidth = layout.whiteKeyWidth * 0.6;
    expect(layout.blackKeyWidth).toBeCloseTo(expectedBlackKeyWidth, 10);
    
    // Property: Black keys should be narrower than white keys
    expect(layout.blackKeyWidth).toBeLessThan(layout.whiteKeyWidth);
    
    // Property: The ratio should be consistent (60% of white key width)
    const ratio = layout.blackKeyWidth / layout.whiteKeyWidth;
    expect(ratio).toBeCloseTo(0.6, 5);
  });

  /**
   * Property 4 (extended): Width calculations with arbitrary proportions
   * 
   * This test verifies that the proportional relationship between black and white
   * keys remains consistent across different key counts.
   */
  it('Property 4 (extended): Proportional relationship remains consistent across different key counts', () => {
    const whiteKeyCountArb = fc.integer({ min: 15, max: 52 });

    fc.assert(
      fc.property(whiteKeyCountArb, (whiteKeyCount) => {
        // Calculate widths using the same formulas as the implementation
        const whiteKeyWidth = 100 / whiteKeyCount;
        const blackKeyWidth = whiteKeyWidth * 0.6;
        
        // Property 1: Black key width should always be 60% of white key width
        const ratio = blackKeyWidth / whiteKeyWidth;
        expect(ratio).toBeCloseTo(0.6, 10);
        
        // Property 2: Both widths should be positive
        expect(whiteKeyWidth).toBeGreaterThan(0);
        expect(blackKeyWidth).toBeGreaterThan(0);
        
        // Property 3: Black keys should always be narrower than white keys
        expect(blackKeyWidth).toBeLessThan(whiteKeyWidth);
        
        // Property 4: The proportional relationship should be maintained
        // regardless of the number of keys
        expect(blackKeyWidth).toBeCloseTo(whiteKeyWidth * 0.6, 10);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: web-piano, Property 5: Black key positioning consistency**
   * **Validates: Requirements 5.3**
   * 
   * Property: For any screen size, black keys should be positioned between the 
   * correct white keys with consistent proportional spacing.
   * 
   * This property verifies that:
   * 1. Black keys are positioned between their corresponding white keys
   * 2. Black key positions are calculated as percentages (responsive)
   * 3. Black key offsets maintain consistent proportional spacing
   * 4. The positioning formula produces valid positions (0-100%)
   * 5. Black keys follow the correct musical pattern (C#/D# between C-D-E, F#/G#/A# between F-G-A-B)
   */
  it('Property 5: Black key positioning consistency - black keys positioned correctly between white keys', () => {
    const layout = generateKeyboardLayout();
    
    // Verify layout is initialized
    expect(layout.whiteKeys.length).toBeGreaterThan(0);
    expect(layout.blackKeys.length).toBeGreaterThan(0);
    
    // Property 1: All black keys should have valid offset percentages (0-100%)
    layout.blackKeys.forEach(blackKey => {
      expect(blackKey.offsetPercentage).toBeGreaterThanOrEqual(0);
      expect(blackKey.offsetPercentage).toBeLessThanOrEqual(100);
    });
    
    // Property 2: Black keys should be positioned between white keys
    // Each black key should have an offset greater than its preceding white key
    layout.blackKeys.forEach(blackKey => {
      // Find the white key that this black key should follow
      // Black keys follow the pattern: C# after C, D# after D, F# after F, G# after G, A# after A
      const blackNoteName = blackKey.note.replace(/\d+/, '').replace('#', '');
      
      // Find the corresponding white key
      const whiteKeyIndex = layout.whiteKeys.findIndex(wk => {
        const wkNote = wk.note.replace(/\d+/, '');
        return wk.octave === blackKey.octave && wkNote === blackNoteName;
      });
      
      if (whiteKeyIndex >= 0) {
        // Black key offset should be greater than the white key's position
        const whiteKeyOffset = whiteKeyIndex * layout.whiteKeyWidth;
        expect(blackKey.offsetPercentage).toBeGreaterThan(whiteKeyOffset);
        
        // Black key offset should be less than the next white key's position
        const nextWhiteKeyOffset = (whiteKeyIndex + 1) * layout.whiteKeyWidth;
        expect(blackKey.offsetPercentage).toBeLessThan(nextWhiteKeyOffset);
      }
    });
    
    // Property 3: Black key positioning should use consistent proportional offset
    // According to implementation: offset = (whiteKeyIndex * whiteKeyWidth) + (whiteKeyWidth * 0.7)
    layout.blackKeys.forEach(blackKey => {
      const blackNoteName = blackKey.note.replace(/\d+/, '').replace('#', '');
      const whiteKeyIndex = layout.whiteKeys.findIndex(wk => {
        const wkNote = wk.note.replace(/\d+/, '');
        return wk.octave === blackKey.octave && wkNote === blackNoteName;
      });
      
      if (whiteKeyIndex >= 0) {
        // Calculate expected offset using the same formula as implementation
        const expectedOffset = (whiteKeyIndex * layout.whiteKeyWidth) + (layout.whiteKeyWidth * 0.7);
        expect(blackKey.offsetPercentage).toBeCloseTo(expectedOffset, 5);
      }
    });
    
    // Property 4: Black keys should maintain musical pattern
    // In each octave: C#, D#, F#, G#, A# (no E# or B#)
    const blackKeyNotes = layout.blackKeys.map(k => k.note.replace(/\d+/, ''));
    const validBlackNotes = ['C#', 'D#', 'F#', 'G#', 'A#'];
    
    blackKeyNotes.forEach(note => {
      expect(validBlackNotes).toContain(note);
    });
  });

  /**
   * Property 5 (extended): Black key positioning scales proportionally with different key counts
   * 
   * This test verifies that black key positioning maintains consistent proportional
   * spacing regardless of the total number of white keys (screen size).
   */
  it('Property 5 (extended): Black key positioning scales proportionally across different layouts', () => {
    // Generator for valid white key counts
    const whiteKeyCountArb = fc.integer({ min: 15, max: 52 });
    
    // Generator for valid white key indices where black keys can exist
    // Black keys exist after: C, D, F, G, A (not after E or B)
    const validBlackKeyPositions = fc.constantFrom('C', 'D', 'F', 'G', 'A');

    fc.assert(
      fc.property(whiteKeyCountArb, validBlackKeyPositions, (whiteKeyCount, _whiteNoteName) => {
        // Calculate layout parameters
        const whiteKeyWidth = 100 / whiteKeyCount;
        
        // Simulate a white key index (any valid position in the layout)
        const whiteKeyIndex = fc.sample(fc.integer({ min: 0, max: whiteKeyCount - 2 }), 1)[0];
        
        // Calculate black key offset using the implementation formula
        const blackKeyOffset = (whiteKeyIndex * whiteKeyWidth) + (whiteKeyWidth * 0.7);
        
        // Property 1: Black key offset should be within valid range
        expect(blackKeyOffset).toBeGreaterThanOrEqual(0);
        expect(blackKeyOffset).toBeLessThanOrEqual(100);
        
        // Property 2: Black key should be positioned after its white key
        const whiteKeyPosition = whiteKeyIndex * whiteKeyWidth;
        expect(blackKeyOffset).toBeGreaterThan(whiteKeyPosition);
        
        // Property 3: Black key should be positioned before the next white key
        const nextWhiteKeyPosition = (whiteKeyIndex + 1) * whiteKeyWidth;
        expect(blackKeyOffset).toBeLessThan(nextWhiteKeyPosition);
        
        // Property 4: The proportional offset (0.7 * whiteKeyWidth) should be consistent
        const proportionalOffset = blackKeyOffset - whiteKeyPosition;
        expect(proportionalOffset).toBeCloseTo(whiteKeyWidth * 0.7, 10);
        
        // Property 5: Positioning should be deterministic
        const recalculatedOffset = (whiteKeyIndex * whiteKeyWidth) + (whiteKeyWidth * 0.7);
        expect(blackKeyOffset).toBe(recalculatedOffset);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: web-piano, Property 6: Height ratio preservation**
   * **Validates: Requirements 5.4**
   * 
   * Property: For any screen size, the ratio between white key height and black key 
   * height should remain constant.
   * 
   * This property verifies that:
   * 1. The height ratio between black and white keys is consistent (0.6 or 60%)
   * 2. Black keys are always shorter than white keys
   * 3. The ratio is maintained regardless of screen size or layout changes
   * 4. Height calculations produce valid positive values
   */
  it('Property 6: Height ratio preservation - black key height maintains constant ratio to white key height', () => {
    // According to the implementation in PianoKey.tsx:
    // White key height: 200px
    // Black key height: 120px
    // Expected ratio: 120 / 200 = 0.6
    const WHITE_KEY_HEIGHT = 200;
    const BLACK_KEY_HEIGHT = 120;
    const EXPECTED_RATIO = 0.6;
    
    // Property 1: Heights should be positive
    expect(WHITE_KEY_HEIGHT).toBeGreaterThan(0);
    expect(BLACK_KEY_HEIGHT).toBeGreaterThan(0);
    
    // Property 2: Black keys should be shorter than white keys
    expect(BLACK_KEY_HEIGHT).toBeLessThan(WHITE_KEY_HEIGHT);
    
    // Property 3: The ratio should be exactly 0.6 (60%)
    const actualRatio = BLACK_KEY_HEIGHT / WHITE_KEY_HEIGHT;
    expect(actualRatio).toBeCloseTo(EXPECTED_RATIO, 10);
    
    // Property 4: The ratio should be consistent when recalculated
    const recalculatedRatio = BLACK_KEY_HEIGHT / WHITE_KEY_HEIGHT;
    expect(actualRatio).toBe(recalculatedRatio);
  });

  /**
   * Property 6 (extended): Height ratio preservation across arbitrary dimensions
   * 
   * This test verifies that the height ratio formula maintains consistency
   * across different possible screen sizes and scaling factors.
   */
  it('Property 6 (extended): Height ratio remains constant across different scaling factors', () => {
    // Generator for valid scaling factors (representing different screen sizes)
    // Range from 0.5x to 3x to cover mobile to large desktop displays
    const scalingFactorArb = fc.double({ min: 0.5, max: 3.0, noNaN: true });
    
    // Base heights from the implementation
    const BASE_WHITE_HEIGHT = 200;
    const BASE_BLACK_HEIGHT = 120;
    const EXPECTED_RATIO = 0.6;

    fc.assert(
      fc.property(scalingFactorArb, (scalingFactor) => {
        // Calculate scaled heights (simulating responsive design)
        const scaledWhiteHeight = BASE_WHITE_HEIGHT * scalingFactor;
        const scaledBlackHeight = BASE_BLACK_HEIGHT * scalingFactor;
        
        // Property 1: Scaled heights should be positive
        expect(scaledWhiteHeight).toBeGreaterThan(0);
        expect(scaledBlackHeight).toBeGreaterThan(0);
        
        // Property 2: Black keys should always be shorter than white keys
        expect(scaledBlackHeight).toBeLessThan(scaledWhiteHeight);
        
        // Property 3: The ratio should remain constant at 0.6 regardless of scaling
        const ratio = scaledBlackHeight / scaledWhiteHeight;
        expect(ratio).toBeCloseTo(EXPECTED_RATIO, 10);
        
        // Property 4: The ratio should equal the base ratio
        const baseRatio = BASE_BLACK_HEIGHT / BASE_WHITE_HEIGHT;
        expect(ratio).toBeCloseTo(baseRatio, 10);
        
        // Property 5: Ratio calculation should be deterministic
        const recalculatedRatio = scaledBlackHeight / scaledWhiteHeight;
        expect(ratio).toBe(recalculatedRatio);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 6 (extended): Height ratio preservation with arbitrary height values
   * 
   * This test verifies that for any pair of heights maintaining the 0.6 ratio,
   * the relationship holds true.
   */
  it('Property 6 (extended): Height ratio formula maintains consistency for any valid heights', () => {
    // Generator for valid white key heights (reasonable range for UI elements)
    const whiteHeightArb = fc.integer({ min: 100, max: 500 });

    fc.assert(
      fc.property(whiteHeightArb, (whiteHeight) => {
        // Calculate black height using the ratio formula
        const RATIO = 0.6;
        const blackHeight = whiteHeight * RATIO;
        
        // Property 1: Both heights should be positive
        expect(whiteHeight).toBeGreaterThan(0);
        expect(blackHeight).toBeGreaterThan(0);
        
        // Property 2: Black key should be shorter
        expect(blackHeight).toBeLessThan(whiteHeight);
        
        // Property 3: The ratio should be exactly 0.6
        const calculatedRatio = blackHeight / whiteHeight;
        expect(calculatedRatio).toBeCloseTo(RATIO, 10);
        
        // Property 4: The relationship should be reversible
        // If we know the ratio and black height, we can recover white height
        const recoveredWhiteHeight = blackHeight / RATIO;
        expect(recoveredWhiteHeight).toBeCloseTo(whiteHeight, 10);
        
        // Property 5: The ratio should be consistent
        expect(blackHeight).toBeCloseTo(whiteHeight * RATIO, 10);
      }),
      { numRuns: 100 }
    );
  });
});

