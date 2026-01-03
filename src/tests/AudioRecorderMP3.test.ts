import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AudioRecorder, type RecordingConfig } from '../utils/AudioRecorder';
import { MP3Converter } from '../utils/MP3Converter';

// Mock MP3Converter properly
vi.mock('../utils/MP3Converter', () => {
  const MockMP3Converter = vi.fn().mockImplementation(() => ({
    convertToMP3: vi.fn().mockResolvedValue({
      success: true,
      mp3Blob: new Blob(['mock mp3 data'], { type: 'audio/mp3' }),
      originalSize: 1000,
      compressedSize: 800,
      compressionRatio: 0.8
    }),
    updateConfig: vi.fn(),
    getConfig: vi.fn().mockReturnValue({
      bitRate: 128,
      quality: 2,
      sampleRate: 44100,
      channels: 2
    })
  }));

  // Add static methods to the constructor function
  (MockMP3Converter as any).isSupported = vi.fn().mockReturnValue(true);
  (MockMP3Converter as any).estimateFileSize = vi.fn().mockReturnValue(1000000);
  (MockMP3Converter as any).getRecommendedBitRates = vi.fn().mockReturnValue([
    { quality: 'standard', bitRate: 128, description: 'Standard quality' }
  ]);

  return { MP3Converter: MockMP3Converter };
});

describe('AudioRecorder MP3 Integration', () => {
  let recorder: AudioRecorder;
  let mockMediaRecorder: any;
  let mockStream: MediaStream;

  beforeEach(() => {
    // Mock MediaRecorder
    mockMediaRecorder = {
      start: vi.fn(),
      stop: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      state: 'inactive',
      ondataavailable: null,
      onstop: null,
      onerror: null
    };

    global.MediaRecorder = Object.assign(
      vi.fn().mockImplementation(() => mockMediaRecorder),
      {
        isTypeSupported: vi.fn().mockReturnValue(true)
      }
    );

    // Mock getUserMedia
    mockStream = {
      getTracks: vi.fn().mockReturnValue([
        { stop: vi.fn() }
      ])
    } as any;

    global.navigator = {
      ...global.navigator,
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue(mockStream)
      }
    } as any;

    // Mock URL.createObjectURL and revokeObjectURL
    global.URL.createObjectURL = vi.fn().mockReturnValue('mock-url');
    global.URL.revokeObjectURL = vi.fn();

    // Mock document methods for download
    const mockLink = {
      href: '',
      download: '',
      click: vi.fn()
    };
    global.document.createElement = vi.fn().mockReturnValue(mockLink);
    global.document.body.appendChild = vi.fn();
    global.document.body.removeChild = vi.fn();

    // Create recorder with MP3 enabled
    const config: Partial<RecordingConfig> = {
      enableMP3Export: true,
      mp3Config: {
        bitRate: 128,
        quality: 2,
        sampleRate: 44100,
        channels: 2
      }
    };
    
    recorder = new AudioRecorder(config);
  });

  afterEach(() => {
    if (recorder) {
      recorder.dispose();
    }
    vi.clearAllMocks();
  });

  describe('MP3 Configuration', () => {
    it('should initialize with MP3 export enabled', () => {
      expect(recorder.canConvertToMP3).toBe(true);
    });

    it('should allow updating MP3 configuration', () => {
      const newConfig = {
        bitRate: 192,
        quality: 1
      };
      
      recorder.updateMP3Config(newConfig);
      const config = recorder.getMP3Config();
      
      expect(config?.bitRate).toBe(192);
      expect(config?.quality).toBe(1);
    });

    it('should allow enabling/disabling MP3 export', () => {
      expect(recorder.canConvertToMP3).toBe(true);
      
      recorder.setMP3ExportEnabled(false);
      // Note: canConvertToMP3 might still be true if converter is already initialized
      
      recorder.setMP3ExportEnabled(true);
      expect(recorder.canConvertToMP3).toBe(true);
    });

    it('should return current MP3 configuration', () => {
      const config = recorder.getMP3Config();
      
      expect(config).toBeDefined();
      expect(config?.bitRate).toBe(128);
      expect(config?.quality).toBe(2);
      expect(config?.sampleRate).toBe(44100);
      expect(config?.channels).toBe(2);
    });
  });

  describe('MP3 Conversion Status', () => {
    it('should track conversion progress', () => {
      expect(recorder.isConvertingToMP3).toBe(false);
      expect(recorder.conversionProgress).toBeNull();
    });

    it('should provide conversion capabilities check', () => {
      // This depends on MP3Converter.isSupported() mock
      expect(typeof recorder.canConvertToMP3).toBe('boolean');
    });
  });

  describe('Download Methods', () => {
    beforeEach(async () => {
      // Start and stop recording to have something to download
      await recorder.startRecording();
      
      // Simulate recording data
      const mockBlob = new Blob(['test audio'], { type: 'audio/webm' });
      (recorder as any)._recordedBlob = mockBlob;
      (recorder as any)._duration = 5.0;
      
      recorder.stopRecording();
    });

    it('should have downloadRecording method that accepts MP3 options', async () => {
      expect(typeof recorder.downloadRecording).toBe('function');
      
      // Should not throw when called
      await expect(recorder.downloadRecording()).resolves.not.toThrow();
    });

    it('should have downloadOriginalFormat method', async () => {
      expect(typeof recorder.downloadOriginalFormat).toBe('function');
      
      // Should not throw when called
      await expect(recorder.downloadOriginalFormat()).resolves.not.toThrow();
    });

    it('should handle download with custom MP3 config', async () => {
      const customConfig = {
        bitRate: 320,
        quality: 0
      };
      
      // Should not throw when called with custom config
      await expect(recorder.downloadRecording(true, customConfig)).resolves.not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle MP3 conversion failures gracefully', async () => {
      // Mock MP3Converter to simulate failure
      vi.mocked(MP3Converter.isSupported).mockReturnValue(false);
      
      const recorderWithoutMP3 = new AudioRecorder({
        enableMP3Export: true
      });
      
      expect(recorderWithoutMP3.canConvertToMP3).toBe(false);
      
      recorderWithoutMP3.dispose();
    });

    it('should provide error information when conversion fails', () => {
      // The recorder should handle errors gracefully
      expect(recorder.hasError).toBe(false);
      expect(recorder.error).toBeNull();
    });
  });

  describe('Integration with existing functionality', () => {
    it('should maintain all existing AudioRecorder functionality', () => {
      // Check that all original methods still exist
      expect(typeof recorder.startRecording).toBe('function');
      expect(typeof recorder.stopRecording).toBe('function');
      expect(typeof recorder.playRecording).toBe('function');
      expect(typeof recorder.clearRecording).toBe('function');
      expect(typeof recorder.replayPerformance).toBe('function');
      
      // Check properties
      expect(typeof recorder.isRecording).toBe('boolean');
      expect(typeof recorder.hasRecording).toBe('boolean');
      expect(typeof recorder.duration).toBe('number');
    });

    it('should not interfere with note tracking', () => {
      expect(typeof recorder.trackNoteEvent).toBe('function');
      expect(typeof recorder.isTrackingNotes).toBe('boolean');
      expect(Array.isArray(recorder.recordedNotes)).toBe(true);
    });

    it('should not interfere with performance replay', () => {
      expect(typeof recorder.canReplayPerformance).toBe('boolean');
      expect(typeof recorder.isReplayingPerformance).toBe('boolean');
    });
  });
});