import { useState, useCallback } from 'react';

export interface LoadingState {
  isLoading: boolean;
  isLoaded: boolean;
  progress: number;
  error: string | null;
  hasError: boolean;
}

export interface LoadingActions {
  setLoading: (loading: boolean) => void;
  setProgress: (progress: number) => void;
  setLoaded: (loaded: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  reset: () => void;
}

export interface UseLoadingStateReturn extends LoadingState, LoadingActions {}

/**
 * Hook for managing loading state with progress tracking and error handling
 * Provides centralized loading state management for sample loading and other async operations
 */
export function useLoadingState(initialState?: Partial<LoadingState>): UseLoadingStateReturn {
  const [isLoading, setIsLoading] = useState(initialState?.isLoading ?? false);
  const [isLoaded, setIsLoaded] = useState(initialState?.isLoaded ?? false);
  const [progress, setProgress] = useState(initialState?.progress ?? 0);
  const [error, setError] = useState<string | null>(initialState?.error ?? null);

  const setLoading = useCallback((loading: boolean) => {
    setIsLoading(loading);
    if (loading) {
      setIsLoaded(false);
      setError(null);
    }
  }, []);

  const setProgressValue = useCallback((progressValue: number) => {
    // Clamp progress between 0 and 100
    const clampedProgress = Math.max(0, Math.min(100, progressValue));
    setProgress(clampedProgress);
    
    // Auto-set loading state based on progress
    if (clampedProgress > 0 && clampedProgress < 100) {
      setIsLoading(true);
      setIsLoaded(false);
    } else if (clampedProgress === 100) {
      setIsLoading(false);
      setIsLoaded(true);
    }
  }, []);

  const setLoaded = useCallback((loaded: boolean) => {
    setIsLoaded(loaded);
    if (loaded) {
      setIsLoading(false);
      setProgress(100);
      setError(null);
    }
  }, []);

  const setErrorValue = useCallback((errorValue: string | null) => {
    setError(errorValue);
    if (errorValue) {
      setIsLoading(false);
      setIsLoaded(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const reset = useCallback(() => {
    setIsLoading(false);
    setIsLoaded(false);
    setProgress(0);
    setError(null);
  }, []);

  const hasError = error !== null;

  return {
    // State
    isLoading,
    isLoaded,
    progress,
    error,
    hasError,
    // Actions
    setLoading,
    setProgress: setProgressValue,
    setLoaded,
    setError: setErrorValue,
    clearError,
    reset,
  };
}