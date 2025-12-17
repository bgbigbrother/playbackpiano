import { useState, useEffect, useRef, useCallback } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Container from '@mui/material/Container';
import { PianoKeyboard, LoadingIndicator, ErrorBoundary } from './components';
import { AudioEngine } from './utils/AudioEngine';
import { useKeyboardInput, useLoadingWithRetry } from './hooks';
import { initializeKeyboardMapping } from './utils/keyboardLayout';

const theme = createTheme({
  palette: {
    mode: 'light',
  },
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 900,
      lg: 1200,
      xl: 1536,
    },
  },
});

function App() {
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());
  const audioEngineRef = useRef<AudioEngine | null>(null);

  // Create loading function for the retry hook
  const initializeAudio = useCallback(async () => {
    const audioEngine = new AudioEngine();
    audioEngineRef.current = audioEngine;
    
    // Start loading samples
    await audioEngine.initialize();
    
    // Check for errors after initialization
    if (audioEngine.hasError) {
      throw new Error(audioEngine.getErrorMessage());
    }
  }, []);

  // Use loading with retry hook for comprehensive error handling
  const loadingState = useLoadingWithRetry(initializeAudio, {
    retryConfig: {
      maxRetries: 3,
      retryDelay: 1000, // Shorter delay for tests
      timeoutMs: 5000, // Shorter timeout for tests
      exponentialBackoff: true,
    },
    onRetryAttempt: (attempt, maxRetries) => {
      console.log(`Retry attempt ${attempt}/${maxRetries}`);
    },
    onTimeout: () => {
      console.error('Audio loading timed out');
    },
    onMaxRetriesReached: () => {
      console.error('Max retries reached for audio loading');
    },
  });

  // Initialize keyboard mapping and audio engine on mount
  useEffect(() => {
    const attemptLoad = async () => {
      try {
        // Initialize keyboard mapping first
        await initializeKeyboardMapping();
        // Then initialize audio engine
        await loadingState.retry();
      } catch (error) {
        console.error('Failed to initialize:', error);
      }
    };

    attemptLoad();

    // Cleanup on unmount
    return () => {
      if (audioEngineRef.current) {
        audioEngineRef.current.dispose();
      }
    };
  }, []);

  // Handle key press events (both mouse and keyboard)
  const handleKeyPress = (note: string) => {
    if (audioEngineRef.current && audioEngineRef.current.isReady) {
      audioEngineRef.current.playNote(note);
      setPressedKeys(prev => new Set([...prev, note]));
    }
  };

  // Handle key release events (both mouse and keyboard)
  const handleKeyRelease = (note: string) => {
    if (audioEngineRef.current) {
      audioEngineRef.current.releaseNote(note);
      setPressedKeys(prev => {
        const newSet = new Set(prev);
        newSet.delete(note);
        return newSet;
      });
    }
  };

  // Set up keyboard input handling
  useKeyboardInput({
    onKeyPress: handleKeyPress,
    onKeyRelease: handleKeyRelease,
    enabled: loadingState.isLoaded && !loadingState.hasError
  });

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container 
        maxWidth={false} 
        disableGutters
        sx={{
          height: '100vh',
          width: '100vw', // Use full viewport width
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          overflow: 'hidden', // Prevent scrolling
          position: 'relative',
          // Mobile-specific optimizations
          touchAction: 'manipulation', // Optimize for touch devices
          userSelect: 'none', // Prevent text selection on mobile
          WebkitTouchCallout: 'none', // Disable iOS callout
          WebkitUserSelect: 'none', // Disable iOS text selection
          // Ensure full screen on mobile browsers
          minHeight: ['100vh', '100dvh'], // Use dynamic viewport height when supported, fallback to 100vh
        }}
      >
        {/* Show loading indicator when loading or has error */}
        {(loadingState.isLoading || loadingState.hasError) && (
          <LoadingIndicator
            progress={loadingState.progress}
            isLoading={loadingState.isLoading}
            error={loadingState.error}
            onRetry={loadingState.canRetry ? loadingState.retry : undefined}
            showProgress={true}
            variant="linear"
          />
        )}
        
        {/* Show piano keyboard when loaded and no error */}
        {loadingState.isLoaded && !loadingState.hasError && (
          <ErrorBoundary>
            <PianoKeyboard
              onKeyPress={handleKeyPress}
              onKeyRelease={handleKeyRelease}
              pressedKeys={pressedKeys}
            />
          </ErrorBoundary>
        )}
      </Container>
    </ThemeProvider>
  );
}

export default App;