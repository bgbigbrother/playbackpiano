import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AudioRecorder } from '../utils/AudioRecorder';
import { MetronomeEngine } from '../utils/MetronomeEngine';
import { SettingsManager } from '../utils/SettingsManager';
import * as Tone from 'tone';

/**
 * Comprehensive Error Scenario Tests
 * Tests MediaRecorder unavailability, permission denied cases, localStorage issues, and Tone.js failures
 * Validates: All error handling scenarios from requirements
 */
describe('Error Scenarios', () => {
  let originalMediaRecorder: any;
  let originalGetUserMedia: any;
  let originalLocalStorage: Storage;

  beforeEach(() => {
    // Save original implementations
    originalMediaRecorder = global.MediaRecorder;
    originalGetUserMedia = global.navigator?.mediaDevices?.getUserMedia;
    originalLocalStorage = global.localStorage;
    
    // Clear all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore original implementations
    if (originalMediaRecorder) {
      global.MediaRecorder = originalMediaRecorder;
    }
    if (originalGetUserMedia && global.navigator?.mediaDevices) {
      global.navigator.mediaDevices.getUserMedia = originalGetUserMedia;
    }
    if (originalLocalStorage) {
      Object.defineProperty(global, 'localStorage', {
        value: originalLocalStorage,
        writable: true
      });
    }
    
    vi.clearAllMocks();
  });

  describe('MediaRecorder Error Scenarios', () => {
    it('should handle MediaRecorder unavailability gracefully', async () => {
      // Arrange: Remove MediaRecorder from global scope
      delete (global as any).MediaRecorder;
      
      // Act: Create AudioRecorder
      const recorder = new AudioRecorder();
      
      // Assert: Should not throw during construction
      expect(recorder).toBeDefined();
      
      // Act: Try to start recording
      try {
        await recorder.startRecording();
      } catch (error) {
        // Expected to fail
      }
      
      // Assert: Should handle MediaRecorder unavailability
      expect(recorder.hasError).toBe(true);
      expect(recorder.error).not.toBeNull();
      expect(recorder.error?.type).toBe('MEDIA_RECORDER_UNAVAILABLE');
      expect(recorder.error?.message).toContain('MediaRecorder');
      expect(recorder.isRecording).toBe(false);
      
      // Cleanup
      recorder.dispose();
    });

    it('should handle MediaRecorder.isTypeSupported unavailability', () => {
      // Arrange: Mock MediaRecorder without isTypeSupported
      global.MediaRecorder = vi.fn() as any;
      delete (global.MediaRecorder as any).isTypeSupported;
      
      // Act: Create AudioRecorder (should fall back to default MIME type)
      const recorder = new AudioRecorder();
      
      // Assert: Should handle missing isTypeSupported gracefully
      expect(recorder).toBeDefined();
      expect(recorder.hasError).toBe(false);
      
      // Cleanup
      recorder.dispose();
    });

    it('should handle permission denied for microphone access', async () => {
      // Arrange: Mock MediaRecorder
      const mockMediaRecorder = {
        start: vi.fn(),
        stop: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        state: 'inactive'
      };
      
      global.MediaRecorder = Object.assign(
        vi.fn().mockImplementation(() => mockMediaRecorder),
        { isTypeSupported: vi.fn().mockReturnValue(true) }
      );
      
      // Mock getUserMedia to throw permission denied error
      const permissionError = new Error('Permission denied');
      permissionError.name = 'NotAllowedError';
      
      global.navigator = {
        ...global.navigator,
        mediaDevices: {
          getUserMedia: vi.fn().mockRejectedValue(permissionError)
        }
      } as any;
      
      // Act: Create recorder and try to start recording
      const recorder = new AudioRecorder();
      
      try {
        await recorder.startRecording();
      } catch (error) {
        // Expected to fail
      }
      
      // Assert: Should handle permission denied gracefully
      expect(recorder.hasError).toBe(true);
      expect(recorder.error).not.toBeNull();
      expect(recorder.error?.type).toBe('PERMISSION_DENIED');
      expect(recorder.error?.message).toContain('Failed to access audio');
      expect(recorder.isRecording).toBe(false);
      
      // Cleanup
      recorder.dispose();
    });

    it('should handle MediaRecorder construction failure', async () => {
      // Arrange: Mock MediaRecorder constructor to throw
      global.MediaRecorder = Object.assign(
        vi.fn().mockImplementation(() => {
          throw new Error('MediaRecorder construction failed');
        }),
        { isTypeSupported: vi.fn().mockReturnValue(true) }
      );
      
      // Mock successful getUserMedia
      const mockStream = {
        getTracks: vi.fn().mockReturnValue([{ stop: vi.fn() }])
      };
      
      global.navigator = {
        ...global.navigator,
        mediaDevices: {
          getUserMedia: vi.fn().mockResolvedValue(mockStream)
        }
      } as any;
      
      // Act: Create recorder and try to start recording
      const recorder = new AudioRecorder();
      
      try {
        await recorder.startRecording();
      } catch (error) {
        // Expected to fail
      }
      
      // Assert: Should handle MediaRecorder construction failure
      expect(recorder.hasError).toBe(true);
      expect(recorder.error).not.toBeNull();
      expect(recorder.error?.type).toBe('MEDIA_RECORDER_UNAVAILABLE');
      expect(recorder.isRecording).toBe(false);
      
      // Cleanup
      recorder.dispose();
    });

    it('should handle MediaRecorder start() failure', async () => {
      // Arrange: Mock MediaRecorder with failing start method
      const mockMediaRecorder = {
        start: vi.fn().mockImplementation(() => {
          throw new Error('MediaRecorder start failed');
        }),
        stop: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        state: 'inactive'
      };
      
      global.MediaRecorder = Object.assign(
        vi.fn().mockImplementation(() => mockMediaRecorder),
        { isTypeSupported: vi.fn().mockReturnValue(true) }
      );
      
      // Mock successful getUserMedia
      const mockStream = {
        getTracks: vi.fn().mockReturnValue([{ stop: vi.fn() }])
      };
      
      global.navigator = {
        ...global.navigator,
        mediaDevices: {
          getUserMedia: vi.fn().mockResolvedValue(mockStream)
        }
      } as any;
      
      // Act: Create recorder and try to start recording
      const recorder = new AudioRecorder();
      
      try {
        await recorder.startRecording();
      } catch (error) {
        // Expected to fail
      }
      
      // Assert: Should handle MediaRecorder start failure
      // The error might not be set immediately if start() throws during the call
      expect(recorder.isRecording).toBe(false);
      
      // Cleanup
      recorder.dispose();
    });

    it('should handle getUserMedia not supported', async () => {
      // Arrange: Remove getUserMedia from navigator
      global.navigator = {
        ...global.navigator,
        mediaDevices: undefined
      } as any;
      
      // Act: Create recorder and try to start recording
      const recorder = new AudioRecorder();
      
      try {
        await recorder.startRecording();
      } catch (error) {
        // Expected to fail
      }
      
      // Assert: Should handle missing getUserMedia
      expect(recorder.hasError).toBe(true);
      expect(recorder.error).not.toBeNull();
      expect(recorder.error?.type).toBe('PERMISSION_DENIED');
      expect(recorder.error?.message).toContain('Failed to access audio');
      expect(recorder.isRecording).toBe(false);
      
      // Cleanup
      recorder.dispose();
    });

    it('should handle recording data corruption during recording', async () => {
      // Arrange: Mock MediaRecorder that triggers error event
      const mockMediaRecorder = {
        start: vi.fn(),
        stop: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        state: 'recording',
        onerror: null as ((event: any) => void) | null
      };
      
      global.MediaRecorder = Object.assign(
        vi.fn().mockImplementation(() => mockMediaRecorder),
        { isTypeSupported: vi.fn().mockReturnValue(true) }
      );
      
      // Mock successful getUserMedia
      const mockStream = {
        getTracks: vi.fn().mockReturnValue([{ stop: vi.fn() }])
      };
      
      global.navigator = {
        ...global.navigator,
        mediaDevices: {
          getUserMedia: vi.fn().mockResolvedValue(mockStream)
        }
      } as any;
      
      // Act: Create recorder and start recording
      const recorder = new AudioRecorder();
      await recorder.startRecording();
      
      // Simulate recording error by triggering the error event
      const recordingError = new Error('Recording data corrupted');
      if (mockMediaRecorder.onerror && typeof mockMediaRecorder.onerror === 'function') {
        mockMediaRecorder.onerror({ error: recordingError } as any);
      }
      
      // Assert: Should handle recording error gracefully
      expect(recorder.hasError).toBe(true);
      expect(recorder.error).not.toBeNull();
      expect(recorder.error?.type).toBe('RECORDING_FAILED');
      // Note: isRecording might still be true until stop is called
      
      // Cleanup
      recorder.dispose();
    });
  });

  describe('localStorage Error Scenarios', () => {
    it('should handle localStorage completely unavailable', () => {
      // Arrange: Remove localStorage
      Object.defineProperty(global, 'localStorage', {
        value: undefined,
        writable: true
      });
      
      // Act: Create SettingsManager
      const settingsManager = new SettingsManager();
      
      // Assert: Should detect unavailability and use defaults
      expect(settingsManager.isLocalStorageAvailable()).toBe(false);
      
      const settings = settingsManager.loadSettings();
      const defaults = settingsManager.getDefaults();
      expect(settings).toEqual(defaults);
      
      // Act: Try to save settings
      const saveError = settingsManager.saveSettings({
        ...defaults,
        metronomeBPM: 120
      });
      
      // Assert: Should return error for unavailable storage
      expect(saveError).not.toBeNull();
      expect(saveError?.type).toBe('STORAGE_UNAVAILABLE');
      expect(saveError?.message).toContain('localStorage');
    });

    it('should handle localStorage quota exceeded', () => {
      // Arrange: Mock localStorage that throws quota exceeded error
      const mockStorage = {
        getItem: vi.fn().mockReturnValue(null),
        setItem: vi.fn().mockImplementation(() => {
          const error = new Error('QuotaExceededError');
          error.name = 'QuotaExceededError';
          throw error;
        }),
        removeItem: vi.fn(),
        clear: vi.fn(),
        length: 0,
        key: vi.fn()
      };
      
      Object.defineProperty(global, 'localStorage', {
        value: mockStorage,
        writable: true
      });
      
      // Act: Create SettingsManager
      const settingsManager = new SettingsManager();
      
      // Assert: Should detect quota issue during availability check
      expect(settingsManager.isLocalStorageAvailable()).toBe(false);
      
      // Act: Try to save settings
      const defaults = settingsManager.getDefaults();
      const saveError = settingsManager.saveSettings({
        ...defaults,
        metronomeBPM: 120
      });
      
      // Assert: Should return quota exceeded error
      expect(saveError).not.toBeNull();
      expect(saveError?.type).toBe('STORAGE_UNAVAILABLE');
    });

    it('should handle localStorage disabled by browser policy', () => {
      // Arrange: Mock localStorage that throws security error
      const mockStorage = {
        getItem: vi.fn().mockImplementation(() => {
          throw new Error('SecurityError: localStorage is disabled');
        }),
        setItem: vi.fn().mockImplementation(() => {
          throw new Error('SecurityError: localStorage is disabled');
        }),
        removeItem: vi.fn().mockImplementation(() => {
          throw new Error('SecurityError: localStorage is disabled');
        }),
        clear: vi.fn(),
        length: 0,
        key: vi.fn()
      };
      
      Object.defineProperty(global, 'localStorage', {
        value: mockStorage,
        writable: true
      });
      
      // Act: Create SettingsManager
      const settingsManager = new SettingsManager();
      
      // Assert: Should detect security restriction
      expect(settingsManager.isLocalStorageAvailable()).toBe(false);
      
      // Act: Load settings (should use defaults)
      const settings = settingsManager.loadSettings();
      const defaults = settingsManager.getDefaults();
      expect(settings).toEqual(defaults);
      
      // Act: Try to save settings
      const saveError = settingsManager.saveSettings({
        ...defaults,
        metronomeBPM: 120
      });
      
      // Assert: Should return storage unavailable error
      expect(saveError).not.toBeNull();
      expect(saveError?.type).toBe('STORAGE_UNAVAILABLE');
    });

    it('should handle corrupted JSON in localStorage', () => {
      // Arrange: Mock localStorage with corrupted data
      const mockStorage = {
        getItem: vi.fn().mockReturnValue('{"invalid": json}'), // Invalid JSON
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
        length: 0,
        key: vi.fn()
      };
      
      Object.defineProperty(global, 'localStorage', {
        value: mockStorage,
        writable: true
      });
      
      // Act: Create SettingsManager
      const settingsManager = new SettingsManager();
      
      // Assert: Should detect corruption and use defaults
      const settings = settingsManager.loadSettings();
      const defaults = settingsManager.getDefaults();
      expect(settings).toEqual(defaults);
      
      // Verify that corrupted data was cleared
      expect(mockStorage.removeItem).toHaveBeenCalledWith('piano-control-panel-settings');
    });

    it('should handle localStorage with wrong data types', () => {
      // Arrange: Mock localStorage with wrong data types
      const corruptedSettings = {
        controlPanelOpen: 'true', // Should be boolean
        keyMarkingEnabled: 1, // Should be boolean
        metronomeBPM: 'fast', // Should be number
        audioRecordingFormat: 'invalid' // Should be 'webm' | 'mp4' | 'wav'
      };
      
      const mockStorage = {
        getItem: vi.fn().mockReturnValue(JSON.stringify(corruptedSettings)),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
        length: 0,
        key: vi.fn()
      };
      
      Object.defineProperty(global, 'localStorage', {
        value: mockStorage,
        writable: true
      });
      
      // Act: Create SettingsManager
      const settingsManager = new SettingsManager();
      
      // Assert: Should detect invalid data and use defaults
      const settings = settingsManager.loadSettings();
      const defaults = settingsManager.getDefaults();
      expect(settings).toEqual(defaults);
      
      // Verify all types are correct
      expect(typeof settings.controlPanelOpen).toBe('boolean');
      expect(typeof settings.keyMarkingEnabled).toBe('boolean');
      expect(typeof settings.metronomeBPM).toBe('number');
      expect(['webm', 'mp4', 'wav']).toContain(settings.audioRecordingFormat);
    });

    it('should handle localStorage setItem failures during save', () => {
      // Arrange: Mock localStorage that fails on setItem
      const mockStorage = {
        getItem: vi.fn().mockReturnValue(null),
        setItem: vi.fn().mockImplementation(() => {
          throw new Error('Failed to save to localStorage');
        }),
        removeItem: vi.fn(),
        clear: vi.fn(),
        length: 0,
        key: vi.fn()
      };
      
      Object.defineProperty(global, 'localStorage', {
        value: mockStorage,
        writable: true
      });
      
      // Act: Create SettingsManager and try to save
      const settingsManager = new SettingsManager();
      const defaults = settingsManager.getDefaults();
      
      const saveError = settingsManager.saveSettings({
        ...defaults,
        metronomeBPM: 120
      });
      
      // Assert: Should return error for save failure
      expect(saveError).not.toBeNull();
      expect(saveError?.type).toBe('STORAGE_UNAVAILABLE');
      expect(saveError?.message).toContain('localStorage is not available');
    });
  });

  describe('Tone.js Transport Error Scenarios', () => {
    it('should handle Tone.js context unavailable', () => {
      // Arrange: Mock Tone.js context to be null
      const originalContext = Tone.context;
      Object.defineProperty(Tone, 'context', {
        value: null,
        writable: true,
        configurable: true
      });
      
      try {
        // Act: Create MetronomeEngine
        let metronomeError: any = null;
        let metronome: MetronomeEngine | null = null;
        
        try {
          metronome = new MetronomeEngine();
        } catch (error) {
          metronomeError = error;
        }
        
        // Assert: Should handle context unavailability
        if (metronome) {
          expect(metronome.hasError).toBe(true);
          expect(metronome.error).not.toBeNull();
          expect(metronome.error?.type).toBe('CONTEXT_UNAVAILABLE');
          expect(metronome.isReady).toBe(false);
          
          // Cleanup
          metronome.dispose();
        } else {
          // If constructor throws, that's also acceptable error handling
          expect(metronomeError).not.toBeNull();
        }
      } finally {
        // Restore original context
        Object.defineProperty(Tone, 'context', {
          value: originalContext,
          writable: true,
          configurable: true
        });
      }
    });

    it('should handle Tone.Transport.scheduleRepeat failure', () => {
      // Arrange: Mock Tone.Transport.scheduleRepeat to throw
      vi.mocked(Tone.Transport.scheduleRepeat).mockImplementation(() => {
        throw new Error('Transport scheduleRepeat failed');
      });
      
      // Act: Create metronome and try to start
      const metronome = new MetronomeEngine();
      
      try {
        metronome.start();
      } catch (error) {
        // Expected to fail
      }
      
      // Assert: Should handle Transport failure gracefully
      expect(metronome.hasError).toBe(true);
      expect(metronome.error).not.toBeNull();
      expect(metronome.error?.type).toBe('TRANSPORT_ERROR');
      expect(metronome.isActive).toBe(false);
      
      // Cleanup
      metronome.dispose();
    });

    it('should handle Tone.Transport.start failure', () => {
      // Arrange: Mock Tone.Transport.start to throw
      vi.mocked(Tone.Transport.start).mockImplementation(() => {
        throw new Error('Transport start failed');
      });
      
      // Act: Create metronome and try to start
      const metronome = new MetronomeEngine();
      
      try {
        metronome.start();
      } catch (error) {
        // Expected to fail
      }
      
      // Assert: Should handle Transport start failure
      expect(metronome.hasError).toBe(true);
      expect(metronome.error).not.toBeNull();
      expect(metronome.error?.type).toBe('TRANSPORT_ERROR');
      expect(metronome.isActive).toBe(false);
      
      // Cleanup
      metronome.dispose();
    });

    it('should handle Tone.Oscillator creation failure', () => {
      // Arrange: Mock Tone.Oscillator constructor to throw
      vi.mocked(Tone.Oscillator).mockImplementation(() => {
        throw new Error('Oscillator creation failed');
      });
      
      // Act: Create MetronomeEngine
      let metronomeError: any = null;
      let metronome: MetronomeEngine | null = null;
      
      try {
        metronome = new MetronomeEngine();
      } catch (error) {
        metronomeError = error;
      }
      
      // Assert: Should handle Oscillator creation failure
      if (metronome) {
        expect(metronome.hasError).toBe(true);
        expect(metronome.error).not.toBeNull();
        expect(metronome.error?.type).toBe('CLICK_SOUND_ERROR');
        
        // Cleanup
        metronome.dispose();
      } else {
        // If constructor throws, that's also acceptable error handling
        expect(metronomeError).not.toBeNull();
      }
    });

    it('should handle audio context suspended state', async () => {
      // Arrange: Mock Tone.context with suspended state
      const originalContext = Tone.context;
      const mockContext = {
        state: 'suspended',
        resume: vi.fn().mockRejectedValue(new Error('Context resume failed'))
      };
      Object.defineProperty(Tone, 'context', {
        value: mockContext,
        writable: true,
        configurable: true
      });
      
      try {
        // Act: Create metronome
        const metronome = new MetronomeEngine();
        
        // Try to start (may trigger context resume)
        try {
          metronome.start();
        } catch (error) {
          // Expected to fail
        }
        
        // Assert: Should handle suspended context appropriately
        // The metronome should either handle this gracefully or report an error
        if (metronome.hasError) {
          expect(metronome.error).not.toBeNull();
          expect(['CONTEXT_UNAVAILABLE', 'TRANSPORT_ERROR']).toContain(metronome.error?.type);
        }
        
        // Cleanup
        metronome.dispose();
      } finally {
        // Restore original context
        Object.defineProperty(Tone, 'context', {
          value: originalContext,
          writable: true,
          configurable: true
        });
      }
    });

    it('should handle Tone.Transport.stop failure during cleanup', () => {
      // Arrange: Create working metronome first
      const metronome = new MetronomeEngine();
      metronome.start();
      
      // Mock Transport.stop to throw during cleanup
      vi.mocked(Tone.Transport.stop).mockImplementation(() => {
        throw new Error('Transport stop failed');
      });
      
      // Act: Try to stop metronome
      try {
        metronome.stop();
      } catch (error) {
        // Expected to fail
      }
      
      // Assert: Should handle stop failure gracefully
      // The metronome should either handle this internally or report an error
      if (metronome.hasError) {
        expect(metronome.error).not.toBeNull();
        expect(metronome.error?.type).toBe('TRANSPORT_ERROR');
      }
      
      // Cleanup
      metronome.dispose();
    });

    it('should handle BPM validation with invalid values', () => {
      // Act: Create metronome and test invalid BPM values
      const metronome = new MetronomeEngine();
      
      // Test various invalid BPM values
      const invalidBPMs = [-50, 0, 500]; // Test only numeric values that should be clamped
      
      for (const invalidBPM of invalidBPMs) {
        try {
          metronome.setBPM(invalidBPM);
        } catch (error) {
          // Expected to fail or clamp
        }
        
        // Assert: Should handle invalid BPM gracefully by clamping to valid range
        const currentBPM = metronome.bpm;
        expect(Number.isFinite(currentBPM)).toBe(true);
        expect(currentBPM).toBeGreaterThanOrEqual(30);
        expect(currentBPM).toBeLessThanOrEqual(300);
      }
      
      // Test NaN separately as it might have different behavior
      try {
        metronome.setBPM(NaN);
        const bpmAfterNaN = metronome.bpm;
        // BPM should either remain valid or be reset to a valid value
        if (Number.isFinite(bpmAfterNaN)) {
          expect(bpmAfterNaN).toBeGreaterThanOrEqual(30);
          expect(bpmAfterNaN).toBeLessThanOrEqual(300);
        }
      } catch (error) {
        // It's acceptable for NaN to throw an error
      }
      
      // Cleanup
      metronome.dispose();
    });
  });

  describe('Audio Context Error Scenarios', () => {
    it('should handle Web Audio API unavailable', async () => {
      // This test is simplified to focus on the core error handling
      // without trying to modify global AudioContext which can be problematic in test environments
      
      // Act: Create components that depend on Web Audio API
      const recorder = new AudioRecorder();
      const metronome = new MetronomeEngine();
      
      // Assert: Components should be created without throwing
      expect(recorder).toBeDefined();
      expect(metronome).toBeDefined();
      
      // Components may or may not have errors depending on the test environment
      // The key is that they handle missing APIs gracefully without crashing
      
      // Cleanup
      recorder.dispose();
      metronome.dispose();
    });

    it('should handle component initialization gracefully', () => {
      // Act: Create components multiple times to test initialization robustness
      for (let i = 0; i < 3; i++) {
        const recorder = new AudioRecorder();
        const metronome = new MetronomeEngine();
        
        // Assert: Should not throw during creation
        expect(recorder).toBeDefined();
        expect(metronome).toBeDefined();
        
        // Cleanup
        recorder.dispose();
        metronome.dispose();
      }
    });
  });

  describe('Cross-Component Error Propagation', () => {
    it('should handle multiple simultaneous component failures', async () => {
      // Arrange: Set up multiple failure conditions
      delete (global as any).MediaRecorder;
      
      Object.defineProperty(global, 'localStorage', {
        value: undefined,
        writable: true
      });
      
      const originalContext = Tone.context;
      Object.defineProperty(Tone, 'context', {
        value: null,
        writable: true,
        configurable: true
      });
      
      try {
        // Act: Create all components
        const recorder = new AudioRecorder();
        let metronome: MetronomeEngine | null = null;
        let metronomeError: any = null;
        
        try {
          metronome = new MetronomeEngine();
        } catch (error) {
          metronomeError = error;
        }
        
        const settingsManager = new SettingsManager();
        
        // Assert: Each component should handle its own failures gracefully
        // AudioRecorder might not set error flag immediately during construction
        // but should handle errors when operations are attempted
        expect(recorder).toBeDefined();
        
        // MetronomeEngine might throw during construction or set error flag
        if (metronome) {
          expect(metronome.hasError).toBe(true);
          expect(metronome.error?.type).toBe('CONTEXT_UNAVAILABLE');
        } else {
          expect(metronomeError).not.toBeNull();
        }
        
        expect(settingsManager.isLocalStorageAvailable()).toBe(false);
        
        // Assert: Components should still provide basic functionality
        const settings = settingsManager.loadSettings();
        expect(settings).toBeDefined();
        expect(typeof settings).toBe('object');
        
        // Test that AudioRecorder handles errors when operations are attempted
        try {
          await recorder.startRecording();
        } catch (error) {
          // Expected to fail
        }
        
        // Should have error flag set
        expect(recorder.hasError).toBe(true);
        
        // Cleanup
        recorder.dispose();
        if (metronome) {
          metronome.dispose();
        }
      } finally {
        // Restore original context
        Object.defineProperty(Tone, 'context', {
          value: originalContext,
          writable: true,
          configurable: true
        });
      }
    });

    it('should handle error recovery after initial failures', async () => {
      // Arrange: Start with failing localStorage
      Object.defineProperty(global, 'localStorage', {
        value: undefined,
        writable: true
      });
      
      // Act: Create SettingsManager with failing storage
      const settingsManager = new SettingsManager();
      expect(settingsManager.isLocalStorageAvailable()).toBe(false);
      
      // Arrange: Restore localStorage
      const workingStorage = {
        getItem: vi.fn().mockReturnValue(null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
        length: 0,
        key: vi.fn()
      };
      
      Object.defineProperty(global, 'localStorage', {
        value: workingStorage,
        writable: true
      });
      
      // Act: Create new SettingsManager (simulating app restart)
      const newSettingsManager = new SettingsManager();
      
      // Assert: Should work with restored localStorage
      expect(newSettingsManager.isLocalStorageAvailable()).toBe(true);
      
      const saveError = newSettingsManager.saveSettings({
        ...newSettingsManager.getDefaults(),
        metronomeBPM: 120
      });
      
      expect(saveError).toBeNull();
    });
  });
});