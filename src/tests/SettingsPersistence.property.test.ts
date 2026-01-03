import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SettingsManager, type UserSettings } from '../utils/SettingsManager';
import * as fc from 'fast-check';

/**
 * Property-Based Tests for Settings Persistence Round-Trip
 * Using fast-check to verify universal properties across all valid settings configurations
 */
describe('Settings Persistence - Property-Based Tests', () => {
  let originalLocalStorage: Storage;
  let mockLocalStorage: { [key: string]: string };

  beforeEach(() => {
    // Save original localStorage
    originalLocalStorage = global.localStorage;
    
    // Create mock localStorage
    mockLocalStorage = {};
    
    const mockStorage = {
      getItem: vi.fn((key: string) => mockLocalStorage[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        mockLocalStorage[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete mockLocalStorage[key];
      }),
      clear: vi.fn(() => {
        mockLocalStorage = {};
      }),
      length: 0,
      key: vi.fn()
    };

    // Replace global localStorage
    Object.defineProperty(global, 'localStorage', {
      value: mockStorage,
      writable: true
    });
  });

  afterEach(() => {
    // Restore original localStorage
    Object.defineProperty(global, 'localStorage', {
      value: originalLocalStorage,
      writable: true
    });
    
    // Clear all mocks
    vi.clearAllMocks();
  });

  /**
   * **Feature: piano-control-panel, Property 23: Settings persistence round-trip**
   * **Validates: Requirements 7.2, 7.3**
   * 
   * Property: For any settings change, the new values should be saved to localStorage 
   * and correctly restored on application reload.
   * 
   * This property verifies that:
   * 1. Any valid settings configuration can be saved to localStorage
   * 2. Saved settings can be loaded back exactly as they were saved
   * 3. The round-trip preserves all setting values and types
   * 4. Settings persistence works across different combinations of values
   * 5. The system handles all valid setting ranges correctly
   */
  it('Property 23: Settings persistence round-trip - any valid settings save and load correctly', () => {
    // Generators for all UserSettings properties
    const booleanArb = fc.boolean();
    const bpmArb = fc.integer({ min: 30, max: 300 }); // Valid BPM range
    const maxEntriesArb = fc.integer({ min: 10, max: 1000 }); // Reasonable log size range
    const audioFormatArb = fc.constantFrom('webm', 'mp4', 'wav');

    // Generator for complete UserSettings objects
    const userSettingsArb = fc.record({
      controlPanelOpen: booleanArb,
      keyMarkingEnabled: booleanArb,
      metronomeVisible: booleanArb,
      labelsVisible: booleanArb,
      recorderVisible: booleanArb,
      metronomeBPM: bpmArb,
      noteLogMaxEntries: maxEntriesArb,
      audioRecordingFormat: audioFormatArb
    }) as fc.Arbitrary<UserSettings>;

    // Property: For any valid settings, save then load should return identical settings
    fc.assert(
      fc.property(userSettingsArb, (originalSettings: UserSettings) => {
        // Arrange: Create a fresh SettingsManager instance
        const settingsManager = new SettingsManager();
        
        // Verify localStorage is available in our test environment
        expect(settingsManager.isLocalStorageAvailable()).toBe(true);
        
        // Act: Save the settings
        const saveError = settingsManager.saveSettings(originalSettings);
        
        // Assert: Save should succeed
        expect(saveError).toBeNull();
        
        // Verify settings were written to localStorage
        expect(global.localStorage.setItem).toHaveBeenCalledWith(
          'piano-control-panel-settings',
          expect.any(String)
        );
        
        // Act: Create a new SettingsManager instance to simulate app reload
        const newSettingsManager = new SettingsManager();
        const loadedSettings = newSettingsManager.loadSettings();
        
        // Assert: Loaded settings should match original settings exactly
        expect(loadedSettings).toEqual(originalSettings);
        
        // Verify all individual properties are preserved
        expect(loadedSettings.controlPanelOpen).toBe(originalSettings.controlPanelOpen);
        expect(loadedSettings.keyMarkingEnabled).toBe(originalSettings.keyMarkingEnabled);
        expect(loadedSettings.metronomeVisible).toBe(originalSettings.metronomeVisible);
        expect(loadedSettings.labelsVisible).toBe(originalSettings.labelsVisible);
        expect(loadedSettings.recorderVisible).toBe(originalSettings.recorderVisible);
        expect(loadedSettings.metronomeBPM).toBe(originalSettings.metronomeBPM);
        expect(loadedSettings.noteLogMaxEntries).toBe(originalSettings.noteLogMaxEntries);
        expect(loadedSettings.audioRecordingFormat).toBe(originalSettings.audioRecordingFormat);
        
        // Verify types are preserved
        expect(typeof loadedSettings.controlPanelOpen).toBe('boolean');
        expect(typeof loadedSettings.keyMarkingEnabled).toBe('boolean');
        expect(typeof loadedSettings.metronomeVisible).toBe('boolean');
        expect(typeof loadedSettings.labelsVisible).toBe('boolean');
        expect(typeof loadedSettings.recorderVisible).toBe('boolean');
        expect(typeof loadedSettings.metronomeBPM).toBe('number');
        expect(typeof loadedSettings.noteLogMaxEntries).toBe('number');
        expect(typeof loadedSettings.audioRecordingFormat).toBe('string');
        
        // Verify numeric values are finite
        expect(Number.isFinite(loadedSettings.metronomeBPM)).toBe(true);
        expect(Number.isFinite(loadedSettings.noteLogMaxEntries)).toBe(true);
        
        // Verify audio format is valid
        expect(['webm', 'mp4', 'wav']).toContain(loadedSettings.audioRecordingFormat);
        
        // Verify BPM is in valid range
        expect(loadedSettings.metronomeBPM).toBeGreaterThanOrEqual(30);
        expect(loadedSettings.metronomeBPM).toBeLessThanOrEqual(300);
        
        // Verify max entries is reasonable
        expect(loadedSettings.noteLogMaxEntries).toBeGreaterThan(0);
      }),
      { numRuns: 100 } // Test with 100 different settings combinations
    );
  });

  /**
   * Property test: Individual setting updates preserve other settings
   * Verifies that updating one setting doesn't affect other settings
   */
  it('Property 23 (Extended): Individual setting updates preserve other settings', () => {
    const userSettingsArb = fc.record({
      controlPanelOpen: fc.boolean(),
      keyMarkingEnabled: fc.boolean(),
      metronomeVisible: fc.boolean(),
      labelsVisible: fc.boolean(),
      recorderVisible: fc.boolean(),
      metronomeBPM: fc.integer({ min: 30, max: 300 }),
      noteLogMaxEntries: fc.integer({ min: 10, max: 1000 }),
      audioRecordingFormat: fc.constantFrom('webm', 'mp4', 'wav')
    }) as fc.Arbitrary<UserSettings>;

    const settingUpdateArb = fc.oneof(
      fc.record({ key: fc.constant('controlPanelOpen' as keyof UserSettings), value: fc.boolean() }),
      fc.record({ key: fc.constant('keyMarkingEnabled' as keyof UserSettings), value: fc.boolean() }),
      fc.record({ key: fc.constant('metronomeVisible' as keyof UserSettings), value: fc.boolean() }),
      fc.record({ key: fc.constant('labelsVisible' as keyof UserSettings), value: fc.boolean() }),
      fc.record({ key: fc.constant('recorderVisible' as keyof UserSettings), value: fc.boolean() }),
      fc.record({ key: fc.constant('metronomeBPM' as keyof UserSettings), value: fc.integer({ min: 30, max: 300 }) }),
      fc.record({ key: fc.constant('noteLogMaxEntries' as keyof UserSettings), value: fc.integer({ min: 10, max: 1000 }) }),
      fc.record({ key: fc.constant('audioRecordingFormat' as keyof UserSettings), value: fc.constantFrom('webm', 'mp4', 'wav') })
    );

    fc.assert(
      fc.property(
        userSettingsArb,
        settingUpdateArb,
        (initialSettings: UserSettings, update: { key: keyof UserSettings; value: any }) => {
          // Arrange: Create settings manager and save initial settings
          const settingsManager = new SettingsManager();
          const saveError = settingsManager.saveSettings(initialSettings);
          expect(saveError).toBeNull();
          
          // Act: Update one specific setting
          const updateError = settingsManager.updateSetting(update.key, update.value);
          expect(updateError).toBeNull();
          
          // Create new instance to simulate reload
          const newSettingsManager = new SettingsManager();
          const loadedSettings = newSettingsManager.loadSettings();
          
          // Assert: Updated setting should have new value
          expect(loadedSettings[update.key]).toEqual(update.value);
          
          // All other settings should remain unchanged
          const otherKeys = Object.keys(initialSettings).filter(k => k !== update.key) as (keyof UserSettings)[];
          for (const key of otherKeys) {
            expect(loadedSettings[key]).toEqual(initialSettings[key]);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property test: Settings persistence with partial data
   * Verifies that partial settings are merged with defaults correctly
   */
  it('Property 23 (Partial): Settings persistence with partial data - missing properties use defaults', () => {
    const partialSettingsArb = fc.record({
      controlPanelOpen: fc.option(fc.boolean(), { nil: undefined }),
      keyMarkingEnabled: fc.option(fc.boolean(), { nil: undefined }),
      metronomeVisible: fc.option(fc.boolean(), { nil: undefined }),
      labelsVisible: fc.option(fc.boolean(), { nil: undefined }),
      recorderVisible: fc.option(fc.boolean(), { nil: undefined }),
      metronomeBPM: fc.option(fc.integer({ min: 30, max: 300 }), { nil: undefined }),
      noteLogMaxEntries: fc.option(fc.integer({ min: 10, max: 1000 }), { nil: undefined }),
      audioRecordingFormat: fc.option(fc.constantFrom('webm', 'mp4', 'wav'), { nil: undefined })
    });

    fc.assert(
      fc.property(partialSettingsArb, (partialSettings) => {
        // Arrange: Create settings manager and get defaults
        const settingsManager = new SettingsManager();
        const defaults = settingsManager.getDefaults();
        
        // Filter out undefined values to create actual partial settings
        const actualPartialSettings: Partial<UserSettings> = {};
        for (const [key, value] of Object.entries(partialSettings)) {
          if (value !== undefined) {
            (actualPartialSettings as any)[key] = value;
          }
        }
        
        // Manually save partial settings to localStorage (simulating old version data)
        const partialJson = JSON.stringify(actualPartialSettings);
        global.localStorage.setItem('piano-control-panel-settings', partialJson);
        
        // Act: Create new settings manager (should merge with defaults)
        const newSettingsManager = new SettingsManager();
        const loadedSettings = newSettingsManager.loadSettings();
        
        // Assert: All settings should be present (merged with defaults)
        expect(loadedSettings).toHaveProperty('controlPanelOpen');
        expect(loadedSettings).toHaveProperty('keyMarkingEnabled');
        expect(loadedSettings).toHaveProperty('metronomeVisible');
        expect(loadedSettings).toHaveProperty('labelsVisible');
        expect(loadedSettings).toHaveProperty('recorderVisible');
        expect(loadedSettings).toHaveProperty('metronomeBPM');
        expect(loadedSettings).toHaveProperty('noteLogMaxEntries');
        expect(loadedSettings).toHaveProperty('audioRecordingFormat');
        
        // Verify that provided values are used, missing values use defaults
        for (const key of Object.keys(defaults) as (keyof UserSettings)[]) {
          if (key in actualPartialSettings) {
            expect(loadedSettings[key]).toEqual((actualPartialSettings as any)[key]);
          } else {
            expect(loadedSettings[key]).toEqual(defaults[key]);
          }
        }
        
        // Verify all types are correct
        expect(typeof loadedSettings.controlPanelOpen).toBe('boolean');
        expect(typeof loadedSettings.keyMarkingEnabled).toBe('boolean');
        expect(typeof loadedSettings.metronomeVisible).toBe('boolean');
        expect(typeof loadedSettings.labelsVisible).toBe('boolean');
        expect(typeof loadedSettings.recorderVisible).toBe('boolean');
        expect(typeof loadedSettings.metronomeBPM).toBe('number');
        expect(typeof loadedSettings.noteLogMaxEntries).toBe('number');
        expect(typeof loadedSettings.audioRecordingFormat).toBe('string');
      }),
      { numRuns: 50 }
    );
  });

  /**
   * Property test: Settings persistence survives JSON serialization edge cases
   * Verifies that settings work correctly with various JSON serialization scenarios
   */
  it('Property 23 (Serialization): Settings persistence survives JSON serialization correctly', () => {
    const userSettingsArb = fc.record({
      controlPanelOpen: fc.boolean(),
      keyMarkingEnabled: fc.boolean(),
      metronomeVisible: fc.boolean(),
      labelsVisible: fc.boolean(),
      recorderVisible: fc.boolean(),
      metronomeBPM: fc.integer({ min: 30, max: 300 }),
      noteLogMaxEntries: fc.integer({ min: 10, max: 1000 }),
      audioRecordingFormat: fc.constantFrom('webm', 'mp4', 'wav')
    }) as fc.Arbitrary<UserSettings>;

    fc.assert(
      fc.property(userSettingsArb, (originalSettings: UserSettings) => {
        // Arrange: Create settings manager
        const settingsManager = new SettingsManager();
        
        // Act: Save settings (involves JSON serialization)
        const saveError = settingsManager.saveSettings(originalSettings);
        expect(saveError).toBeNull();
        
        // Verify the JSON was properly serialized and stored
        const storedJson = global.localStorage.getItem('piano-control-panel-settings');
        expect(storedJson).not.toBeNull();
        expect(storedJson).toBeTruthy();
        
        // Verify the stored JSON can be parsed
        let parsedSettings: any;
        expect(() => {
          parsedSettings = JSON.parse(storedJson!);
        }).not.toThrow();
        
        // Verify the parsed settings match the original
        expect(parsedSettings).toEqual(originalSettings);
        
        // Act: Load settings (involves JSON deserialization)
        const newSettingsManager = new SettingsManager();
        const loadedSettings = newSettingsManager.loadSettings();
        
        // Assert: Loaded settings should match original exactly
        expect(loadedSettings).toEqual(originalSettings);
        
        // Verify that the serialization preserved exact values
        expect(JSON.stringify(loadedSettings)).toBe(JSON.stringify(originalSettings));
        
        // Verify no data corruption occurred during serialization round-trip
        const reSerializedJson = JSON.stringify(loadedSettings);
        const reParsedSettings = JSON.parse(reSerializedJson);
        expect(reParsedSettings).toEqual(originalSettings);
      }),
      { numRuns: 75 }
    );
  });

  /**
   * **Feature: piano-control-panel, Property 25: Settings corruption recovery**
   * **Validates: Requirements 7.5**
   * 
   * Property: For any corrupted settings data, the application should reset to defaults 
   * and continue functioning normally.
   * 
   * This property verifies that:
   * 1. When settings data is corrupted, the system detects the corruption
   * 2. Corrupted data is automatically replaced with default settings
   * 3. No errors are thrown when loading corrupted settings
   * 4. The application continues to function normally after corruption recovery
   * 5. Settings validation correctly identifies various forms of data corruption
   */
  it('Property 25: Settings corruption recovery - corrupted data resets to defaults', () => {
    // Generator for various types of corrupted settings data
    const corruptedDataArb = fc.oneof(
      // Invalid JSON strings
      fc.constantFrom(
        '{"invalid": json}',           // Invalid JSON syntax
        '{"controlPanelOpen": true,}', // Trailing comma
        '{controlPanelOpen: true}',    // Missing quotes on keys
        '{"controlPanelOpen": undefined}', // Undefined values
        '{"controlPanelOpen": NaN}',   // NaN values
        '{"controlPanelOpen": Infinity}', // Infinity values
        '[1, 2, 3]',                  // Array instead of object
        '"just a string"',            // String instead of object
        '123',                        // Number instead of object
        'null',                       // Null value
        'true',                       // Boolean instead of object
        '',                           // Empty string
        '   ',                        // Whitespace only
        '{}',                         // Empty object (should be valid but missing all properties)
      ),
      
      // Valid JSON but invalid settings structure
      fc.record({
        // Wrong types for boolean fields
        controlPanelOpen: fc.oneof(fc.string(), fc.integer(), fc.constant(null)),
        keyMarkingEnabled: fc.oneof(fc.string(), fc.integer(), fc.constant(null)),
        metronomeVisible: fc.oneof(fc.string(), fc.integer(), fc.constant(null)),
        labelsVisible: fc.oneof(fc.string(), fc.integer(), fc.constant(null)),
        recorderVisible: fc.oneof(fc.string(), fc.integer(), fc.constant(null)),
        
        // Wrong types for number fields
        metronomeBPM: fc.oneof(fc.string(), fc.boolean(), fc.constant(null), fc.constant(NaN), fc.constant(Infinity)),
        noteLogMaxEntries: fc.oneof(fc.string(), fc.boolean(), fc.constant(null), fc.constant(NaN), fc.constant(Infinity)),
        
        // Invalid audio format
        audioRecordingFormat: fc.oneof(fc.string().filter(s => !['webm', 'mp4', 'wav'].includes(s)), fc.integer(), fc.boolean(), fc.constant(null))
      }).map(obj => JSON.stringify(obj)),
      
      // Partially corrupted settings (some valid, some invalid)
      fc.record({
        controlPanelOpen: fc.boolean(), // Valid
        keyMarkingEnabled: fc.string(), // Invalid type
        metronomeVisible: fc.boolean(), // Valid
        labelsVisible: fc.integer(),    // Invalid type
        recorderVisible: fc.boolean(),  // Valid
        metronomeBPM: fc.string(),      // Invalid type
        noteLogMaxEntries: fc.integer({ min: 10, max: 1000 }), // Valid
        audioRecordingFormat: fc.string().filter(s => !['webm', 'mp4', 'wav'].includes(s)) // Invalid value
      }).map(obj => JSON.stringify(obj)),
      
      // Settings with extra/unknown properties
      fc.record({
        controlPanelOpen: fc.boolean(),
        keyMarkingEnabled: fc.boolean(),
        metronomeVisible: fc.boolean(),
        labelsVisible: fc.boolean(),
        recorderVisible: fc.boolean(),
        metronomeBPM: fc.integer({ min: 30, max: 300 }),
        noteLogMaxEntries: fc.integer({ min: 10, max: 1000 }),
        audioRecordingFormat: fc.constantFrom('webm', 'mp4', 'wav'),
        // Extra properties that shouldn't be there
        extraProperty1: fc.string(),
        extraProperty2: fc.integer(),
        maliciousScript: fc.constant('<script>alert("xss")</script>'),
        __proto__: fc.record({ malicious: fc.string() })
      }).map(obj => JSON.stringify(obj)),
      
      // Deeply nested or circular structures (as JSON strings)
      fc.constantFrom(
        '{"controlPanelOpen": {"nested": {"too": {"deep": true}}}}',
        '{"controlPanelOpen": [1, 2, {"array": "in object"}]}',
        '{"metronomeBPM": {"toString": "function"}}',
        '{"audioRecordingFormat": {"constructor": "Object"}}'
      )
    );

    fc.assert(
      fc.property(corruptedDataArb, (corruptedJson: string) => {
        // Arrange: Set up localStorage with corrupted data
        const mockLocalStorage: { [key: string]: string } = {};
        
        const mockStorage = {
          getItem: vi.fn((key: string) => mockLocalStorage[key] || null),
          setItem: vi.fn((key: string, value: string) => {
            mockLocalStorage[key] = value;
          }),
          removeItem: vi.fn((key: string) => {
            delete mockLocalStorage[key];
          }),
          clear: vi.fn(() => {
            Object.keys(mockLocalStorage).forEach(key => delete mockLocalStorage[key]);
          }),
          length: 0,
          key: vi.fn()
        };

        Object.defineProperty(global, 'localStorage', {
          value: mockStorage,
          writable: true
        });

        // Inject corrupted data into localStorage
        mockLocalStorage['piano-control-panel-settings'] = corruptedJson;

        // Act: Create SettingsManager - should handle corruption gracefully
        let settingsManager: SettingsManager;
        expect(() => {
          settingsManager = new SettingsManager();
        }).not.toThrow();

        // Assert: Should detect localStorage as available
        expect(settingsManager!.isLocalStorageAvailable()).toBe(true);

        // Act: Load settings - should handle corruption gracefully
        let loadedSettings: UserSettings;
        expect(() => {
          loadedSettings = settingsManager!.loadSettings();
        }).not.toThrow();

        // Assert: Should return default settings when data is corrupted
        const expectedDefaults = settingsManager!.getDefaults();
        expect(loadedSettings!).toEqual(expectedDefaults);

        // Verify all properties are present and have correct types
        expect(loadedSettings!).toHaveProperty('controlPanelOpen');
        expect(loadedSettings!).toHaveProperty('keyMarkingEnabled');
        expect(loadedSettings!).toHaveProperty('metronomeVisible');
        expect(loadedSettings!).toHaveProperty('labelsVisible');
        expect(loadedSettings!).toHaveProperty('recorderVisible');
        expect(loadedSettings!).toHaveProperty('metronomeBPM');
        expect(loadedSettings!).toHaveProperty('noteLogMaxEntries');
        expect(loadedSettings!).toHaveProperty('audioRecordingFormat');

        // Verify all types are correct (not corrupted)
        expect(typeof loadedSettings!.controlPanelOpen).toBe('boolean');
        expect(typeof loadedSettings!.keyMarkingEnabled).toBe('boolean');
        expect(typeof loadedSettings!.metronomeVisible).toBe('boolean');
        expect(typeof loadedSettings!.labelsVisible).toBe('boolean');
        expect(typeof loadedSettings!.recorderVisible).toBe('boolean');
        expect(typeof loadedSettings!.metronomeBPM).toBe('number');
        expect(typeof loadedSettings!.noteLogMaxEntries).toBe('number');
        expect(typeof loadedSettings!.audioRecordingFormat).toBe('string');

        // Verify numeric values are finite and in valid ranges
        expect(Number.isFinite(loadedSettings!.metronomeBPM)).toBe(true);
        expect(Number.isFinite(loadedSettings!.noteLogMaxEntries)).toBe(true);
        expect(loadedSettings!.metronomeBPM).toBeGreaterThanOrEqual(30);
        expect(loadedSettings!.metronomeBPM).toBeLessThanOrEqual(300);
        expect(loadedSettings!.noteLogMaxEntries).toBeGreaterThan(0);

        // Verify audio format is valid
        expect(['webm', 'mp4', 'wav']).toContain(loadedSettings!.audioRecordingFormat);

        // Act: Get current settings - should work normally after corruption recovery
        let currentSettings: UserSettings;
        expect(() => {
          currentSettings = settingsManager!.getCurrentSettings();
        }).not.toThrow();

        // Assert: Current settings should match loaded defaults
        expect(currentSettings!).toEqual(expectedDefaults);

        // Act: Try to save new valid settings - should work after corruption recovery
        const validTestSettings: UserSettings = {
          controlPanelOpen: true,
          keyMarkingEnabled: true,
          metronomeVisible: true,
          labelsVisible: false,
          recorderVisible: true,
          metronomeBPM: 120,
          noteLogMaxEntries: 200,
          audioRecordingFormat: 'mp4'
        };

        let saveError: any;
        expect(() => {
          saveError = settingsManager!.saveSettings(validTestSettings);
        }).not.toThrow();

        // Assert: Save should succeed after corruption recovery
        expect(saveError).toBeNull();

        // Act: Create new SettingsManager instance to verify persistence works
        const newSettingsManager = new SettingsManager();
        const reloadedSettings = newSettingsManager.loadSettings();

        // Assert: Should load the newly saved valid settings (corruption is fixed)
        expect(reloadedSettings).toEqual(validTestSettings);

        // The main requirement is that corrupted data results in default settings being returned
        // We don't need to verify the internal implementation details of how corruption is handled

        // Act: Test that individual setting updates work after corruption recovery
        let updateError: any;
        expect(() => {
          updateError = settingsManager!.updateSetting('metronomeBPM', 150);
        }).not.toThrow();

        // Assert: Update should succeed
        expect(updateError).toBeNull();

        // Verify the update took effect
        const updatedSettings = settingsManager!.getCurrentSettings();
        expect(updatedSettings.metronomeBPM).toBe(150);

        // Act: Test reset functionality after corruption recovery
        let resetError: any;
        expect(() => {
          resetError = settingsManager!.resetToDefaults();
        }).not.toThrow();

        // Assert: Reset should succeed
        expect(resetError).toBeNull();

        // Verify reset worked
        const resetSettings = settingsManager!.getCurrentSettings();
        expect(resetSettings).toEqual(expectedDefaults);

        // Assert: System should be fully functional after corruption recovery
        expect(settingsManager!.isLocalStorageAvailable()).toBe(true);
        
        // Verify no lingering corruption effects
        const finalSettings = settingsManager!.loadSettings();
        expect(finalSettings).toEqual(expectedDefaults);
        expect(typeof finalSettings).toBe('object');
        expect(finalSettings).not.toBeNull();
        expect(finalSettings).not.toBeUndefined();
      }),
      { numRuns: 100 } // Test with 100 different corruption scenarios
    );
  });

  /**
   * **Feature: piano-control-panel, Property 24: Graceful localStorage fallback**
   * **Validates: Requirements 7.4**
   * 
   * Property: For any system where localStorage is unavailable, the application should 
   * function normally with default settings without errors.
   * 
   * This property verifies that:
   * 1. When localStorage is unavailable, the system falls back to defaults gracefully
   * 2. No errors are thrown when localStorage operations fail
   * 3. All settings operations return appropriate error indicators
   * 4. The application continues to function with in-memory settings
   * 5. Settings can still be read and updated in memory even without persistence
   */
  it('Property 24: Graceful localStorage fallback - system works without localStorage', () => {
    // Generator for various localStorage failure scenarios
    const localStorageFailureArb = fc.constantFrom(
      'unavailable',      // localStorage is completely unavailable
      'getItem_throws',   // getItem throws an error
      'setItem_throws',   // setItem throws an error
      'removeItem_throws', // removeItem throws an error
      'quota_exceeded'    // Storage quota exceeded error
    );

    // Generator for settings to test with
    const userSettingsArb = fc.record({
      controlPanelOpen: fc.boolean(),
      keyMarkingEnabled: fc.boolean(),
      metronomeVisible: fc.boolean(),
      labelsVisible: fc.boolean(),
      recorderVisible: fc.boolean(),
      metronomeBPM: fc.integer({ min: 30, max: 300 }),
      noteLogMaxEntries: fc.integer({ min: 10, max: 1000 }),
      audioRecordingFormat: fc.constantFrom('webm', 'mp4', 'wav')
    }) as fc.Arbitrary<UserSettings>;

    fc.assert(
      fc.property(
        localStorageFailureArb,
        userSettingsArb,
        (failureType: string, testSettings: UserSettings) => {
          // Arrange: Mock localStorage to simulate various failure scenarios
          const mockFailingStorage = {
            getItem: vi.fn(),
            setItem: vi.fn(),
            removeItem: vi.fn(),
            clear: vi.fn(),
            length: 0,
            key: vi.fn()
          };

          // Configure the specific failure scenario
          switch (failureType) {
            case 'unavailable':
              // Simulate localStorage being completely unavailable (like in some browsers/modes)
              Object.defineProperty(global, 'localStorage', {
                value: undefined,
                writable: true
              });
              break;

            case 'getItem_throws':
              mockFailingStorage.getItem.mockImplementation(() => {
                throw new Error('localStorage.getItem failed');
              });
              Object.defineProperty(global, 'localStorage', {
                value: mockFailingStorage,
                writable: true
              });
              break;

            case 'setItem_throws':
              mockFailingStorage.getItem.mockReturnValue(null);
              mockFailingStorage.setItem.mockImplementation(() => {
                throw new Error('localStorage.setItem failed');
              });
              Object.defineProperty(global, 'localStorage', {
                value: mockFailingStorage,
                writable: true
              });
              break;

            case 'removeItem_throws':
              mockFailingStorage.getItem.mockReturnValue(null);
              mockFailingStorage.setItem.mockImplementation(() => {
                // Allow setItem to work for this test
              });
              mockFailingStorage.removeItem.mockImplementation(() => {
                throw new Error('localStorage.removeItem failed');
              });
              Object.defineProperty(global, 'localStorage', {
                value: mockFailingStorage,
                writable: true
              });
              break;

            case 'quota_exceeded':
              mockFailingStorage.getItem.mockReturnValue(null);
              mockFailingStorage.setItem.mockImplementation(() => {
                const error = new Error('QuotaExceededError');
                error.name = 'QuotaExceededError';
                throw error;
              });
              Object.defineProperty(global, 'localStorage', {
                value: mockFailingStorage,
                writable: true
              });
              break;
          }

          // Act & Assert: Create SettingsManager - should not throw errors
          let settingsManager: SettingsManager;
          expect(() => {
            settingsManager = new SettingsManager();
          }).not.toThrow();

          // Assert: Should detect localStorage unavailability correctly
          if (failureType === 'unavailable' || failureType === 'quota_exceeded') {
            expect(settingsManager!.isLocalStorageAvailable()).toBe(false);
          }

          // Act: Load settings - should return defaults without throwing
          let loadedSettings: UserSettings;
          expect(() => {
            loadedSettings = settingsManager!.loadSettings();
          }).not.toThrow();

          // Assert: Should return default settings when localStorage fails
          const expectedDefaults = settingsManager!.getDefaults();
          expect(loadedSettings!).toEqual(expectedDefaults);

          // Act: Try to save settings - should handle errors gracefully
          let saveError: any;
          expect(() => {
            saveError = settingsManager!.saveSettings(testSettings);
          }).not.toThrow();

          // Assert: Save should return appropriate error when localStorage unavailable
          if (failureType === 'unavailable' || failureType === 'setItem_throws' || failureType === 'quota_exceeded') {
            expect(saveError).not.toBeNull();
            expect(saveError).toHaveProperty('type');
            expect(saveError).toHaveProperty('message');
            expect(typeof saveError.message).toBe('string');
            expect(saveError.message.length).toBeGreaterThan(0);
            
            // When checkStorageAvailability() fails (including quota exceeded), 
            // the SettingsManager marks storage as unavailable
            if (failureType === 'quota_exceeded') {
              expect(saveError.type).toBe('STORAGE_UNAVAILABLE');
            }
          }

          // Act: Get current settings - should work in memory
          let currentSettings: UserSettings;
          expect(() => {
            currentSettings = settingsManager!.getCurrentSettings();
          }).not.toThrow();

          // Assert: Current settings should reflect what was attempted to be saved
          if (failureType !== 'unavailable' && failureType !== 'setItem_throws') {
            // If save succeeded or failed gracefully, current settings should be updated
            expect(currentSettings!).toEqual(testSettings);
          } else {
            // If save failed, current settings should still be defaults or the attempted settings
            expect(currentSettings!).toBeDefined();
            expect(typeof currentSettings!).toBe('object');
          }

          // Act: Try to update individual setting - should handle errors gracefully
          let updateError: any;
          expect(() => {
            updateError = settingsManager!.updateSetting('metronomeBPM', 120);
          }).not.toThrow();

          // Assert: Update should handle localStorage errors appropriately
          if (failureType === 'unavailable' || failureType === 'setItem_throws' || failureType === 'quota_exceeded') {
            expect(updateError).not.toBeNull();
          }

          // Act: Try to reset to defaults - should handle errors gracefully
          let resetError: any;
          expect(() => {
            resetError = settingsManager!.resetToDefaults();
          }).not.toThrow();

          // Assert: Reset should handle localStorage errors appropriately
          if (failureType === 'unavailable' || failureType === 'removeItem_throws') {
            expect(resetError).not.toBeNull();
            expect(resetError).toHaveProperty('type');
            expect(resetError).toHaveProperty('message');
          }

          // Act: Get current settings after reset attempt
          let settingsAfterReset: UserSettings;
          expect(() => {
            settingsAfterReset = settingsManager!.getCurrentSettings();
          }).not.toThrow();

          // Assert: Settings should be defaults after reset (in memory)
          expect(settingsAfterReset!).toEqual(expectedDefaults);

          // Assert: All operations should maintain object integrity
          expect(typeof settingsAfterReset!).toBe('object');
          expect(settingsAfterReset!).toHaveProperty('controlPanelOpen');
          expect(settingsAfterReset!).toHaveProperty('keyMarkingEnabled');
          expect(settingsAfterReset!).toHaveProperty('metronomeVisible');
          expect(settingsAfterReset!).toHaveProperty('labelsVisible');
          expect(settingsAfterReset!).toHaveProperty('recorderVisible');
          expect(settingsAfterReset!).toHaveProperty('metronomeBPM');
          expect(settingsAfterReset!).toHaveProperty('noteLogMaxEntries');
          expect(settingsAfterReset!).toHaveProperty('audioRecordingFormat');

          // Assert: All values should be valid types
          expect(typeof settingsAfterReset!.controlPanelOpen).toBe('boolean');
          expect(typeof settingsAfterReset!.keyMarkingEnabled).toBe('boolean');
          expect(typeof settingsAfterReset!.metronomeVisible).toBe('boolean');
          expect(typeof settingsAfterReset!.labelsVisible).toBe('boolean');
          expect(typeof settingsAfterReset!.recorderVisible).toBe('boolean');
          expect(typeof settingsAfterReset!.metronomeBPM).toBe('number');
          expect(typeof settingsAfterReset!.noteLogMaxEntries).toBe('number');
          expect(typeof settingsAfterReset!.audioRecordingFormat).toBe('string');

          // Assert: Numeric values should be finite and in valid ranges
          expect(Number.isFinite(settingsAfterReset!.metronomeBPM)).toBe(true);
          expect(Number.isFinite(settingsAfterReset!.noteLogMaxEntries)).toBe(true);
          expect(settingsAfterReset!.metronomeBPM).toBeGreaterThanOrEqual(30);
          expect(settingsAfterReset!.metronomeBPM).toBeLessThanOrEqual(300);
          expect(settingsAfterReset!.noteLogMaxEntries).toBeGreaterThan(0);

          // Assert: Audio format should be valid
          expect(['webm', 'mp4', 'wav']).toContain(settingsAfterReset!.audioRecordingFormat);
        }
      ),
      { numRuns: 100 } // Test with 100 different failure scenarios and settings combinations
    );
  });
});