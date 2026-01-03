import { debugLogger } from './debugLogger';

// Import lamejs for MP3 encoding
// Note: lamejs doesn't have TypeScript definitions, so we'll use type assertions
let lamejs: any = null;

// Try to import lamejs - this will be handled by the bundler
const loadLamejs = async (): Promise<any> => {
  if (lamejs) return lamejs;
  
  try {
    // Import lamejs using dynamic import which works in both browser and Node.js
    const module = await import('lamejs');
    // Handle both default and named exports
    lamejs = module.default || module;
    debugLogger.info('MP3Converter: lamejs loaded successfully');
    return lamejs;
  } catch (error) {
    debugLogger.warn('MP3Converter: lamejs not available - MP3 export will be disabled', { error });
    return null;
  }
};

export interface MP3ConversionConfig {
  bitRate: number; // 128, 192, 256, 320 kbps
  quality: number; // 0-9 (0 = best quality, 9 = smallest file)
  sampleRate: number; // 44100, 48000 Hz
  channels: number; // 1 = mono, 2 = stereo
}

export interface MP3ConversionProgress {
  progress: number; // 0-1
  stage: 'decoding' | 'encoding' | 'finalizing';
  message: string;
}

export interface MP3ConversionResult {
  success: boolean;
  mp3Blob?: Blob;
  error?: string;
  originalSize: number;
  compressedSize?: number;
  compressionRatio?: number;
}

/**
 * MP3Converter handles client-side MP3 encoding using the lamejs library
 * Provides fallback mechanisms and progress tracking for audio conversion
 */
export class MP3Converter {
  private static readonly DEFAULT_CONFIG: MP3ConversionConfig = {
    bitRate: 128, // 128 kbps - good balance of quality and file size
    quality: 2, // Good quality
    sampleRate: 44100, // CD quality
    channels: 2 // Stereo
  };

  private config: MP3ConversionConfig;
  private onProgress?: (progress: MP3ConversionProgress) => void;

  constructor(config?: Partial<MP3ConversionConfig>, onProgress?: (progress: MP3ConversionProgress) => void) {
    this.config = { ...MP3Converter.DEFAULT_CONFIG, ...config };
    this.onProgress = onProgress;
    
    debugLogger.info('MP3Converter: Initialized', { config: this.config });
  }

  /**
   * Check if MP3 conversion is supported in the current environment
   * This is a synchronous check that returns false if lamejs hasn't been loaded yet
   * Use checkSupport() for async loading and checking
   */
  static isSupported(): boolean {
    try {
      // Return true if lamejs is already loaded and available
      return !!(lamejs && lamejs.Mp3Encoder);
    } catch (error) {
      debugLogger.warn('MP3Converter: lamejs availability check failed', { error });
      return false;
    }
  }

  /**
   * Async check if MP3 conversion is supported and attempt to load lamejs
   * This will try to load lamejs if it's not already loaded
   */
  static async checkSupport(): Promise<boolean> {
    try {
      const loadedLamejs = await loadLamejs();
      return !!(loadedLamejs && loadedLamejs.Mp3Encoder);
    } catch (error) {
      debugLogger.warn('MP3Converter: Failed to load lamejs', { error });
      return false;
    }
  }

