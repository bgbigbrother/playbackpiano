import { debugLogger } from './debugLogger';

/**
 * Fallback strategies for loading piano samples
 */

export interface SampleSource {
  name: string;
  baseUrl: string;
  sampleMap: Record<string, string>;
  timeout: number;
}

// Primary source - Tone.js official samples
const toneSamples: SampleSource = {
  name: 'Tone.js Salamander',
  baseUrl: 'https://tonejs.github.io/audio/salamander/',
  sampleMap: {
    'A0': 'A0.mp3',
    'C1': 'C1.mp3',
    'D#1': 'Ds1.mp3',
    'F#1': 'Fs1.mp3',
    'A1': 'A1.mp3',
    'C2': 'C2.mp3',
    'D#2': 'Ds2.mp3',
    'F#2': 'Fs2.mp3',
    'A2': 'A2.mp3',
    'C3': 'C3.mp3',
    'D#3': 'Ds3.mp3',
    'F#3': 'Fs3.mp3',
    'A3': 'A3.mp3',
    'C4': 'C4.mp3',
    'D#4': 'Ds4.mp3',
    'F#4': 'Fs4.mp3',
    'A4': 'A4.mp3',
    'C5': 'C5.mp3',
    'D#5': 'Ds5.mp3',
    'F#5': 'Fs5.mp3',
    'A5': 'A5.mp3',
    'C6': 'C6.mp3',
    'D#6': 'Ds6.mp3',
    'F#6': 'Fs6.mp3',
    'A6': 'A6.mp3',
    'C7': 'C7.mp3',
    'D#7': 'Ds7.mp3',
    'F#7': 'Fs7.mp3',
    'A7': 'A7.mp3',
    'C8': 'C8.mp3'
  },
  timeout: 15000
};

// Fallback source - Smaller sample set for faster loading
const fallbackSamples: SampleSource = {
  name: 'Minimal Piano',
  baseUrl: 'https://tonejs.github.io/audio/salamander/',
  sampleMap: {
    'C1': 'C1.mp3',
    'C2': 'C2.mp3',
    'C3': 'C3.mp3',
    'C4': 'C4.mp3',
    'C5': 'C5.mp3',
    'C6': 'C6.mp3',
    'C7': 'C7.mp3'
  },
  timeout: 10000
};

// Emergency fallback - Single sample
const emergencySamples: SampleSource = {
  name: 'Single Note',
  baseUrl: 'https://tonejs.github.io/audio/salamander/',
  sampleMap: {
    'C4': 'C4.mp3'
  },
  timeout: 5000
};

export const sampleSources: SampleSource[] = [
  toneSamples,
  fallbackSamples,
  emergencySamples
];

/**
 * Test if a sample source is accessible
 */
export async function testSampleSource(source: SampleSource): Promise<boolean> {
  debugLogger.info('Testing sample source', { name: source.name, baseUrl: source.baseUrl });
  
  try {
    // Test loading the first sample
    const firstSample = Object.values(source.sampleMap)[0];
    const testUrl = source.baseUrl + firstSample;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second test timeout
    
    const response = await fetch(testUrl, {
      method: 'HEAD', // Just check if the resource exists
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      debugLogger.info('Sample source test successful', { 
        name: source.name,
        status: response.status,
        contentType: response.headers.get('content-type')
      });
      return true;
    } else {
      debugLogger.warn('Sample source test failed', { 
        name: source.name,
        status: response.status 
      });
      return false;
    }
  } catch (error) {
    debugLogger.error('Sample source test error', { 
      name: source.name,
      error: error instanceof Error ? error.message : String(error)
    });
    return false;
  }
}

/**
 * Find the best available sample source
 */
export async function findBestSampleSource(): Promise<SampleSource> {
  debugLogger.info('Finding best sample source');
  
  for (const source of sampleSources) {
    const isAvailable = await testSampleSource(source);
    if (isAvailable) {
      debugLogger.info('Selected sample source', { name: source.name });
      return source;
    }
  }
  
  // If all tests fail, return the primary source anyway
  debugLogger.warn('All sample sources failed tests, using primary source anyway');
  return toneSamples;
}

/**
 * Check network connectivity
 */
export async function checkNetworkConnectivity(): Promise<boolean> {
  debugLogger.info('Checking network connectivity');
  
  try {
    // Try to fetch a small, reliable resource
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    
    await fetch('https://www.google.com/favicon.ico', {
      method: 'HEAD',
      signal: controller.signal,
      mode: 'no-cors' // Avoid CORS issues
    });
    
    clearTimeout(timeoutId);
    
    debugLogger.info('Network connectivity check successful');
    return true;
  } catch (error) {
    debugLogger.error('Network connectivity check failed', { error });
    return false;
  }
}