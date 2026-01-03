import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { NoteLogger } from '../utils/NoteLogger';
import { AudioEngine } from '../utils/AudioEngine';

/**
 * Property-Based Tests for Note Logging Behavior
 * Using fast-check to verify universal properties across all valid piano keys
 */

// Mock AudioEngine for testing
vi.mock('../utils/AudioEngine');

describe('NoteLogger - Property-Based Tests', () => {
  let noteLogger: NoteLogger;
  let mockAudioEngine: AudioEngine;

  beforeEach(() => {
    // Create mock AudioEngine
    mockAudioEngine = {
      isReady: true,
      playNote: vi.fn(),
      dispose: vi.fn(),
    } as any;

    noteLogger = new NoteLogger(mockAudioEngine);
    vi.clearAllMocks();
  });

  afterEach(() => {
    noteLogger.dispose();
    vi.restoreAllMocks();
  });

  /**
   * **Feature: piano-control-panel, Property 5: Note logging behavior**
   * **Validates: Requirements 2.1**
   * 
   * Property: For any piano key press, when note logging is active, a note entry with 
   * correct note name and timestamp should be added to the log.
   * 
   * This property verifies that:
   * 1. When a piano key is played, a note entry is created and added to the log
   * 2. The note entry contains the correct note name that was played
   * 3. The note entry has a valid timestamp reflecting when it was logged
   * 4. The log count increases by exactly one for each note logged
   * 5. The behavior is consistent across all valid piano keys
   * 6. Each logged entry has a unique ID for identification
   */
  it('Property 5: Note logging behavior - any piano key press creates correct note entry in log', () => {
    // Generator for valid piano notes
    // Piano notes consist of: note name (A-G), optional sharp (#), and octave (0-8)
    const noteNameArb = fc.constantFrom('A', 'B', 'C', 'D', 'E', 'F', 'G');
    const sharpArb = fc.constantFrom('', '#');
    const octaveArb = fc.integer({ min: 0, max: 8 });

    const validNoteArb = fc.tuple(noteNameArb, sharpArb, octaveArb).map(
      ([name, sharp, octave]) => `${name}${sharp}${octave}`
    );

    // Property: For any valid piano key, logging the note should create a correct entry
    fc.assert(
      fc.property(validNoteArb, (note) => {
        // Arrange: Clear the log and record initial state
        noteLogger.clearLog();
        const initialCount = noteLogger.getEntryCount();
        const timestampBefore = Date.now();
        
        // Verify initial state - log should be empty
        expect(initialCount).toBe(0);
        expect(noteLogger.entries).toHaveLength(0);
        
        // Act: Log the note (simulate piano key press)
        noteLogger.logNote(note);
        
        Date.now();
        
        // Assert: Note entry should be created with correct properties
        
        // 1. Log count should increase by exactly one
        expect(noteLogger.getEntryCount()).toBe(initialCount + 1);
        expect(noteLogger.entries).toHaveLength(1);
        
        // 2. The logged entry should contain the correct note name
        const loggedEntry = noteLogger.entries[0];
        expect(loggedEntry.note).toBe(note);
        
        // 3. The entry should have a valid timestamp within the test timeframe
        expect(loggedEntry.timestamp).toBeGreaterThanOrEqual(timestampBefore);
        expect(loggedEntry.timestamp).toBeLessThanOrEqual(Date.now());
        expect(typeof loggedEntry.timestamp).toBe('number');
        
        // 4. The entry should have a unique ID for identification
        expect(loggedEntry.id).toBeDefined();
        expect(typeof loggedEntry.id).toBe('string');
        expect(loggedEntry.id).toMatch(/^note_\d+$/); // Format: "note_N"
        
        // 5. The entry should be accessible through the entries getter
        const allEntries = noteLogger.entries;
        expect(allEntries).toContain(loggedEntry);
        expect(allEntries[0]).toEqual(loggedEntry);
        
        // 6. Verify the entry structure matches the NoteEntry interface
        expect(loggedEntry).toHaveProperty('id');
        expect(loggedEntry).toHaveProperty('note');
        expect(loggedEntry).toHaveProperty('timestamp');
        
        // Clean up for next iteration
        noteLogger.clearLog();
      }),
      { numRuns: 100 } // Run 100 iterations as specified in design doc
    );
  });

  /**
   * **Feature: piano-control-panel, Property 6: Note log chronological ordering**
   * **Validates: Requirements 2.2**
   * 
   * Property: For any sequence of note entries, the log should display them in 
   * chronological order based on their timestamps.
   * 
   * This property verifies that:
   * 1. Notes logged at different times maintain chronological order in the log
   * 2. The log displays entries in order of their timestamps (earliest first)
   * 3. Chronological ordering is preserved regardless of note content
   * 4. The ordering remains consistent across different access methods
   * 5. Import functionality maintains chronological order when loading entries
   */
  it('Property 6: Note log chronological ordering - entries are always displayed in timestamp order', () => {
    // Generator for sequences of notes with controlled timing
    const noteArb = fc.constantFrom('C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5');
    const noteSequenceArb = fc.array(noteArb, { minLength: 2, maxLength: 10 });

    fc.assert(
      fc.property(noteSequenceArb, (notes) => {
        // Arrange: Clear the log
        noteLogger.clearLog();
        expect(noteLogger.getEntryCount()).toBe(0);
        
        const baseTimestamp = Date.now();
        const manualEntries: Array<{ note: string; timestamp: number }> = [];
        
        // Create entries with deliberately varied timestamps to test ordering
        for (let i = 0; i < notes.length; i++) {
          // Add random delays between 1-50ms to create realistic timestamp differences
          const delay = Math.floor(Math.random() * 50) + 1;
          const timestamp = baseTimestamp + (i * 100) + delay;
          manualEntries.push({ note: notes[i], timestamp });
        }
        
        // Act: Log notes with controlled timing by temporarily mocking Date.now()
        const originalDateNow = Date.now;
        
        try {
          for (const entry of manualEntries) {
            // Mock Date.now() to return our controlled timestamp
            vi.spyOn(Date, 'now').mockReturnValue(entry.timestamp);
            noteLogger.logNote(entry.note);
            vi.restoreAllMocks();
          }
        } finally {
          // Ensure Date.now is restored even if test fails
          Date.now = originalDateNow;
        }
        
        // Assert: Entries should be in chronological order
        
        // 1. Correct number of entries logged
        expect(noteLogger.getEntryCount()).toBe(notes.length);
        const loggedEntries = noteLogger.entries;
        expect(loggedEntries).toHaveLength(notes.length);
        
        // 2. Entries should be in chronological order (timestamps non-decreasing)
        for (let i = 1; i < loggedEntries.length; i++) {
          expect(loggedEntries[i].timestamp).toBeGreaterThanOrEqual(loggedEntries[i - 1].timestamp);
        }
        
        // 3. Each entry should have the expected timestamp from our controlled input
        for (let i = 0; i < loggedEntries.length; i++) {
          expect(loggedEntries[i].note).toBe(manualEntries[i].note);
          expect(loggedEntries[i].timestamp).toBe(manualEntries[i].timestamp);
        }
        
        // 4. Verify chronological order is maintained across different access methods
        const recentEntries = noteLogger.getRecentEntries(notes.length);
        expect(recentEntries).toEqual(loggedEntries);
        
        // Verify timestamps are in ascending order
        const timestamps = loggedEntries.map(entry => entry.timestamp);
        const sortedTimestamps = [...timestamps].sort((a, b) => a - b);
        expect(timestamps).toEqual(sortedTimestamps);
        
        // 5. Test chronological ordering with range queries
        if (loggedEntries.length >= 2) {
          const firstTimestamp = loggedEntries[0].timestamp;
          const lastTimestamp = loggedEntries[loggedEntries.length - 1].timestamp;
          const midTimestamp = Math.floor((firstTimestamp + lastTimestamp) / 2);
          
          const rangeEntries = noteLogger.getEntriesInRange(firstTimestamp, midTimestamp);
          
          // Range entries should also be in chronological order
          for (let i = 1; i < rangeEntries.length; i++) {
            expect(rangeEntries[i].timestamp).toBeGreaterThanOrEqual(rangeEntries[i - 1].timestamp);
          }
          
          // All range entries should be within the specified time bounds
          rangeEntries.forEach(entry => {
            expect(entry.timestamp).toBeGreaterThanOrEqual(firstTimestamp);
            expect(entry.timestamp).toBeLessThanOrEqual(midTimestamp);
          });
        }
        
        // Clean up
        noteLogger.clearLog();
      }),
      { numRuns: 100 } // Run 100 iterations as specified in design doc
    );
  });

  /**
   * Property 6 (extended): Import functionality preserves chronological order
   * Verifies that importing entries maintains chronological ordering
   */
  it('Property 6 (extended): Import functionality maintains chronological order', () => {
    const noteArb = fc.constantFrom('C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4');
    const noteSequenceArb = fc.array(noteArb, { minLength: 3, maxLength: 8 });

    fc.assert(
      fc.property(noteSequenceArb, (notes) => {
        // Arrange: Create entries with deliberately out-of-order timestamps
        const baseTimestamp = Date.now();
        const unorderedEntries = notes.map((note, index) => ({
          id: `test_${index}`,
          note,
          timestamp: baseTimestamp + (notes.length - index) * 1000, // Reverse order timestamps
          velocity: 0.8
        }));
        
        // Create export data with out-of-order entries
        const exportData = {
          entries: unorderedEntries,
          exportTimestamp: Date.now(),
          version: '1.0'
        };
        
        const jsonData = JSON.stringify(exportData);
        
        // Act: Import the out-of-order data
        noteLogger.clearLog();
        noteLogger.importLog(jsonData);
        
        // Assert: Entries should be automatically sorted in chronological order
        
        const importedEntries = noteLogger.entries;
        expect(importedEntries).toHaveLength(notes.length);
        
        // 1. Entries should be in chronological order despite being imported out of order
        for (let i = 1; i < importedEntries.length; i++) {
          expect(importedEntries[i].timestamp).toBeGreaterThanOrEqual(importedEntries[i - 1].timestamp);
        }
        
        // 2. All original entries should be present (content preserved)
        const importedNotes = importedEntries.map(entry => entry.note);
        const expectedNotes = [...notes].reverse(); // Original was in reverse timestamp order
        expect(importedNotes).toEqual(expectedNotes);
        
        // 3. Timestamps should be in ascending order
        const timestamps = importedEntries.map(entry => entry.timestamp);
        const sortedTimestamps = [...timestamps].sort((a, b) => a - b);
        expect(timestamps).toEqual(sortedTimestamps);
        
        // Clean up
        noteLogger.clearLog();
      }),
      { numRuns: 50 }
    );
  });

  /**
   * Extended property test: Multiple notes logging behavior
   * Verifies that multiple notes can be logged in sequence and maintain correct order
   */
  it('Property 5 (extended): Multiple notes are logged in chronological order', () => {
    // Generator for sequences of valid piano notes
    const noteArb = fc.constantFrom('C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5');
    const noteSequenceArb = fc.array(noteArb, { minLength: 2, maxLength: 8 });

    fc.assert(
      fc.property(noteSequenceArb, (notes) => {
        // Arrange: Clear the log
        noteLogger.clearLog();
        expect(noteLogger.getEntryCount()).toBe(0);
        
        const timestamps: number[] = [];
        
        // Act: Log all notes in sequence with small delays to ensure different timestamps
        for (let i = 0; i < notes.length; i++) {
          const timestampBefore = Date.now();
          noteLogger.logNote(notes[i]);
          timestamps.push(timestampBefore);
          
          // Small delay to ensure different timestamps (in real usage, user input has natural delays)
          if (i < notes.length - 1) {
            // Use a synchronous delay for testing
            const start = Date.now();
            while (Date.now() - start < 1) {
              // Busy wait for 1ms to ensure timestamp difference
            }
          }
        }
        
        // Assert: All notes should be logged in chronological order
        
        // 1. Correct number of entries
        expect(noteLogger.getEntryCount()).toBe(notes.length);
        expect(noteLogger.entries).toHaveLength(notes.length);
        
        // 2. Each note should be logged with correct name
        const loggedEntries = noteLogger.entries;
        for (let i = 0; i < notes.length; i++) {
          expect(loggedEntries[i].note).toBe(notes[i]);
          expect(loggedEntries[i].id).toBeDefined();
          expect(loggedEntries[i].timestamp).toBeGreaterThanOrEqual(timestamps[i]);
        }
        
        // 3. Entries should be in chronological order (timestamps should be non-decreasing)
        for (let i = 1; i < loggedEntries.length; i++) {
          expect(loggedEntries[i].timestamp).toBeGreaterThanOrEqual(loggedEntries[i - 1].timestamp);
        }
        
        // 4. Each entry should have a unique ID
        const ids = loggedEntries.map(entry => entry.id);
        const uniqueIds = Array.from(new Set(ids));
        expect(uniqueIds).toHaveLength(notes.length);
        
        // Clean up
        noteLogger.clearLog();
      }),
      { numRuns: 50 }
    );
  });

  /**
   * Extended property test: Note logging with velocity
   * Verifies that velocity parameter is correctly stored when provided
   */
  it('Property 5 (extended): Note logging preserves velocity information when provided', () => {
    const noteArb = fc.constantFrom('C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4');
    const velocityArb = fc.double({ min: 0, max: 1, noNaN: true });

    fc.assert(
      fc.property(noteArb, velocityArb, (note, velocity) => {
        // Arrange: Clear the log
        noteLogger.clearLog();
        expect(noteLogger.getEntryCount()).toBe(0);
        
        // Act: Log note with velocity
        noteLogger.logNote(note, velocity);
        
        // Assert: Note entry should preserve velocity information
        expect(noteLogger.getEntryCount()).toBe(1);
        
        const loggedEntry = noteLogger.entries[0];
        expect(loggedEntry.note).toBe(note);
        expect(loggedEntry.velocity).toBe(velocity);
        expect(loggedEntry.timestamp).toBeDefined();
        expect(loggedEntry.id).toBeDefined();
        
        // Clean up
        noteLogger.clearLog();
      }),
      { numRuns: 50 }
    );
  });

  /**
   * Extended property test: Invalid input handling
   * Verifies that invalid note inputs are handled gracefully without corrupting the log
   */
  it('Property 5 (extended): Invalid note inputs are rejected without corrupting log', () => {
    // Generator for invalid note inputs that the NoteLogger actually rejects
    // Based on the implementation: only falsy values and non-strings are rejected
    const invalidNoteArb = fc.oneof(
      fc.constant(''), // Empty string (falsy)
      fc.constant(null as any), // Null (falsy)
      fc.constant(undefined as any), // Undefined (falsy)
      fc.integer(), // Numbers (not strings)
      fc.boolean(), // Booleans (not strings)
      fc.constant(0 as any), // Zero (falsy and not string)
      fc.constant(false as any) // False (falsy and not string)
    );

    fc.assert(
      fc.property(invalidNoteArb, (invalidNote) => {
        // Arrange: Clear the log and add a valid note first
        noteLogger.clearLog();
        noteLogger.logNote('C4'); // Add a valid note as baseline
        expect(noteLogger.getEntryCount()).toBe(1);
        
        const initialCount = noteLogger.getEntryCount();
        const initialEntries = [...noteLogger.entries];
        
        // Act: Attempt to log invalid note
        noteLogger.logNote(invalidNote);
        
        // Assert: Log should remain unchanged (invalid input rejected)
        expect(noteLogger.getEntryCount()).toBe(initialCount);
        expect(noteLogger.entries).toEqual(initialEntries);
        
        // Verify the original valid entry is still intact
        expect(noteLogger.entries[0].note).toBe('C4');
        
        // Clean up
        noteLogger.clearLog();
      }),
      { numRuns: 50 }
    );
  });

  /**
   * Extended property test: String input acceptance
   * Verifies that any non-empty string is accepted as a note (current implementation behavior)
   */
  it('Property 5 (extended): Any non-empty string is accepted as note input', () => {
    // Generator for any non-empty string (which the current implementation accepts)
    const anyStringArb = fc.string({ minLength: 1 });

    fc.assert(
      fc.property(anyStringArb, (noteString) => {
        // Arrange: Clear the log
        noteLogger.clearLog();
        expect(noteLogger.getEntryCount()).toBe(0);
        
        // Act: Log the string as a note
        noteLogger.logNote(noteString);
        
        // Assert: String should be accepted and logged
        expect(noteLogger.getEntryCount()).toBe(1);
        
        const loggedEntry = noteLogger.entries[0];
        expect(loggedEntry.note).toBe(noteString);
        expect(loggedEntry.id).toBeDefined();
        expect(loggedEntry.timestamp).toBeDefined();
        
        // Clean up
        noteLogger.clearLog();
      }),
      { numRuns: 30 }
    );
  });

  /**
   * Extended property test: Concurrent logging simulation
   * Verifies that rapid successive note logging maintains data integrity
   */
  it('Property 5 (extended): Rapid successive note logging maintains data integrity', () => {
    const noteArb = fc.constantFrom('C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4');
    const rapidSequenceArb = fc.array(noteArb, { minLength: 5, maxLength: 20 });

    fc.assert(
      fc.property(rapidSequenceArb, (notes) => {
        // Arrange: Clear the log
        noteLogger.clearLog();
        expect(noteLogger.getEntryCount()).toBe(0);
        
        // Act: Log notes in rapid succession (simulating fast playing)
        notes.forEach(note => {
          noteLogger.logNote(note);
        });
        
        // Assert: All notes should be logged correctly despite rapid input
        
        // 1. Correct count
        expect(noteLogger.getEntryCount()).toBe(notes.length);
        expect(noteLogger.entries).toHaveLength(notes.length);
        
        // 2. All notes preserved in order
        const loggedEntries = noteLogger.entries;
        for (let i = 0; i < notes.length; i++) {
          expect(loggedEntries[i].note).toBe(notes[i]);
          expect(loggedEntries[i].id).toBeDefined();
          expect(loggedEntries[i].timestamp).toBeDefined();
        }
        
        // 3. All entries have unique IDs
        const ids = loggedEntries.map(entry => entry.id);
        const uniqueIds = Array.from(new Set(ids));
        expect(uniqueIds).toHaveLength(notes.length);
        
        // 4. Timestamps are in non-decreasing order
        for (let i = 1; i < loggedEntries.length; i++) {
          expect(loggedEntries[i].timestamp).toBeGreaterThanOrEqual(loggedEntries[i - 1].timestamp);
        }
        
        // Clean up
        noteLogger.clearLog();
      }),
      { numRuns: 30 }
    );
  });

  /**
   * Extended property test: Log state consistency
   * Verifies that the log maintains consistent state across different access methods
   */
  it('Property 5 (extended): Log state is consistent across different access methods', () => {
    const noteSetArb = fc.array(
      fc.constantFrom('C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4'), 
      { minLength: 1, maxLength: 10 }
    );

    fc.assert(
      fc.property(noteSetArb, (notes) => {
        // Arrange: Clear the log
        noteLogger.clearLog();
        
        // Act: Log all notes
        notes.forEach(note => {
          noteLogger.logNote(note);
        });
        
        // Assert: Different access methods should return consistent results
        
        const entryCount = noteLogger.getEntryCount();
        const entriesArray = noteLogger.entries;
        const recentEntries = noteLogger.getRecentEntries(notes.length);
        
        // 1. Count consistency
        expect(entryCount).toBe(notes.length);
        expect(entriesArray).toHaveLength(notes.length);
        expect(recentEntries).toHaveLength(notes.length);
        
        // 2. Content consistency
        expect(recentEntries).toEqual(entriesArray);
        
        // 3. Each entry accessible through different methods should be identical
        for (let i = 0; i < notes.length; i++) {
          expect(entriesArray[i]).toEqual(recentEntries[i]);
          expect(entriesArray[i].note).toBe(notes[i]);
        }
        
        // 4. Verify entries are immutable copies (defensive copying)
        const originalEntries = noteLogger.entries;
        const copiedEntries = noteLogger.entries;
        
        // Modifying the returned array should not affect the internal state
        copiedEntries.push({
          id: 'test_id',
          note: 'X4',
          timestamp: Date.now()
        });
        
        expect(noteLogger.entries).toEqual(originalEntries);
        expect(noteLogger.getEntryCount()).toBe(notes.length);
        
        // Clean up
        noteLogger.clearLog();
      }),
      { numRuns: 50 }
    );
  });

  /**
   * **Feature: piano-control-panel, Property 7: Note log replay accuracy**
   * **Validates: Requirements 2.3**
   * 
   * Property: For any logged note sequence, replay should reproduce the notes in 
   * their original order and timing.
   * 
   * This property verifies that:
   * 1. Replay calls AudioEngine.playNote for each logged note in the correct order
   * 2. The timing between replayed notes matches the original timing intervals
   * 3. Each replayed note uses the correct note name and velocity from the log
   * 4. Replay handles empty logs gracefully without errors
   * 5. Replay preserves the relative timing relationships between notes
   * 6. Replay works correctly with notes that have different velocities
   */
  it('Property 7: Note log replay accuracy - replay reproduces notes in original order and timing', async () => {
    // Generator for sequences of notes with controlled timing and velocity
    const noteArb = fc.constantFrom('C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5');
    const velocityArb = fc.double({ min: 0.1, max: 1.0, noNaN: true });
    const noteWithVelocityArb = fc.tuple(noteArb, velocityArb);
    const noteSequenceArb = fc.array(noteWithVelocityArb, { minLength: 1, maxLength: 5 });

    await fc.assert(
      fc.asyncProperty(noteSequenceArb, async (noteVelocityPairs) => {
        // Arrange: Clear the log and reset all mocks at start of each iteration
        noteLogger.clearLog();
        vi.clearAllMocks();
        vi.restoreAllMocks();
        expect(noteLogger.getEntryCount()).toBe(0);
        
        const baseTimestamp = Date.now();
        const playedNotes: Array<{ note: string; velocity: number; timestamp: number }> = [];
        
        // Create notes with controlled timing intervals
        for (let i = 0; i < noteVelocityPairs.length; i++) {
          const [note, velocity] = noteVelocityPairs[i];
          const interval = 50 + (i * 100); // 50ms, 150ms, 250ms, etc.
          const timestamp = baseTimestamp + interval;
          
          playedNotes.push({ note, velocity, timestamp });
        }
        
        // Mock Date.now() to control timestamps during logging
        const originalDateNow = Date.now;
        
        try {
          // Log notes with controlled timestamps
          for (let i = 0; i < playedNotes.length; i++) {
            Date.now = vi.fn().mockReturnValue(playedNotes[i].timestamp);
            noteLogger.logNote(playedNotes[i].note, playedNotes[i].velocity);
          }
        } finally {
          Date.now = originalDateNow;
        }
        
        // Verify notes were logged correctly
        expect(noteLogger.getEntryCount()).toBe(noteVelocityPairs.length);
        const loggedEntries = noteLogger.entries;
        
        // Track calls to AudioEngine.playNote during replay
        const playNoteCalls: Array<{ note: string; velocity: number; delay: number }> = [];
        const scheduledTimeouts: Array<{ delay: number; callback: () => void }> = [];
        
        // Mock setTimeout to capture timing without actual delays
        const originalSetTimeout = global.setTimeout;
        global.setTimeout = vi.fn().mockImplementation((callback: () => void, delay: number) => {
          scheduledTimeouts.push({ delay, callback });
          // Execute callback immediately for testing
          callback();
          return 1; // Return a fake timer ID
        }) as any;
        
        // Mock AudioEngine.playNote to capture calls
        mockAudioEngine.playNote = vi.fn().mockImplementation((note: string, velocity?: number) => {
          const currentTimeout = scheduledTimeouts[playNoteCalls.length];
          playNoteCalls.push({
            note,
            velocity: velocity || 0.8,
            delay: currentTimeout ? currentTimeout.delay : 0
          });
        });
        
        try {
          // Act: Replay the logged notes
          await noteLogger.replayLog();
          
          // Assert: Verify replay accuracy
          
          // 1. AudioEngine.playNote should be called for each logged note
          expect(mockAudioEngine.playNote).toHaveBeenCalledTimes(noteVelocityPairs.length);
          expect(playNoteCalls).toHaveLength(noteVelocityPairs.length);
          
          // 2. Notes should be replayed in the same order as logged
          for (let i = 0; i < noteVelocityPairs.length; i++) {
            const originalNote = playedNotes[i];
            const replayedCall = playNoteCalls[i];
            
            expect(replayedCall.note).toBe(originalNote.note);
            expect(replayedCall.velocity).toBe(originalNote.velocity);
          }
          
          // 3. Verify timing delays are calculated correctly (relative to first note)
          if (noteVelocityPairs.length > 1) {
            const firstTimestamp = playedNotes[0].timestamp;
            
            for (let i = 0; i < playedNotes.length; i++) {
              const expectedDelay = playedNotes[i].timestamp - firstTimestamp;
              expect(playNoteCalls[i].delay).toBe(expectedDelay);
            }
          }
          
          // 4. Verify all original note properties are preserved
          for (let i = 0; i < noteVelocityPairs.length; i++) {
            const [originalNote, originalVelocity] = noteVelocityPairs[i];
            const loggedEntry = loggedEntries[i];
            const replayedCall = playNoteCalls[i];
            
            // Logged entry should match original
            expect(loggedEntry.note).toBe(originalNote);
            expect(loggedEntry.velocity).toBe(originalVelocity);
            
            // Replayed call should match logged entry
            expect(replayedCall.note).toBe(loggedEntry.note);
            expect(replayedCall.velocity).toBe(loggedEntry.velocity);
          }
          
        } finally {
          // Restore setTimeout
          global.setTimeout = originalSetTimeout;
        }
        
        // Clean up for next iteration
        noteLogger.clearLog();
        vi.clearAllMocks();
        vi.restoreAllMocks();
      }),
      { 
        numRuns: 100,
        timeout: 1000 // 1 second timeout per property test (no real delays now)
      }
    );
  }, 5000); // 5 second timeout for the entire test

  /**
   * Property 7 (extended): Empty log replay handling
   * Verifies that replaying an empty log completes without errors
   */
  it('Property 7 (extended): Empty log replay completes gracefully without errors', async () => {
    // Arrange: Ensure log is empty
    noteLogger.clearLog();
    expect(noteLogger.getEntryCount()).toBe(0);
    
    // Clear any previous mock calls
    vi.clearAllMocks();
    
    // Act: Replay empty log
    await expect(noteLogger.replayLog()).resolves.toBeUndefined();
    
    // Assert: No calls to AudioEngine.playNote should be made
    expect(mockAudioEngine.playNote).not.toHaveBeenCalled();
  });

  /**
   * Property 7 (extended): Single note replay preserves note properties
   * Verifies that replaying a single note works correctly
   */
  it('Property 7 (extended): Single note replay preserves note properties', async () => {
    const noteArb = fc.constantFrom('C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4');
    const velocityArb = fc.double({ min: 0.1, max: 1.0, noNaN: true });

    await fc.assert(
      fc.asyncProperty(noteArb, velocityArb, async (note, velocity) => {
        // Arrange: Clear log and mocks at start of each iteration
        noteLogger.clearLog();
        vi.clearAllMocks();
        vi.restoreAllMocks();
        
        noteLogger.logNote(note, velocity);
        expect(noteLogger.getEntryCount()).toBe(1);
        
        // Track calls to AudioEngine.playNote
        const playNoteCalls: Array<{ note: string; velocity: number }> = [];
        
        // Mock setTimeout to execute immediately
        const originalSetTimeout = global.setTimeout;
        global.setTimeout = (vi.fn().mockImplementation((callback: () => void, _delay: number) => {
          callback(); // Execute immediately
          return 1;
        }) as any);
        
        mockAudioEngine.playNote = vi.fn().mockImplementation((n: string, v?: number) => {
          playNoteCalls.push({ note: n, velocity: v || 0.8 });
        });
        
        try {
          // Act: Replay single note
          await noteLogger.replayLog();
          
          // Assert: Single note should be replayed correctly
          expect(mockAudioEngine.playNote).toHaveBeenCalledTimes(1);
          expect(playNoteCalls).toHaveLength(1);
          
          const replayedCall = playNoteCalls[0];
          expect(replayedCall.note).toBe(note);
          expect(replayedCall.velocity).toBe(velocity);
        } finally {
          // Restore setTimeout
          global.setTimeout = originalSetTimeout;
        }
        
        // Clean up for next iteration
        noteLogger.clearLog();
        vi.clearAllMocks();
        vi.restoreAllMocks();
      }),
      { numRuns: 30, timeout: 500 } // Reduced iterations and timeout
    );
  }, 3000); // 3 second timeout for the entire test

  /**
   * **Feature: piano-control-panel, Property 8: Note log clearing**
   * **Validates: Requirements 2.4**
   * 
   * Property: For any note log with entries, when clear is activated, the log should become empty.
   * 
   * This property verifies that:
   * 1. Clearing a log with entries results in an empty log (count = 0)
   * 2. All entries are removed from the log after clearing
   * 3. The log state is completely reset (including internal counters)
   * 4. Clearing an empty log has no adverse effects
   * 5. After clearing, new notes can be logged normally
   * 6. Clearing preserves the log's capacity and configuration settings
   */
  it('Property 8: Note log clearing - any log with entries becomes empty when cleared', () => {
    // Generator for sequences of notes to populate the log
    const noteArb = fc.constantFrom('C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5');
    const velocityArb = fc.double({ min: 0.1, max: 1.0, noNaN: true });
    const noteWithVelocityArb = fc.tuple(noteArb, velocityArb);
    const noteSequenceArb = fc.array(noteWithVelocityArb, { minLength: 1, maxLength: 15 });

    fc.assert(
      fc.property(noteSequenceArb, (noteVelocityPairs) => {
        // Arrange: Clear the log and populate it with notes
        noteLogger.clearLog();
        expect(noteLogger.getEntryCount()).toBe(0);
        
        // Store original configuration
        const originalMaxEntries = noteLogger.maxEntries;
        
        // Populate the log with the generated notes
        for (const [note, velocity] of noteVelocityPairs) {
          noteLogger.logNote(note, velocity);
        }
        
        // Verify log is populated before clearing
        const entriesBeforeClear = noteLogger.getEntryCount();
        expect(entriesBeforeClear).toBe(noteVelocityPairs.length);
        expect(entriesBeforeClear).toBeGreaterThan(0);
        expect(noteLogger.entries).toHaveLength(noteVelocityPairs.length);
        
        // Verify entries contain expected data
        const loggedEntries = noteLogger.entries;
        for (let i = 0; i < noteVelocityPairs.length; i++) {
          const [expectedNote, expectedVelocity] = noteVelocityPairs[i];
          expect(loggedEntries[i].note).toBe(expectedNote);
          expect(loggedEntries[i].velocity).toBe(expectedVelocity);
          expect(loggedEntries[i].id).toBeDefined();
          expect(loggedEntries[i].timestamp).toBeDefined();
        }
        
        // Act: Clear the log
        noteLogger.clearLog();
        
        // Assert: Log should be completely empty
        
        // 1. Entry count should be zero
        expect(noteLogger.getEntryCount()).toBe(0);
        
        // 2. Entries array should be empty
        expect(noteLogger.entries).toHaveLength(0);
        expect(noteLogger.entries).toEqual([]);
        
        // 3. Configuration should be preserved
        expect(noteLogger.maxEntries).toBe(originalMaxEntries);
        
        // 4. Different access methods should all return empty results
        expect(noteLogger.getRecentEntries(10)).toHaveLength(0);
        expect(noteLogger.getEntriesInRange(0, Date.now())).toHaveLength(0);
        
        // 5. Log duration should be zero for empty log
        expect(noteLogger.getLogDuration()).toBe(0);
        
        // 6. Export should work with empty log
        const exportedData = noteLogger.exportLog();
        expect(exportedData).toBeDefined();
        const parsedExport = JSON.parse(exportedData);
        expect(parsedExport.entries).toHaveLength(0);
        
        // 7. After clearing, new notes should be logged normally
        noteLogger.logNote('C4', 0.8);
        expect(noteLogger.getEntryCount()).toBe(1);
        expect(noteLogger.entries[0].note).toBe('C4');
        expect(noteLogger.entries[0].velocity).toBe(0.8);
        
        // Clean up for next iteration
        noteLogger.clearLog();
      }),
      { numRuns: 100 } // Run 100 iterations as specified in design doc
    );
  });

  /**
   * Property 8 (extended): Clearing empty log has no adverse effects
   * Verifies that clearing an already empty log is safe and maintains proper state
   */
  it('Property 8 (extended): Clearing empty log maintains proper state without errors', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 5 }), (clearCount) => {
        // Arrange: Start with empty log
        noteLogger.clearLog();
        expect(noteLogger.getEntryCount()).toBe(0);
        
        const originalMaxEntries = noteLogger.maxEntries;
        
        // Act: Clear the log multiple times
        for (let i = 0; i < clearCount; i++) {
          noteLogger.clearLog();
          
          // Assert: Each clear should maintain empty state
          expect(noteLogger.getEntryCount()).toBe(0);
          expect(noteLogger.entries).toHaveLength(0);
          expect(noteLogger.maxEntries).toBe(originalMaxEntries);
        }
        
        // Verify log still functions normally after multiple clears
        noteLogger.logNote('A4', 0.7);
        expect(noteLogger.getEntryCount()).toBe(1);
        expect(noteLogger.entries[0].note).toBe('A4');
        
        // Clean up
        noteLogger.clearLog();
      }),
      { numRuns: 50 }
    );
  });

  /**
   * Property 8 (extended): Clear resets internal ID counter
   * Verifies that clearing the log resets internal state including ID generation
   */
  it('Property 8 (extended): Clear resets internal ID counter for fresh start', () => {
    const noteArb = fc.constantFrom('C4', 'D4', 'E4', 'F4', 'G4');
    
    fc.assert(
      fc.property(noteArb, noteArb, (firstNote, secondNote) => {
        // Arrange: Clear log and add a note to advance ID counter
        noteLogger.clearLog();
        noteLogger.logNote(firstNote);
        
        const firstId = noteLogger.entries[0].id;
        expect(firstId).toMatch(/^note_\d+$/);
        
        // Act: Clear log and add another note
        noteLogger.clearLog();
        noteLogger.logNote(secondNote);
        
        // Assert: ID should start from beginning again
        const secondId = noteLogger.entries[0].id;
        expect(secondId).toBe('note_1'); // Should reset to note_1
        expect(noteLogger.getEntryCount()).toBe(1);
        expect(noteLogger.entries[0].note).toBe(secondNote);
        
        // Clean up
        noteLogger.clearLog();
      }),
      { numRuns: 30 }
    );
  });

  /**
   * Property 7 (extended): AudioEngine error handling during replay
   * Verifies that replay continues even if individual notes fail to play
   */
  it('Property 7 (extended): Replay continues despite individual note playback failures', async () => {
    const noteSequenceArb = fc.array(
      fc.constantFrom('C4', 'D4', 'E4', 'F4', 'G4'), 
      { minLength: 3, maxLength: 5 } // Reduced max length
    );

    await fc.assert(
      fc.asyncProperty(noteSequenceArb, async (notes) => {
        // Arrange: Clear log and mocks at start of each iteration
        noteLogger.clearLog();
        vi.clearAllMocks();
        vi.restoreAllMocks();
        
        notes.forEach(note => {
          noteLogger.logNote(note, 0.8);
        });
        
        expect(noteLogger.getEntryCount()).toBe(notes.length);
        
        // Track all calls (both successful and failed)
        let callCount = 0;
        
        // Mock setTimeout to execute immediately
        const originalSetTimeout = global.setTimeout;
        global.setTimeout = (vi.fn().mockImplementation((callback: () => void, _delay: number) => {
          callback(); // Execute immediately
          return 1;
        }) as any);
        
        mockAudioEngine.playNote = vi.fn().mockImplementation((note: string) => {
          callCount++;
          // Fail on every second note to test error handling
          if (callCount % 2 === 0) {
            throw new Error(`Simulated playback failure for ${note}`);
          }
        });
        
        try {
          // Act: Replay should complete despite some failures
          await expect(noteLogger.replayLog()).resolves.toBeUndefined();
          
          // Assert: All notes should have been attempted (including failed ones)
          expect(mockAudioEngine.playNote).toHaveBeenCalledTimes(notes.length);
        } finally {
          // Restore setTimeout
          global.setTimeout = originalSetTimeout;
        }
        
        // Clean up for next iteration
        noteLogger.clearLog();
        vi.clearAllMocks();
        vi.restoreAllMocks();
      }),
      { numRuns: 20, timeout: 500 } // Reduced iterations and timeout
    );
  }, 3000); // 3 second timeout for the entire test

  /**
   * **Feature: piano-control-panel, Property 9: Note log capacity management**
   * **Validates: Requirements 2.5**
   * 
   * Property: For any note log at maximum capacity, adding new entries should remove 
   * the oldest entries to maintain the size limit.
   * 
   * This property verifies that:
   * 1. When the log reaches maximum capacity, adding new notes removes oldest entries
   * 2. The log never exceeds the configured maximum capacity
   * 3. Oldest entries are removed in chronological order (FIFO behavior)
   * 4. The most recent entries are always preserved when capacity is exceeded
   * 5. Capacity management works correctly with different maximum capacity values
   * 6. Entry removal maintains chronological ordering of remaining entries
   */
  it('Property 9: Note log capacity management - oldest entries removed when capacity exceeded', () => {
    // Generator for capacity values and note sequences that exceed capacity
    const capacityArb = fc.integer({ min: 2, max: 10 }); // Small capacities for easier testing
    const noteArb = fc.constantFrom('C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5');
    const velocityArb = fc.double({ min: 0.1, max: 1.0, noNaN: true });
    const noteWithVelocityArb = fc.tuple(noteArb, velocityArb);

    fc.assert(
      fc.property(capacityArb, (maxCapacity) => {
        // Create a new NoteLogger with the specified capacity
        const testLogger = new NoteLogger(mockAudioEngine, maxCapacity);
        
        // Generate more notes than the capacity to test overflow behavior
        const totalNotes = maxCapacity + fc.sample(fc.integer({ min: 1, max: 5 }), 1)[0];
        const noteSequence = fc.sample(noteWithVelocityArb, totalNotes);
        
        // Arrange: Clear the log and verify initial state
        testLogger.clearLog();
        expect(testLogger.getEntryCount()).toBe(0);
        expect(testLogger.maxEntries).toBe(maxCapacity);
        
        const loggedNotes: Array<{ note: string; velocity: number; timestamp: number; id: string }> = [];
        
        // Act: Log notes one by one, tracking each addition
        for (let i = 0; i < noteSequence.length; i++) {
          const [note, velocity] = noteSequence[i];
          const timestampBefore = Date.now();
          
          testLogger.logNote(note, velocity);
          
          Date.now();
          const currentEntries = testLogger.entries;
          
          // Track what we expect to be in the log
          loggedNotes.push({
            note,
            velocity,
            timestamp: currentEntries[currentEntries.length - 1]?.timestamp || timestampBefore,
            id: currentEntries[currentEntries.length - 1]?.id || `note_${i + 1}`
          });
          
          // Assert: Capacity constraints are maintained after each addition
          
          // 1. Log should never exceed maximum capacity
          expect(testLogger.getEntryCount()).toBeLessThanOrEqual(maxCapacity);
          
          // 2. If we haven't exceeded capacity yet, all notes should be present
          if (i < maxCapacity) {
            expect(testLogger.getEntryCount()).toBe(i + 1);
            
            // All logged notes should be present in order
            for (let j = 0; j <= i; j++) {
              expect(currentEntries[j].note).toBe(loggedNotes[j].note);
              expect(currentEntries[j].velocity).toBe(loggedNotes[j].velocity);
            }
          } else {
            // 3. Once capacity is exceeded, should maintain exactly maxCapacity entries
            expect(testLogger.getEntryCount()).toBe(maxCapacity);
            
            // 4. Should contain the most recent maxCapacity notes
            const expectedStartIndex = i - maxCapacity + 1;
            for (let j = 0; j < maxCapacity; j++) {
              const expectedNoteIndex = expectedStartIndex + j;
              expect(currentEntries[j].note).toBe(loggedNotes[expectedNoteIndex].note);
              expect(currentEntries[j].velocity).toBe(loggedNotes[expectedNoteIndex].velocity);
            }
          }
          
          // 5. Entries should always be in chronological order
          for (let j = 1; j < currentEntries.length; j++) {
            expect(currentEntries[j].timestamp).toBeGreaterThanOrEqual(currentEntries[j - 1].timestamp);
          }
          
          // Small delay to ensure different timestamps
          const start = Date.now();
          while (Date.now() - start < 1) {
            // Busy wait for 1ms
          }
        }
        
        // Final verification after all notes are logged
        const finalEntries = testLogger.entries;
        
        // 6. Final count should be exactly maxCapacity (since we added more than capacity)
        expect(testLogger.getEntryCount()).toBe(maxCapacity);
        expect(finalEntries).toHaveLength(maxCapacity);
        
        // 7. Final entries should be the last maxCapacity notes that were logged
        const expectedFinalStartIndex = noteSequence.length - maxCapacity;
        for (let i = 0; i < maxCapacity; i++) {
          const expectedNoteIndex = expectedFinalStartIndex + i;
          const [expectedNote, expectedVelocity] = noteSequence[expectedNoteIndex];
          
          expect(finalEntries[i].note).toBe(expectedNote);
          expect(finalEntries[i].velocity).toBe(expectedVelocity);
          expect(finalEntries[i].id).toBeDefined();
          expect(finalEntries[i].timestamp).toBeDefined();
        }
        
        // 8. Verify chronological ordering is maintained
        for (let i = 1; i < finalEntries.length; i++) {
          expect(finalEntries[i].timestamp).toBeGreaterThanOrEqual(finalEntries[i - 1].timestamp);
        }
        
        // 9. Verify that oldest entries were indeed removed
        // The first few notes should no longer be in the log
        const firstNote = noteSequence[0][0];
        const firstNoteStillPresent = finalEntries.some(entry => entry.note === firstNote);
        
        if (noteSequence.length > maxCapacity) {
          // If we logged more notes than capacity, the very first note should be gone
          // (unless it happens to be the same as one of the recent notes)
          const recentNotes = noteSequence.slice(-maxCapacity).map(([note]) => note);
          if (!recentNotes.includes(firstNote)) {
            expect(firstNoteStillPresent).toBe(false);
          }
        }
        
        // Clean up
        testLogger.dispose();
      }),
      { numRuns: 100 } // Run 100 iterations as specified in design doc
    );
  });

  /**
   * Property 9 (extended): Capacity management with dynamic capacity changes
   * Verifies that changing maxEntries during operation correctly trims existing entries
   */
  it('Property 9 (extended): Dynamic capacity changes correctly trim existing entries', () => {
    const initialCapacityArb = fc.integer({ min: 5, max: 15 });
    const newCapacityArb = fc.integer({ min: 2, max: 8 });
    const noteArb = fc.constantFrom('C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4');

    fc.assert(
      fc.property(initialCapacityArb, newCapacityArb, (initialCapacity, newCapacity) => {
        // Create logger with initial capacity
        const testLogger = new NoteLogger(mockAudioEngine, initialCapacity);
        testLogger.clearLog();
        
        // Fill the log to initial capacity
        const notes = fc.sample(noteArb, initialCapacity);
        notes.forEach(note => {
          testLogger.logNote(note, 0.8);
        });
        
        expect(testLogger.getEntryCount()).toBe(initialCapacity);
        const entriesBeforeChange = testLogger.entries;
        
        // Act: Change the capacity
        testLogger.maxEntries = newCapacity;
        
        // Assert: Entries should be trimmed appropriately
        expect(testLogger.maxEntries).toBe(newCapacity);
        
        if (newCapacity >= initialCapacity) {
          // If new capacity is larger or equal, all entries should remain
          expect(testLogger.getEntryCount()).toBe(initialCapacity);
          expect(testLogger.entries).toEqual(entriesBeforeChange);
        } else {
          // If new capacity is smaller, should keep only the most recent entries
          expect(testLogger.getEntryCount()).toBe(newCapacity);
          
          const expectedEntries = entriesBeforeChange.slice(-newCapacity);
          expect(testLogger.entries).toEqual(expectedEntries);
          
          // Verify chronological order is maintained
          const finalEntries = testLogger.entries;
          for (let i = 1; i < finalEntries.length; i++) {
            expect(finalEntries[i].timestamp).toBeGreaterThanOrEqual(finalEntries[i - 1].timestamp);
          }
        }
        
        // Clean up
        testLogger.dispose();
      }),
      { numRuns: 50 }
    );
  });

  /**
   * Property 9 (extended): Capacity management preserves entry integrity
   * Verifies that capacity management doesn't corrupt entry data
   */
  it('Property 9 (extended): Capacity management preserves entry data integrity', () => {
    const capacityArb = fc.integer({ min: 3, max: 8 });
    const noteArb = fc.constantFrom('C4', 'D4', 'E4', 'F4', 'G4');
    const velocityArb = fc.double({ min: 0.1, max: 1.0, noNaN: true });

    fc.assert(
      fc.property(capacityArb, (maxCapacity) => {
        const testLogger = new NoteLogger(mockAudioEngine, maxCapacity);
        testLogger.clearLog();
        
        // Generate notes to exceed capacity
        const totalNotes = maxCapacity + 3;
        const noteData = Array.from({ length: totalNotes }, (_, i) => ({
          note: fc.sample(noteArb, 1)[0],
          velocity: fc.sample(velocityArb, 1)[0],
          index: i
        }));
        
        // Log all notes
        noteData.forEach(({ note, velocity }) => {
          testLogger.logNote(note, velocity);
        });
        
        // Verify final state
        const finalEntries = testLogger.entries;
        expect(finalEntries).toHaveLength(maxCapacity);
        
        // Each remaining entry should have complete, valid data
        finalEntries.forEach((entry) => {
          expect(entry.id).toBeDefined();
          expect(typeof entry.id).toBe('string');
          expect(entry.id).toMatch(/^note_\d+$/);
          
          expect(entry.note).toBeDefined();
          expect(typeof entry.note).toBe('string');
          expect(entry.note.length).toBeGreaterThan(0);
          
          expect(entry.timestamp).toBeDefined();
          expect(typeof entry.timestamp).toBe('number');
          expect(entry.timestamp).toBeGreaterThan(0);
          
          if (entry.velocity !== undefined) {
            expect(typeof entry.velocity).toBe('number');
            expect(entry.velocity).toBeGreaterThanOrEqual(0);
            expect(entry.velocity).toBeLessThanOrEqual(1);
          }
        });
        
        // Verify the entries correspond to the last maxCapacity notes that were logged
        const expectedNotes = noteData.slice(-maxCapacity);
        finalEntries.forEach((entry, index) => {
          expect(entry.note).toBe(expectedNotes[index].note);
          expect(entry.velocity).toBe(expectedNotes[index].velocity);
        });
        
        // Clean up
        testLogger.dispose();
      }),
      { numRuns: 50 }
    );
  });
});