  /**
   * Convert an audio blob to MP3 format
   * @param audioBlob - The source audio blob to convert
   * @param config - Optional configuration overrides
   * @returns Promise resolving to conversion result
   */
  async convertToMP3(audioBlob: Blob, config?: Partial<MP3ConversionConfig>): Promise<MP3ConversionResult> {
    const conversionConfig = { ...this.config, ...config };
    const originalSize = audioBlob.size;
    
    debugLogger.info('MP3Converter: Starting conversion', { 
      originalSize,
      config: conversionConfig,
      mimeType: audioBlob.type
    });

    try {
      // Load lamejs dynamically and check if conversion is supported
      const loadedLamejs = await loadLamejs();
      if (!loadedLamejs || !loadedLamejs.Mp3Encoder) {
        throw new Error('MP3 conversion not supported - lamejs library not available');
      }

      // Report progress: decoding stage
      this.reportProgress(0.1, 'decoding', 'Decoding audio data...');

      // Convert blob to audio buffer
      const audioBuffer = await this.blobToAudioBuffer(audioBlob);
      
      this.reportProgress(0.3, 'decoding', 'Audio decoded successfully');

      // Report progress: encoding stage
      this.reportProgress(0.4, 'encoding', 'Initializing MP3 encoder...');

      // Convert audio buffer to MP3
      const mp3Buffer = await this.encodeToMP3(audioBuffer, conversionConfig, loadedLamejs);
      
      this.reportProgress(0.9, 'finalizing', 'Creating MP3 file...');

      // Create MP3 blob
      const arrayBuffer = new ArrayBuffer(mp3Buffer.length);
      const view = new Uint8Array(arrayBuffer);
      view.set(mp3Buffer);
      const mp3Blob = new Blob([arrayBuffer], { type: 'audio/mp3' });
      const compressedSize = mp3Blob.size;
      const compressionRatio = originalSize > 0 ? compressedSize / originalSize : 1;

      this.reportProgress(1.0, 'finalizing', 'Conversion complete');

      const result: MP3ConversionResult = {
        success: true,
        mp3Blob,
        originalSize,
        compressedSize,
        compressionRatio
      };

      debugLogger.info('MP3Converter: Conversion successful', {
        originalSize,
        compressedSize,
        compressionRatio: compressionRatio.toFixed(2),
        bitRate: conversionConfig.bitRate
      });

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      debugLogger.error('MP3Converter: Conversion failed', { 
        error: errorMessage,
        originalSize,
        config: conversionConfig
      });

      return {
        success: false,
        error: errorMessage,
        originalSize
      };
    }
  }

