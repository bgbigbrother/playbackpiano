import { describe, it, expect, beforeAll } from 'vitest';
import { 
  generateKeyboardLayout, 
  calculateWhiteKeyWidth, 
  calculateBlackKeyWidth,
  calculateBlackKeyOffset,
  getAllPianoNotes,
  initializeKeyboardMapping
} from '../utils/keyboardLayout';

describe('Keyboard Layout Utilities', () => {
  // Initialize the keyboard mapping before running tests
  beforeAll(async () => {
    await initializeKeyboardMapping();
  });

  describe('generateKeyboardLayout', () => {
    it('should generate white keys from the 48-key mapping', () => {
      const layout = generateKeyboardLayout();
      // The 48-key mapping has 28 white keys (excluding null keys)
      expect(layout.whiteKeys.length).toBeGreaterThan(20);
      expect(layout.whiteKeys.length).toBeLessThan(30);
    });

    it('should generate black keys from the 48-key mapping', () => {
      const layout = generateKeyboardLayout();
      // The 48-key mapping has 20 black keys
      expect(layout.blackKeys.length).toBeGreaterThan(15);
      expect(layout.blackKeys.length).toBeLessThan(25);
    });

    it('should start with C2 as the first white key', () => {
      const layout = generateKeyboardLayout();
      expect(layout.whiteKeys[0].note).toBe('C2');
    });

    it('should have all white keys marked as not black', () => {
      const layout = generateKeyboardLayout();
      layout.whiteKeys.forEach(key => {
        expect(key.isBlack).toBe(false);
      });
    });

    it('should have all black keys marked as black', () => {
      const layout = generateKeyboardLayout();
      layout.blackKeys.forEach(key => {
        expect(key.isBlack).toBe(true);
      });
    });
  });

  describe('responsive width calculations', () => {
    it('should calculate white key width as percentage of screen', () => {
      const width = calculateWhiteKeyWidth();
      // Width should be a percentage string
      expect(width).toMatch(/^\d+(\.\d+)?%$/);
      expect(parseFloat(width)).toBeGreaterThan(0);
    });

    it('should calculate black key width as percentage of white key width', () => {
      const width = calculateBlackKeyWidth();
      // Width should be a percentage string
      expect(width).toMatch(/^\d+(\.\d+)?%$/);
      expect(parseFloat(width)).toBeGreaterThan(0);
    });

    it('should calculate black key offset correctly', () => {
      const offset = calculateBlackKeyOffset(0);
      // Offset should be a percentage string
      expect(offset).toMatch(/^\d+(\.\d+)?%$/);
      expect(parseFloat(offset)).toBeGreaterThan(0);
    });
  });

  describe('getAllPianoNotes', () => {
    it('should return all notes in the keyboard range', () => {
      const notes = getAllPianoNotes();
      // Should include both white and black keys (48 total)
      expect(notes.length).toBeGreaterThan(40);
      expect(notes[0]).toBe('C2'); // Should start with C2
    });
  });
});