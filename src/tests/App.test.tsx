import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import * as Tone from 'tone';
import App from '../App';

// Helper function to create a complete Sampler mock
const createMockSampler = () => ({
  toDestination: vi.fn().mockReturnThis(),
  dispose: vi.fn(),
  triggerAttack: vi.fn(),
  triggerRelease: vi.fn(),
  // Add minimal required properties to satisfy TypeScript
  name: 'MockSampler',
  _buffers: new Map(),
  _activeSources: new Map(),
  attack: 0,
  release: 1,
  curve: 'exponential' as const,
  volume: { value: 0 },
  mute: false,
  state: 'started' as const,
  context: {} as any,
  input: {} as any,
  output: {} as any,
  numberOfInputs: 1,
  numberOfOutputs: 1,
  channelCount: 2,
  channelCountMode: 'max' as const,
  channelInterpretation: 'speakers' as const,
  connect: vi.fn(),
  disconnect: vi.fn(),
  chain: vi.fn(),
  fan: vi.fn(),
  loaded: Promise.resolve(true),
  load: vi.fn(),
  sync: vi.fn(),
  unsync: vi.fn(),
  get: vi.fn(),
  set: vi.fn(),
  getValueAtTime: vi.fn(),
  setValueAtTime: vi.fn(),
  linearRampToValueAtTime: vi.fn(),
  exponentialRampToValueAtTime: vi.fn(),
  setTargetAtTime: vi.fn(),
  setValueCurveAtTime: vi.fn(),
  cancelScheduledValues: vi.fn(),
  cancelAndHoldAtTime: vi.fn(),
  rampTo: vi.fn(),
  targetRampTo: vi.fn(),
  exponentialRampTo: vi.fn(),
  linearRampTo: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
} as any);

describe('App', () => {
  it('renders error message when audio engine fails to initialize', async () => {
    // Mock the AudioEngine to fail initialization
    vi.spyOn(Tone, 'Sampler').mockImplementation((options: any) => {
      const sampler = createMockSampler();
      
      // Simulate loading failure
      setTimeout(() => {
        if (options.onerror) {
          options.onerror('Mock network error');
        }
      }, 10);
      
      return sampler;
    });

    render(<App />);
    
    // Wait for loading to start
    await waitFor(() => {
      expect(screen.getByText('Loading Piano Samples...')).toBeInTheDocument();
    }, { timeout: 2000 });

    // Wait for error state to appear
    await waitFor(
      () => {
        const errorText = screen.queryByText(/Error:/i) || screen.queryByText('Loading Failed');
        expect(errorText).toBeTruthy();
      },
      { timeout: 5000 }
    );

    vi.restoreAllMocks();
  }, 8000); // Reduced timeout from 15 seconds to 8 seconds
});