import { useState, useEffect, useRef, useCallback } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Container from '@mui/material/Container';
import { Fab, Tooltip, Box, Typography } from '@mui/material';
import { BugReport as BugIcon } from '@mui/icons-material';
import { PianoKeyboard, LoadingIndicator, ErrorBoundary, DebugPanel, ControlPanel, PanelToggle } from './components';
import { AudioEngine } from './utils';
import { useKeyboardInput, useLoadingWithRetry, useControlPanel } from './hooks';
import { initializeKeyboardMapping } from './utils/keyboardLayout';
import { debugLogger } from './utils/debugLogger';
import { debugConfig } from './config/debugConfig';
import './utils/performanceMonitor'; // Initialize performance monitoring

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
  const [debugPanelOpen, setDebugPanelOpen] = useState(false);
  const audioEngineRef = useRef<AudioEngine | null>(null);

  // Initialize control panel state
  const controlPanelState = useControlPanel();
  
  // Destructure for better dependency tracking
  const { keyMarkingEnabledRef, markedKeys, toggleMarkedKey } = controlPanelState;

  // Initialize debug logging
  useEffect(() => {
    debugLogger.info('App: Starting application');
    debugLogger.info('App: Environment info', {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      online: navigator.onLine,
      connection: (navigator as any).connection?.effectiveType || 'unknown'
    });

    debugLogger.info('App: Debug configuration', debugConfig);

    // Auto-open debug panel if configured
    if (debugConfig.autoOpen) {
      setDebugPanelOpen(true);
      debugLogger.info('App: Auto-opening debug panel');
    }

    // Add keyboard shortcut for debug panel (Ctrl/Cmd + D) if enabled
    if (debugConfig.showKeyboardShortcut) {
      const handleKeyDown = (event: KeyboardEvent) => {
        if ((event.ctrlKey || event.metaKey) && event.key === 'd') {
          event.preventDefault();
          setDebugPanelOpen(true);
          debugLogger.info('App: Debug panel opened via keyboard shortcut');
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, []);

  // Create loading function for the retry hook
  const initializeAudio = useCallback(async () => {
    debugLogger.info('App: Starting audio initialization');
    const audioEngine = new AudioEngine();
    audioEngineRef.current = audioEngine;
    
    // Start loading samples
    await audioEngine.initialize();
    
    // Check for errors after initialization
    if (audioEngine.hasError) {
      debugLogger.error('App: Audio engine has error after initialization', {
        error: audioEngine.getErrorMessage()
      });
      throw new Error(audioEngine.getErrorMessage());
    }
    
    // Initialize key marking manager after audio engine is ready
    // Note: Key marking is now handled directly through React state
    debugLogger.info('App: Audio initialization completed successfully');
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
      debugLogger.warn('App: Retry attempt', { attempt, maxRetries });
    },
    onTimeout: () => {
      debugLogger.error('App: Audio loading timed out');
    },
    onMaxRetriesReached: () => {
      debugLogger.error('App: Max retries reached for audio loading');
    },
  });

  // Initialize keyboard mapping and audio engine on mount
  useEffect(() => {
    const attemptLoad = async () => {
      try {
        debugLogger.info('App: Starting initialization sequence');
        // Initialize keyboard mapping first
        await initializeKeyboardMapping();
        debugLogger.info('App: Keyboard mapping initialized');
        // Then initialize audio engine
        await loadingState.retry();
      } catch (error) {
        debugLogger.error('App: Failed to initialize', { error });
      }
    };

    attemptLoad();

    // Cleanup on unmount
    return () => {
      debugLogger.info('App: Cleaning up on unmount');
      if (audioEngineRef.current) {
        audioEngineRef.current.dispose();
      }
      // Note: KeyMarkingManager no longer used - key marking handled by React state
    };
  }, []);

  // Handle key press events (both mouse and keyboard)
  const handleKeyPress = useCallback((note: string) => {
    if (audioEngineRef.current && audioEngineRef.current.isReady) {
      // Always play the note for immediate audio feedback
      audioEngineRef.current.playNote(note);
      
      // Check if key marking mode is enabled using the ref for synchronous access
      if (keyMarkingEnabledRef.current) {
        // In marking mode, also toggle the key in React state
        toggleMarkedKey(note);
      }
      
      setPressedKeys(prev => new Set([...prev, note]));
    }
  }, [keyMarkingEnabledRef, toggleMarkedKey]);

  // Handle key release events (both mouse and keyboard)
  const handleKeyRelease = (note: string) => {
    if (audioEngineRef.current) {
      // Always release the note to ensure it can be played again
      audioEngineRef.current.releaseNote(note);
      
      setPressedKeys(prev => {
        const newSet = new Set(prev);
        newSet.delete(note);
        return newSet;
      });
    }
  };

  // Handle first user interaction to resume audio context
  const handleFirstInteraction = useCallback(() => {
    if (audioEngineRef.current && loadingState.isLoaded) {
      debugLogger.info('App: First user interaction detected, ensuring audio context is ready');
      // The playNote method will handle resuming the context if needed
    }
  }, [loadingState.isLoaded]);

  // Handle playing all marked keys simultaneously
  const handlePlayMarkedKeys = useCallback(() => {
    if (audioEngineRef.current && audioEngineRef.current.isReady && markedKeys.size > 0) {
      // Play all marked keys simultaneously with default velocity
      const velocity = 0.8;
      markedKeys.forEach(note => {
        try {
          audioEngineRef.current!.playNote(note, velocity);
          // Release the note after a short duration to allow replaying
          setTimeout(() => {
            if (audioEngineRef.current) {
              audioEngineRef.current.releaseNote(note);
            }
          }, 100); // Release after 100ms to allow immediate replaying
        } catch (error) {
          console.error('Failed to play marked key:', note, error);
        }
      });
    }
  }, [markedKeys]);

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
        onClick={handleFirstInteraction}
        sx={{
          height: '100vh',
          width: '100vw', // Use full viewport width
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          overflow: 'hidden', // Prevent scrolling
          position: 'relative',
          // Adjust for control panel when open
          marginRight: controlPanelState.isOpen ? { xs: 0, md: '320px' } : 0,
          transition: theme.transitions.create(['margin'], {
            duration: theme.transitions.duration.leavingScreen,
          }),
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

        {/* Show audio context suspended message */}
        {loadingState.isLoaded && !loadingState.hasError && audioEngineRef.current?.error?.type === 'CONTEXT_SUSPENDED' && (
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              bgcolor: 'background.paper',
              p: 3,
              borderRadius: 2,
              boxShadow: 3
            }}
          >
            <Typography variant="h6" gutterBottom>
              Audio Ready
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Click anywhere to enable sound
            </Typography>
          </Box>
        )}
        
        {/* Show piano keyboard when loaded and no error */}
        {loadingState.isLoaded && !loadingState.hasError && (
          <ErrorBoundary>
            <PianoKeyboard
              onKeyPress={(note) => {
                handleFirstInteraction();
                handleKeyPress(note);
              }}
              onKeyRelease={handleKeyRelease}
              pressedKeys={pressedKeys}
              markedKeys={markedKeys}
              labelsVisible={controlPanelState.labelsVisible}
            />
          </ErrorBoundary>
        )}

        {/* Control Panel Toggle Button */}
        {loadingState.isLoaded && !loadingState.hasError && (
          <PanelToggle
            onClick={controlPanelState.togglePanel}
            isOpen={controlPanelState.isOpen}
          />
        )}

        {/* Control Panel */}
        <ControlPanel 
          controlPanelState={controlPanelState} 
          onPlayMarkedKeys={handlePlayMarkedKeys}
        />

        {/* Debug Panel FAB - only show if enabled in config */}
        {debugConfig.enabled && debugConfig.showFab && (
          <Fab
            color="secondary"
            size="small"
            onClick={() => setDebugPanelOpen(true)}
            sx={{
              position: 'fixed',
              bottom: 16,
              right: 16,
              zIndex: 1000
            }}
          >
            <Tooltip title="Open Debug Panel">
              <BugIcon />
            </Tooltip>
          </Fab>
        )}

        {/* Debug Panel - only render if enabled */}
        {debugConfig.enabled && (
          <DebugPanel
            open={debugPanelOpen}
            onClose={() => setDebugPanelOpen(false)}
          />
        )}
      </Container>
    </ThemeProvider>
  );
}

export default App;