  /**
   * Convert audio blob to AudioBuffer using Web Audio API
   */
  private async blobToAudioBuffer(blob: Blob): Promise<AudioBuffer> {
    try {
      // Create audio context
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Convert blob to array buffer
      const arrayBuffer = await blob.arrayBuffer();
      
      // Decode audio data
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // Close audio context to free resources
      await audioContext.close();
      
      debugLogger.debug('MP3Converter: Audio buffer created', {
        sampleRate: audioBuffer.sampleRate,
        channels: audioBuffer.numberOfChannels,
        duration: audioBuffer.duration,
        length: audioBuffer.length
      });

      return audioBuffer;
      
    } catch (error) {
      debugLogger.error('MP3Converter: Failed to decode audio', { error });
      throw new Error(`Failed to decode audio: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Encode AudioBuffer to MP3 using lamejs
   */
  private async encodeToMP3(audioBuffer: AudioBuffer, config: MP3ConversionConfig, lamejsInstance: any): Promise<Uint8Array> {
    try {
      if (!lamejsInstance || !lamejsInstance.Mp3Encoder) {
        throw new Error('lamejs library not available');
      }
      
      // Create MP3 encoder
      const encoder = new lamejsInstance.Mp3Encoder(config.channels, config.sampleRate, config.bitRate);
      
      debugLogger.debug('MP3Converter: MP3 encoder created', {
        channels: config.channels,
        sampleRate: config.sampleRate,
        bitRate: config.bitRate
      });

      // Prepare audio data
      const samples = this.prepareAudioSamples(audioBuffer, config);
      
      // Encode in chunks for better performance and progress reporting
      const mp3Data: Int8Array[] = [];
      const chunkSize = 1152; // Standard MP3 frame size
      const totalChunks = Math.ceil(samples.left.length / chunkSize);
      
      for (let i = 0; i < samples.left.length; i += chunkSize) {
        const leftChunk = samples.left.slice(i, i + chunkSize);
        const rightChunk = config.channels === 2 ? samples.right?.slice(i, i + chunkSize) : undefined;
        
        // Encode chunk
        const mp3buf = encoder.encodeBuffer(leftChunk, rightChunk);
        if (mp3buf.length > 0) {
          mp3Data.push(mp3buf);
        }
        
        // Report progress
        const progress = 0.4 + (0.5 * (i / samples.left.length));
        const chunkIndex = Math.floor(i / chunkSize) + 1;
        this.reportProgress(progress, 'encoding', `Encoding chunk ${chunkIndex}/${totalChunks}...`);
      }
      
      // Flush encoder
      const mp3buf = encoder.flush();
      if (mp3buf.length > 0) {
        mp3Data.push(mp3buf);
      }
      
      // Combine all MP3 data
      const totalLength = mp3Data.reduce((sum, chunk) => sum + chunk.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;
      
      for (const chunk of mp3Data) {
        result.set(new Uint8Array(chunk), offset);
        offset += chunk.length;
      }
      
      debugLogger.info('MP3Converter: Encoding complete', {
        inputSamples: samples.left.length,
        outputBytes: result.length,
        chunks: mp3Data.length
      });

      return result;
      
    } catch (error) {
      debugLogger.error('MP3Converter: Encoding failed', { error });
      throw new Error(`MP3 encoding failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Prepare audio samples for MP3 encoding
   */
  private prepareAudioSamples(audioBuffer: AudioBuffer, config: MP3ConversionConfig): {
    left: Int16Array;
    right?: Int16Array;
  } {
    const length = audioBuffer.length;
    
    // Get left channel data
    const leftChannel = audioBuffer.getChannelData(0);
    const leftSamples = this.floatTo16BitPCM(leftChannel);
    
    // Get right channel data if stereo
    let rightSamples: Int16Array | undefined;
    if (config.channels === 2 && audioBuffer.numberOfChannels >= 2) {
      const rightChannel = audioBuffer.getChannelData(1);
      rightSamples = this.floatTo16BitPCM(rightChannel);
    } else if (config.channels === 2) {
      // Duplicate left channel for stereo if only mono source
      rightSamples = leftSamples.slice();
    }
    
    debugLogger.debug('MP3Converter: Audio samples prepared', {
      length,
      channels: config.channels,
      hasRightChannel: !!rightSamples
    });

    return {
      left: leftSamples,
      right: rightSamples
    };
  }

  /**
   * Convert float32 audio samples to 16-bit PCM
   */
  private floatTo16BitPCM(input: Float32Array): Int16Array {
    const output = new Int16Array(input.length);
    
    for (let i = 0; i < input.length; i++) {
      // Clamp to [-1, 1] range and convert to 16-bit
      const sample = Math.max(-1, Math.min(1, input[i]));
      output[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
    }
    
    return output;
  }

  /**
   * Report conversion progress
   */
  private reportProgress(progress: number, stage: MP3ConversionProgress['stage'], message: string): void {
    if (this.onProgress) {
      this.onProgress({ progress, stage, message });
    }
    
    debugLogger.debug('MP3Converter: Progress update', { progress, stage, message });
  }

  /**
   * Estimate the resulting MP3 file size
   * @param durationSeconds - Duration of the audio in seconds
   * @param bitRate - Target bit rate in kbps
   * @returns Estimated file size in bytes
   */
  static estimateFileSize(durationSeconds: number, bitRate: number): number {
    // Formula: (bitRate * 1000 * duration) / 8
    // Divided by 8 to convert bits to bytes
    return Math.round((bitRate * 1000 * durationSeconds) / 8);
  }

  /**
   * Get recommended bit rates for different quality levels
   */
  static getRecommendedBitRates(): { quality: string; bitRate: number; description: string }[] {
    return [
      { quality: 'low', bitRate: 96, description: 'Low quality, small file size' },
      { quality: 'standard', bitRate: 128, description: 'Standard quality, balanced' },
      { quality: 'high', bitRate: 192, description: 'High quality, larger file' },
      { quality: 'premium', bitRate: 320, description: 'Premium quality, largest file' }
    ];
  }

  /**
   * Update the conversion configuration
   */
  updateConfig(config: Partial<MP3ConversionConfig>): void {
    this.config = { ...this.config, ...config };
    debugLogger.info('MP3Converter: Configuration updated', { config: this.config });
  }

  /**
   * Get the current configuration
   */
  getConfig(): MP3ConversionConfig {
    return { ...this.config };
  }
}