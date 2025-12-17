import { useState, useCallback, useRef, useEffect } from 'react';
import { useLoadingState, type UseLoadingStateReturn } from './useLoadingState';

export interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  timeoutMs: number;
  exponentialBackoff: boolean;
}

export interface UseLoadingWithRetryOptions {
  retryConfig?: Partial<RetryConfig>;
  onRetryAttempt?: (attempt: number, maxRetries: number) => void;
  onTimeout?: () => void;
  onMaxRetriesReached?: () => void;
}

export interface UseLoadingWithRetryReturn extends UseLoadingStateReturn {
  retry: () => Promise<void>;
  retryCount: number;
  isRetrying: boolean;
  canRetry: boolean;
  timeoutReached: boolean;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  retryDelay: 1000,
  timeoutMs: 30000,
  exponentialBackoff: true,
};

/**
 * Enhanced loading state hook with retry logic and timeout handling
 * Provides comprehensive error handling for sample loading failures
 */
export function useLoadingWithRetry(
  loadingFunction: () => Promise<void>,
  options: UseLoadingWithRetryOptions = {}
): UseLoadingWithRetryReturn {
  const loadingState = useLoadingState();
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [timeoutReached, setTimeoutReached] = useState(false);
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isLoadingRef = useRef(false);

  const config = { ...DEFAULT_RETRY_CONFIG, ...options.retryConfig };

  // Clear timeouts on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  const executeWithTimeout = useCallback(async (): Promise<void> => {
    return new Promise((resolve, reject) => {
      // Set up timeout
      timeoutRef.current = setTimeout(() => {
        setTimeoutReached(true);
        reject(new Error(`Loading timed out after ${config.timeoutMs}ms`));
      }, config.timeoutMs);

      // Execute loading function
      loadingFunction()
        .then(() => {
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          resolve();
        })
        .catch((error) => {
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          reject(error);
        });
    });
  }, [loadingFunction, config.timeoutMs]);

  const attemptLoad = useCallback(async (): Promise<void> => {
    if (isLoadingRef.current) {
      return;
    }

    isLoadingRef.current = true;
    loadingState.setLoading(true);
    loadingState.clearError();
    setTimeoutReached(false);

    try {
      await executeWithTimeout();
      
      // Success - reset retry count and mark as loaded
      setRetryCount(0);
      setIsRetrying(false);
      loadingState.setLoaded(true);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Check if we should retry
      if (retryCount < config.maxRetries && !timeoutReached) {
        setIsRetrying(true);
        const currentRetry = retryCount + 1;
        setRetryCount(currentRetry);
        
        // Calculate delay with optional exponential backoff
        const delay = config.exponentialBackoff 
          ? config.retryDelay * Math.pow(2, currentRetry - 1)
          : config.retryDelay;

        // Notify about retry attempt
        options.onRetryAttempt?.(currentRetry, config.maxRetries);
        
        loadingState.setError(`Loading failed, retrying in ${Math.ceil(delay / 1000)}s... (${currentRetry}/${config.maxRetries})`);
        
        // Schedule retry
        retryTimeoutRef.current = setTimeout(() => {
          setIsRetrying(false);
          isLoadingRef.current = false;
          attemptLoad();
        }, delay);
        
      } else {
        // Max retries reached or timeout
        setIsRetrying(false);
        
        if (timeoutReached) {
          options.onTimeout?.();
          loadingState.setError('Loading timed out. Please check your internet connection and try again.');
        } else {
          options.onMaxRetriesReached?.();
          loadingState.setError(`Loading failed after ${config.maxRetries} attempts: ${errorMessage}`);
        }
      }
    } finally {
      if (!isRetrying) {
        isLoadingRef.current = false;
      }
    }
  }, [
    loadingFunction,
    loadingState,
    retryCount,
    config.maxRetries,
    config.retryDelay,
    config.exponentialBackoff,
    timeoutReached,
    isRetrying,
    executeWithTimeout,
    options
  ]);

  const retry = useCallback(async (): Promise<void> => {
    // Reset state for manual retry
    setRetryCount(0);
    setIsRetrying(false);
    setTimeoutReached(false);
    loadingState.reset();
    
    // Clear any existing timeouts
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    
    isLoadingRef.current = false;
    await attemptLoad();
  }, [attemptLoad, loadingState]);

  const canRetry = !loadingState.isLoading && !isRetrying && (loadingState.hasError || timeoutReached);

  return {
    ...loadingState,
    retry,
    retryCount,
    isRetrying,
    canRetry,
    timeoutReached,
    // Override the loading state to include retry state
    isLoading: loadingState.isLoading || isRetrying,
  };
}