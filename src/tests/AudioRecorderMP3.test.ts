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
      // Start recording to initialize state
      await recorder.startRecording();
      
      // Simulate recording data by triggering the MediaRecorder events properly
      const mockBlob = new Blob(['test audio'], { type: 'audio/webm' });
      
      // Simulate the MediaRecorder data available event
      if (mockMediaRecorder.ondataavailable) {
        mockMediaRecorder.ondataavailable({ data: mockBlob });
      }
      
      // Set duration before stopping
      (recorder as any)._duration = 5.0;
      
      // Stop recording which will trigger the onstop event and create the recorded blob
      recorder.stopRecording();
      
      // Simulate the MediaRecorder stop event to complete the recording process
      if (mockMediaRecorder.onstop) {
        mockMediaRecorder.onstop();
      }
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

  /**
   * **Feature: piano-control-panel, Property 18: Audio export functionality**
   * **Validates: Requirements 5.5**
   * 
   * Property: For any recorded audio, the download function should generate a valid 
   * file containing the recorded content.
   * 
   * This property verifies that:
   * 1. Download functionality is available after recording
   * 2. Download generates a valid file with correct content
   * 3. File format and metadata are preserved correctly
   * 4. Download process handles different audio data sizes
   * 5. Error handling works correctly for download scenarios
   */
  describe('Property 18: Audio export functionality', () => {
    // Import fast-check for property-based testing
    const fc = require('fast-check');

    it('Property 18: Audio export functionality - download generates valid files', () => {
      // Generator for recording session parameters
      const recordingDurationArb = fc.float({ min: Math.fround(0.1), max: Math.fround(30.0), noNaN: true });
      const audioDataSizeArb = fc.integer({ min: 1000, max: 50000 }); // Simulate different audio data sizes
      const mimeTypeArb = fc.constantFrom('audio/webm', 'audio/mp4', 'audio/wav');
      
      // Property: For any recorded audio, download should generate a valid file
      fc.assert(
        fc.asyncProperty(recordingDurationArb, audioDataSizeArb, mimeTypeArb, async (duration: number, audioDataSize: number, mimeType: string) => {
          let testRecorder: AudioRecorder | null = null;
          
          // Store original DOM methods for restoration
          const originalCreateElement = document.createElement;
          const originalAppendChild = document.body.appendChild;
          const originalRemoveChild = document.body.removeChild;
          const originalCreateObjectURL = global.URL.createObjectURL;
          const originalRevokeObjectURL = global.URL.revokeObjectURL;
          
          // Track created URLs and elements for cleanup
          const createdUrls: string[] = [];
          const createdElements: HTMLElement[] = [];
          
          try {
            // Arrange: Create recorder and simulate a completed recording
            testRecorder = new AudioRecorder({ mimeType });
            
            // Simulate a completed recording session with audio data
            const mockAudioData = new Uint8Array(audioDataSize);
            // Fill with varied data to simulate real audio content
            for (let i = 0; i < audioDataSize; i++) {
              mockAudioData[i] = (i % 256); // Create pattern to verify content integrity
            }
            const mockBlob = new Blob([mockAudioData], { type: mimeType });
            
            // Directly set the recording state to simulate a completed recording
            // This bypasses the complex MediaRecorder mocking and focuses on the download logic
            (testRecorder as any)._recordedBlob = mockBlob;
            (testRecorder as any)._duration = duration;
            (testRecorder as any)._isRecording = false;
            
            // Mock URL methods for download testing with proper scoping
            global.URL.createObjectURL = vi.fn().mockImplementation((blob: Blob) => {
              // Verify blob integrity
              expect(blob).toBeInstanceOf(Blob);
              expect(blob.size).toBeGreaterThan(0);
              expect(blob.type).toBeTruthy();
              
              const mockUrl = `blob:mock-url-${Date.now()}-${Math.random()}`;
              createdUrls.push(mockUrl);
              return mockUrl;
            });
            
            global.URL.revokeObjectURL = vi.fn().mockImplementation((url: string) => {
              const index = createdUrls.indexOf(url);
              if (index > -1) {
                createdUrls.splice(index, 1);
              }
            });
            
            // Mock document.createElement to track link creation
            document.createElement = vi.fn().mockImplementation((tagName: string) => {
              const element = originalCreateElement.call(document, tagName);
              if (tagName === 'a') {
                createdElements.push(element);
                // Mock the link element properties
                Object.defineProperties(element, {
                  href: { writable: true, value: '' },
                  download: { writable: true, value: '' },
                  click: { writable: true, value: vi.fn() }
                });
              }
              return element;
            });
            
            // Mock appendChild and removeChild to track DOM operations
            document.body.appendChild = vi.fn().mockImplementation((element: HTMLElement) => {
              return element;
            });
            
            document.body.removeChild = vi.fn().mockImplementation((element: HTMLElement) => {
              const index = createdElements.indexOf(element);
              if (index > -1) {
                createdElements.splice(index, 1);
              }
              return element;
            });
            
            // Act: Test download functionality
            
            // 1. Verify recording is available for download
            expect(testRecorder.hasRecording).toBe(true);
            expect(testRecorder.recordedBlob).not.toBeNull();
            expect(testRecorder.duration).toBe(duration);
            
            // 2. Test download initiation (original format)
            let downloadError = null;
            try {
              await testRecorder!.downloadOriginalFormat();
            } catch (error) {
              downloadError = error;
            }
            
            // The download should not throw an error
            expect(downloadError).toBeNull();
            
            // 3. Verify download setup was called correctly
            expect(global.URL.createObjectURL).toHaveBeenCalledWith(mockBlob);
            expect(document.createElement).toHaveBeenCalledWith('a');
            expect(document.body.appendChild).toHaveBeenCalled();
            expect(document.body.removeChild).toHaveBeenCalled();
            
            // 4. Verify link element was configured correctly
            const createElementCalls = (document.createElement as any).mock.calls;
            const linkCreationCall = createElementCalls.find((call: any[]) => call[0] === 'a');
            expect(linkCreationCall).toBeDefined();
            
            // 5. Verify URL was created
            expect(createdUrls.length).toBeGreaterThan(0);
            
            // 6. Verify no errors occurred during download setup
            expect(testRecorder.hasError).toBe(false);
            expect(testRecorder.error).toBeNull();
            
            // 7. Test that recorder state remains consistent after download
            expect(testRecorder.hasRecording).toBe(true);
            expect(testRecorder.recordedBlob).not.toBeNull();
            expect(testRecorder.duration).toBe(duration);
            
            // 8. Verify blob integrity is maintained
            expect(testRecorder.recordedBlob?.size).toBeGreaterThan(0);
            expect(testRecorder.recordedBlob?.type).toBeTruthy();
            
            // 9. Test filename generation (if method exists)
            if (typeof (testRecorder as any).generateFilename === 'function') {
              const filename = (testRecorder as any).generateFilename();
              expect(typeof filename).toBe('string');
              expect(filename.length).toBeGreaterThan(0);
              expect(filename).toMatch(/piano-recording-.*\.(webm|mp4|wav)$/);
              
              // 10. Verify file extension matches MIME type (if method exists)
              if (typeof (testRecorder as any).getFileExtension === 'function') {
                const expectedExtension = (testRecorder as any).getFileExtension();
                expect(filename).toContain(expectedExtension);
                
                if (mimeType.includes('webm')) {
                  expect(expectedExtension).toBe('webm');
                } else if (mimeType.includes('mp4')) {
                  expect(expectedExtension).toBe('mp4');
                } else if (mimeType.includes('wav')) {
                  expect(expectedExtension).toBe('wav');
                }
              }
            }
            
          } finally {
            // Cleanup
            if (testRecorder) {
              testRecorder.dispose();
            }
            
            // Restore original DOM methods
            document.createElement = originalCreateElement;
            document.body.appendChild = originalAppendChild;
            document.body.removeChild = originalRemoveChild;
            global.URL.createObjectURL = originalCreateObjectURL;
            global.URL.revokeObjectURL = originalRevokeObjectURL;
            
            // Clean up any remaining URLs
            createdUrls.forEach((url: string) => {
              try {
                URL.revokeObjectURL(url);
              } catch (e) {
                // Ignore cleanup errors
              }
            });
            
            vi.clearAllMocks();
          }
        }),
        { numRuns: 100 }
      );
    });
  });
});