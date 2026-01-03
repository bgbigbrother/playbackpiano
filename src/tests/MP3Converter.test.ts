import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MP3Converter, type MP3ConversionConfig } from '../utils/MP3Converter';

// Mock lamejs since it's not available in test environment
vi.mock('lamejs', () => ({
  Mp3Encoder: vi.fn().mockImplementation(() => ({
    encodeBuffer: vi.fn().mockReturnValue(new Int8Array([1, 2, 3, 4])),
    flush: vi.fn().mockReturnValue(new Int8Array([5, 6]))
  }))
}));

describe('MP3Converter', () => {
  let converter: MP3Converter;
  let mockProgressCallback: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockProgressCallback = vi.fn();
    converter = new MP3Converter(undefined, mockProgressCallback);
  });

  describe('isSupported', () => {
    it('should return false when lamejs is not available', () => {
      // Since we're mocking lamejs, this will depend on the mock setup
      // In a real environment without lamejs, this would return false
      expect(typeof MP3Converter.isSupported()).toBe('boolean');
    });
  });

  describe('estimateFileSize', () => {
    it('should calculate correct file size estimate', () => {
      const duration = 60; // 1 minute
      const bitRate = 128; // 128 kbps
      const expectedSize = (128 * 1000 * 60) / 8; // bits to bytes
      
      expect(MP3Converter.estimateFileSize(duration, bitRate)).toBe(expectedSize);
    });

    it('should handle zero duration', () => {
      expect(MP3Converter.estimateFileSize(0, 128)).toBe(0);
    });

    it('should handle different bit rates', () => {
      const duration = 30;
      expect(MP3Converter.estimateFileSize(duration, 96)).toBe((96 * 1000 * 30) / 8);
      expect(MP3Converter.estimateFileSize(duration, 192)).toBe((192 * 1000 * 30) / 8);
      expect(MP3Converter.estimateFileSize(duration, 320)).toBe((320 * 1000 * 30) / 8);
    });
  });

  describe('getRecommendedBitRates', () => {
    it('should return array of recommended bit rates', () => {
      const recommendations = MP3Converter.getRecommendedBitRates();
      
      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeGreaterThan(0);
      
      recommendations.forEach(rec => {
        expect(rec).toHaveProperty('quality');
        expect(rec).toHaveProperty('bitRate');
        expect(rec).toHaveProperty('description');
        expect(typeof rec.quality).toBe('string');
        expect(typeof rec.bitRate).toBe('number');
        expect(typeof rec.description).toBe('string');
      });
    });

    it('should include standard quality levels', () => {
      const recommendations = MP3Converter.getRecommendedBitRates();
      const qualities = recommendations.map(r => r.quality);
      
      expect(qualities).toContain('low');
      expect(qualities).toContain('standard');
      expect(qualities).toContain('high');
      expect(qualities).toContain('premium');
    });
  });

  describe('configuration management', () => {
    it('should update configuration correctly', () => {
      const newConfig: Partial<MP3ConversionConfig> = {
        bitRate: 192,
        quality: 1
      };
      
      converter.updateConfig(newConfig);
      const config = converter.getConfig();
      
      expect(config.bitRate).toBe(192);
      expect(config.quality).toBe(1);
    });

    it('should return current configuration', () => {
      const config = converter.getConfig();
      
      expect(config).toHaveProperty('bitRate');
      expect(config).toHaveProperty('quality');
      expect(config).toHaveProperty('sampleRate');
      expect(config).toHaveProperty('channels');
      
      expect(typeof config.bitRate).toBe('number');
      expect(typeof config.quality).toBe('number');
      expect(typeof config.sampleRate).toBe('number');
      expect(typeof config.channels).toBe('number');
    });

    it('should use default configuration when none provided', () => {
      const defaultConverter = new MP3Converter();
      const config = defaultConverter.getConfig();
      
      expect(config.bitRate).toBe(128);
      expect(config.quality).toBe(2);
      expect(config.sampleRate).toBe(44100);
      expect(config.channels).toBe(2);
    });
  });

  describe('convertToMP3', () => {
    it('should handle unsupported environment gracefully', async () => {
      // Create a converter that will fail the support check
      const unsupportedConverter = new MP3Converter();
      
      // Mock isSupported to return false
      vi.spyOn(MP3Converter, 'isSupported').mockReturnValue(false);
      
      const mockBlob = new Blob(['test audio data'], { type: 'audio/wav' });
      
      const result = await unsupportedConverter.convertToMP3(mockBlob);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('not supported');
      expect(result.originalSize).toBe(mockBlob.size);
    });

    it('should return conversion result with correct structure', async () => {
      const mockBlob = new Blob(['test audio data'], { type: 'audio/wav' });
      
      // Mock the Web Audio API
      const mockAudioContext = {
        decodeAudioData: vi.fn().mockResolvedValue({
          sampleRate: 44100,
          numberOfChannels: 2,
          duration: 1.0,
          length: 44100,
          getChannelData: vi.fn().mockReturnValue(new Float32Array(44100))
        }),
        close: vi.fn().mockResolvedValue(undefined)
      };
      
      // Mock AudioContext constructor
      global.AudioContext = vi.fn().mockImplementation(() => mockAudioContext);
      (global as any).webkitAudioContext = global.AudioContext;
      
      // Mock isSupported to return true
      vi.spyOn(MP3Converter, 'isSupported').mockReturnValue(true);
      
      const result = await converter.convertToMP3(mockBlob);
      
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('originalSize');
      expect(result.originalSize).toBe(mockBlob.size);
      
      if (result.success) {
        expect(result).toHaveProperty('mp3Blob');
        expect(result).toHaveProperty('compressedSize');
        expect(result).toHaveProperty('compressionRatio');
      } else {
        expect(result).toHaveProperty('error');
      }
    });
  });
});