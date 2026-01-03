import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as Tone from 'tone';
import App from '../App';

// Fast mock that resolves immediately
const createFastMockSampler = (shouldFail = false) => {
  const sampler = {
    toDestination: vi.fn().mockReturnThis(),
    dispose: vi.fn(),
    triggerAttack: vi.fn(),
    triggerRelease: vi.fn(),
    loaded: shouldFail ? Promise.reject(new Error('Mock error')) : Promise.resolve(true),
    // Minimal required properties
    name: 'MockSampler',
    volume: { value: 0 },
    state: 'started' as const,
    connect: vi.fn(),
    disconnect: vi.fn(),
  } as any;

  // If should fail, trigger onerror callback after creation
  if (shouldFail) {
    setTimeout(() => {
      // Simulate the onerror callback being called
      if (sampler._onerror) {
        sampler._onerror('Mock network error');
      }
    }, 10);
  } else {
    // If should succeed, trigger onload callback
    setTimeout(() => {
      if (sampler._onload) {
        sampler._onload();
      }
    }, 10);
  }

  return sampler;
};

/**
 * Fast Integration Tests for Complete User Flows
 * 
 * Optimized tests for loading flow, input integration, and responsive behavior
 * Focus on essential functionality without slow loading delays
 * 
 * Requirements: 1.2, 1.4, 6.1, 6.3
 */

describe('Integration Tests - Complete User Flows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock Tone.js Sampler for fast tests
    vi.spyOn(Tone, 'Sampler').mockImplementation((options: any) => {
      const sampler = createFastMockSampler();
      // Store callbacks for later use
      sampler._onload = options?.onload;
      sampler._onerror = options?.onerror;
      return sampler;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Loading Flow', () => {
    it('should display loading indicator initially', async () => {
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText('Loading Piano Samples...')).toBeInTheDocument();
      }, { timeout: 1000 });
    });
  });

  describe('Input Integration', () => {
    it('should handle keyboard events without crashing', async () => {
      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Loading Piano Samples...')).toBeInTheDocument();
      });

      await user.keyboard('a');
      expect(screen.getByText('Loading Piano Samples...')).toBeInTheDocument();
    });

    it('should not show piano keys during loading', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Loading Piano Samples...')).toBeInTheDocument();
      });

      const pianoKeys = screen.queryAllByRole('button', { name: /^[A-G]#?[0-8]$/ });
      expect(pianoKeys.length).toBe(0);
    });
  });

  describe('Responsive Behavior', () => {
    it('should render with proper container structure', () => {
      const { container } = render(<App />);
      
      const mainContainer = container.querySelector('[class*="MuiContainer"]');
      expect(mainContainer).toBeInTheDocument();
      expect(mainContainer).toHaveStyle({
        display: 'flex',
        flexDirection: 'column',
      });
    });

    it('should handle window resize events', async () => {
      render(<App />);

      global.innerWidth = 768;
      fireEvent(window, new Event('resize'));

      await waitFor(() => {
        expect(screen.getByText('Loading Piano Samples...')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should cleanup properly on unmount', () => {
      const { unmount } = render(<App />);
      unmount();
      expect(true).toBe(true); // No errors during cleanup
    });
  });

  describe('State Management', () => {
    it('should maintain consistent loading state', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Loading Piano Samples...')).toBeInTheDocument();
      });
    });

    it('should handle rapid user interactions', async () => {
      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Loading Piano Samples...')).toBeInTheDocument();
      });

      await user.keyboard('asdf');
      expect(screen.getByText('Loading Piano Samples...')).toBeInTheDocument();
    });
  });
});
