import { renderHook, act } from '@testing-library/react';
import { vi } from 'vitest';
import { useLoadingState } from '../hooks/useLoadingState';
import { useLoadingWithRetry } from '../hooks/useLoadingWithRetry';

describe('Loading State Transitions', () => {
  describe('useLoadingState', () => {
    describe('Initial loading state display', () => {
      it('should initialize with default loading state', () => {
        const { result } = renderHook(() => useLoadingState());

        expect(result.current.isLoading).toBe(false);
        expect(result.current.isLoaded).toBe(false);
        expect(result.current.progress).toBe(0);
        expect(result.current.error).toBe(null);
        expect(result.current.hasError).toBe(false);
      });

      it('should initialize with custom initial state', () => {
        const { result } = renderHook(() =>
          useLoadingState({
            isLoading: true,
            progress: 50,
          })
        );

        expect(result.current.isLoading).toBe(true);
        expect(result.current.progress).toBe(50);
        expect(result.current.isLoaded).toBe(false);
      });

      it('should set loading state when setLoading is called', () => {
        const { result } = renderHook(() => useLoadingState());

        act(() => {
          result.current.setLoading(true);
        });

        expect(result.current.isLoading).toBe(true);
        expect(result.current.isLoaded).toBe(false);
        expect(result.current.error).toBe(null);
      });

      it('should clear error when starting to load', () => {
        const { result } = renderHook(() =>
          useLoadingState({ error: 'Previous error' })
        );

        act(() => {
          result.current.setLoading(true);
        });

        expect(result.current.error).toBe(null);
        expect(result.current.hasError).toBe(false);
      });
    });

    describe('Successful loading completion', () => {
      it('should transition to loaded state when setLoaded is called', () => {
        const { result } = renderHook(() =>
          useLoadingState({ isLoading: true })
        );

        act(() => {
          result.current.setLoaded(true);
        });

        expect(result.current.isLoaded).toBe(true);
        expect(result.current.isLoading).toBe(false);
        expect(result.current.progress).toBe(100);
        expect(result.current.error).toBe(null);
      });

      it('should auto-complete when progress reaches 100', () => {
        const { result } = renderHook(() => useLoadingState());

        act(() => {
          result.current.setProgress(100);
        });

        expect(result.current.progress).toBe(100);
        expect(result.current.isLoading).toBe(false);
        expect(result.current.isLoaded).toBe(true);
      });

      it('should set loading state when progress is between 0 and 100', () => {
        const { result } = renderHook(() => useLoadingState());

        act(() => {
          result.current.setProgress(50);
        });

        expect(result.current.progress).toBe(50);
        expect(result.current.isLoading).toBe(true);
        expect(result.current.isLoaded).toBe(false);
      });

      it('should clamp progress values to 0-100 range', () => {
        const { result } = renderHook(() => useLoadingState());

        act(() => {
          result.current.setProgress(150);
        });
        expect(result.current.progress).toBe(100);

        act(() => {
          result.current.setProgress(-10);
        });
        expect(result.current.progress).toBe(0);
      });
    });

    describe('Error state handling', () => {
      it('should set error state when setError is called', () => {
        const { result } = renderHook(() =>
          useLoadingState({ isLoading: true })
        );

        act(() => {
          result.current.setError('Loading failed');
        });

        expect(result.current.error).toBe('Loading failed');
        expect(result.current.hasError).toBe(true);
        expect(result.current.isLoading).toBe(false);
        expect(result.current.isLoaded).toBe(false);
      });

      it('should clear error when clearError is called', () => {
        const { result } = renderHook(() =>
          useLoadingState({ error: 'Some error' })
        );

        act(() => {
          result.current.clearError();
        });

        expect(result.current.error).toBe(null);
        expect(result.current.hasError).toBe(false);
      });

      it('should reset all state when reset is called', () => {
        const { result } = renderHook(() =>
          useLoadingState({
            isLoading: true,
            isLoaded: true,
            progress: 75,
            error: 'Some error',
          })
        );

        act(() => {
          result.current.reset();
        });

        expect(result.current.isLoading).toBe(false);
        expect(result.current.isLoaded).toBe(false);
        expect(result.current.progress).toBe(0);
        expect(result.current.error).toBe(null);
        expect(result.current.hasError).toBe(false);
      });
    });
  });

  describe('useLoadingWithRetry', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.runOnlyPendingTimers();
      vi.useRealTimers();
    });

    describe('Successful loading', () => {
      it('should complete loading successfully on first attempt', async () => {
        const mockLoadingFn = vi.fn().mockResolvedValue(undefined);
        const { result } = renderHook(() =>
          useLoadingWithRetry(mockLoadingFn)
        );

        await act(async () => {
          await result.current.retry();
        });

        expect(result.current.isLoaded).toBe(true);
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBe(null);
        expect(result.current.retryCount).toBe(0);
        expect(mockLoadingFn).toHaveBeenCalledTimes(1);
      });
    });

    describe('Retry functionality', () => {
      it('should retry on failure and eventually succeed', async () => {
        let attemptCount = 0;
        const mockLoadingFn = vi.fn().mockImplementation(() => {
          attemptCount++;
          if (attemptCount < 2) {
            return Promise.reject(new Error('Network error'));
          }
          return Promise.resolve();
        });

        const { result } = renderHook(() =>
          useLoadingWithRetry(mockLoadingFn, {
            retryConfig: { retryDelay: 1000, maxRetries: 3 },
          })
        );

        // Start initial load
        act(() => {
          result.current.retry();
        });

        // Wait for first failure
        await act(async () => {
          await vi.advanceTimersByTimeAsync(100);
        });

        expect(result.current.isRetrying).toBe(true);
        expect(result.current.retryCount).toBe(1);

        // Wait for retry delay
        await act(async () => {
          await vi.advanceTimersByTimeAsync(1000);
        });

        // Wait for second attempt to complete
        await act(async () => {
          await vi.advanceTimersByTimeAsync(100);
        });

        expect(result.current.isLoaded).toBe(true);
        expect(result.current.retryCount).toBe(0);
        expect(mockLoadingFn).toHaveBeenCalledTimes(2);
      });

      it('should increment retry count on failures', async () => {
        const mockLoadingFn = vi
          .fn()
          .mockRejectedValue(new Error('Network error'));

        const { result } = renderHook(() =>
          useLoadingWithRetry(mockLoadingFn, {
            retryConfig: {
              retryDelay: 100,
              maxRetries: 3,
              exponentialBackoff: true,
            },
          })
        );

        act(() => {
          result.current.retry();
        });

        // Wait for first failure
        await act(async () => {
          await vi.advanceTimersByTimeAsync(100);
        });
        
        expect(result.current.retryCount).toBeGreaterThan(0);
        expect(result.current.isRetrying).toBe(true);
      });

      it('should eventually fail after retries are exhausted', async () => {
        const mockLoadingFn = vi
          .fn()
          .mockRejectedValue(new Error('Network error'));

        const { result } = renderHook(() =>
          useLoadingWithRetry(mockLoadingFn, {
            retryConfig: { retryDelay: 50, maxRetries: 1 },
          })
        );

        act(() => {
          result.current.retry();
        });

        // Wait long enough for all retries to complete
        await act(async () => {
          await vi.advanceTimersByTimeAsync(5000);
        });

        // Should have error and not be loaded after retries exhausted
        expect(result.current.hasError).toBe(true);
        expect(result.current.isLoaded).toBe(false);
        expect(mockLoadingFn).toHaveBeenCalled();
      });

      it('should allow manual retry after failures', async () => {
        let attemptCount = 0;
        const mockLoadingFn = vi.fn().mockImplementation(() => {
          attemptCount++;
          if (attemptCount === 1) {
            return Promise.reject(new Error('Network error'));
          }
          return Promise.resolve();
        });

        const { result } = renderHook(() =>
          useLoadingWithRetry(mockLoadingFn, {
            retryConfig: { retryDelay: 50, maxRetries: 0 },
          })
        );

        // Initial attempt that fails
        act(() => {
          result.current.retry();
        });

        await act(async () => {
          await vi.advanceTimersByTimeAsync(100);
        });

        expect(result.current.hasError).toBe(true);
        expect(result.current.canRetry).toBe(true);

        // Manual retry that succeeds
        await act(async () => {
          await result.current.retry();
        });

        expect(result.current.isLoaded).toBe(true);
        expect(result.current.retryCount).toBe(0);
      });
    });

    describe('Timeout handling', () => {
      it('should timeout if loading takes too long', async () => {
        const mockLoadingFn = vi.fn().mockImplementation(
          () =>
            new Promise((resolve) => {
              setTimeout(resolve, 5000); // Reduced from 60 seconds to 5 seconds
            })
        );

        const { result } = renderHook(() =>
          useLoadingWithRetry(mockLoadingFn, {
            retryConfig: { timeoutMs: 1000, maxRetries: 0 },
          })
        );

        act(() => {
          result.current.retry();
        });

        // Advance past timeout
        await act(async () => {
          await vi.advanceTimersByTimeAsync(1100);
        });

        expect(result.current.timeoutReached).toBe(true);
        expect(result.current.hasError).toBe(true);
        expect(result.current.error).toContain('timed out');
      });
    });
  });
});
