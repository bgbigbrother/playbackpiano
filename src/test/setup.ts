import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Suppress console output during tests unless VERBOSE_TESTS is set
if (!process.env.VERBOSE_TESTS) {
  global.console = {
    ...console,
    log: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
}

// Optimized Tone.js mock with reduced delays
const createMockSampler = (options?: any) => {
  const sampler = {
    toDestination: vi.fn().mockReturnThis(),
    dispose: vi.fn(),
    triggerAttack: vi.fn(),
    triggerRelease: vi.fn(),
    loaded: true,
  };
  
  // Reduce delay from 10ms to 1ms for faster tests
  if (options && options.onload) {
    setTimeout(() => options.onload(), 1);
  }
  
  return sampler;
};

// Mock Tone.js completely to prevent loading issues
vi.mock('tone', () => ({
  __esModule: true,
  default: {
    context: {
      state: 'running',
      resume: vi.fn().mockResolvedValue(undefined),
      suspend: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
      destination: {},
      currentTime: 0,
      sampleRate: 44100,
    },
    start: vi.fn(),
    Transport: {
      start: vi.fn(),
      stop: vi.fn(),
      pause: vi.fn(),
      bpm: { value: 120 },
      scheduleRepeat: vi.fn(),
      cancel: vi.fn(),
    },
    Sampler: vi.fn().mockImplementation(createMockSampler),
    Oscillator: vi.fn().mockImplementation(() => ({
      connect: vi.fn().mockReturnThis(),
      start: vi.fn(),
      stop: vi.fn(),
      dispose: vi.fn(),
      frequency: { value: 440 },
    })),
    Gain: vi.fn().mockImplementation(() => ({
      connect: vi.fn().mockReturnThis(),
      dispose: vi.fn(),
      gain: { value: 1 },
    })),
  },
  // Remove duplicate definitions - use the default export
  context: {
    state: 'running',
    resume: vi.fn().mockResolvedValue(undefined),
    suspend: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    destination: {},
    currentTime: 0,
    sampleRate: 44100,
  },
  start: vi.fn(),
  Transport: {
    start: vi.fn(),
    stop: vi.fn(),
    pause: vi.fn(),
    bpm: { value: 120 },
    scheduleRepeat: vi.fn(),
    cancel: vi.fn(),
  },
  Sampler: vi.fn().mockImplementation(createMockSampler),
  Oscillator: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockReturnThis(),
    start: vi.fn(),
    stop: vi.fn(),
    dispose: vi.fn(),
    frequency: { value: 440 },
  })),
  Gain: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockReturnThis(),
    dispose: vi.fn(),
    gain: { value: 1 },
  })),
}));

// Mock MUI's useMediaQuery hook directly - correct import path
vi.mock('@mui/material', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    useMediaQuery: vi.fn(() => false), // Default to desktop (not mobile)
  };
});

// Mock Web Audio API
Object.defineProperty(window, 'AudioContext', {
  writable: true,
  value: vi.fn().mockImplementation(() => ({
    createOscillator: vi.fn(),
    createGain: vi.fn(),
    destination: {},
    currentTime: 0,
    sampleRate: 44100,
    state: 'running',
    suspend: vi.fn(),
    resume: vi.fn(),
    close: vi.fn(),
  })),
});

// Also mock webkitAudioContext for older browsers
Object.defineProperty(window, 'webkitAudioContext', {
  writable: true,
  value: window.AudioContext,
});

// Mock matchMedia for responsive testing with proper MUI theme support
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => {
    // Handle MUI theme breakpoint queries
    let matches = false;
    
    // Parse common MUI breakpoint queries
    if (query.includes('(max-width: 899.95px)')) {
      // md breakpoint - mobile/tablet
      matches = false; // Default to desktop
    } else if (query.includes('(max-width: 599.95px)')) {
      // sm breakpoint - mobile
      matches = false;
    } else if (query.includes('(max-width: 1199.95px)')) {
      // lg breakpoint
      matches = true;
    } else {
      // Default for other queries
      matches = true;
    }

    const mediaQuery = {
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(), // deprecated
      removeListener: vi.fn(), // deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    };
    
    return mediaQuery;
  }),
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock MediaRecorder
const MediaRecorderMock = vi.fn().mockImplementation(() => ({
  start: vi.fn(),
  stop: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  state: 'inactive',
}));

// Add static method
(MediaRecorderMock as any).isTypeSupported = vi.fn(() => true);

global.MediaRecorder = MediaRecorderMock as any;

// Mock localStorage
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
  writable: true,
});

// Mock sessionStorage
Object.defineProperty(window, 'sessionStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
  writable: true,
});