import { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Alert, AlertTitle, Button, Typography } from '@mui/material';
import { Refresh as RefreshIcon, VolumeOff as VolumeOffIcon } from '@mui/icons-material';

interface MetronomeErrorBoundaryProps {
  children: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onRetry?: () => void;
}

interface MetronomeErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorType: 'AUDIO_CONTEXT' | 'TRANSPORT' | 'PERMISSIONS' | 'UNKNOWN';
}

/**
 * Error boundary specifically for metronome functionality
 * Provides specialized error handling and recovery for Tone.js and Web Audio API issues
 */
export class MetronomeErrorBoundary extends Component<
  MetronomeErrorBoundaryProps,
  MetronomeErrorBoundaryState
> {
  constructor(props: MetronomeErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorType: 'UNKNOWN'
    };
  }

  static getDerivedStateFromError(error: Error): Partial<MetronomeErrorBoundaryState> {
    // Analyze error to determine type
    let errorType: MetronomeErrorBoundaryState['errorType'] = 'UNKNOWN';
    
    const errorMessage = error.message.toLowerCase();
    
    if (errorMessage.includes('audiocontext') || errorMessage.includes('context')) {
      errorType = 'AUDIO_CONTEXT';
    } else if (errorMessage.includes('transport') || errorMessage.includes('tone')) {
      errorType = 'TRANSPORT';
    } else if (errorMessage.includes('permission') || errorMessage.includes('autoplay')) {
      errorType = 'PERMISSIONS';
    }

    return {
      hasError: true,
      error,
      errorType
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('MetronomeErrorBoundary caught an error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = (): void => {
    // Reset error state
    this.setState({
      hasError: false,
      error: null,
      errorType: 'UNKNOWN'
    });
    
    // Call optional retry handler
    this.props.onRetry?.();
  };

  handleUserInteraction = (): void => {
    // For audio context issues, user interaction is often required
    // This will be handled by the parent component
    this.handleRetry();
  };

  getErrorContent(): ReactNode {
    const { errorType, error } = this.state;

    switch (errorType) {
      case 'AUDIO_CONTEXT':
        return (
          <Alert 
            severity="warning" 
            icon={<VolumeOffIcon />}
            action={
              <Button 
                size="small" 
                onClick={this.handleUserInteraction}
                variant="outlined"
              >
                Enable Audio
              </Button>
            }
          >
            <AlertTitle>Audio System Unavailable</AlertTitle>
            <Typography variant="body2" sx={{ mb: 1 }}>
              The metronome requires audio system access. This might be due to:
            </Typography>
            <Typography variant="body2" component="ul" sx={{ pl: 2, mb: 1 }}>
              <li>Browser autoplay restrictions (click "Enable Audio")</li>
              <li>Audio drivers not available</li>
              <li>Another application using the audio system</li>
            </Typography>
            <Typography variant="body2">
              Click "Enable Audio" and try interacting with the page to activate audio.
            </Typography>
          </Alert>
        );

      case 'TRANSPORT':
        return (
          <Alert 
            severity="error"
            action={
              <Button 
                size="small" 
                onClick={this.handleRetry}
                startIcon={<RefreshIcon />}
              >
                Restart Metronome
              </Button>
            }
          >
            <AlertTitle>Metronome Timing Error</AlertTitle>
            <Typography variant="body2" sx={{ mb: 1 }}>
              The metronome timing system encountered an error. This can happen due to:
            </Typography>
            <Typography variant="body2" component="ul" sx={{ pl: 2, mb: 1 }}>
              <li>High system load affecting audio timing</li>
              <li>Browser tab being backgrounded for too long</li>
              <li>Audio system conflicts</li>
            </Typography>
            <Typography variant="body2">
              Try restarting the metronome or refreshing the page.
            </Typography>
          </Alert>
        );

      case 'PERMISSIONS':
        return (
          <Alert 
            severity="info"
            action={
              <Button 
                size="small" 
                onClick={this.handleUserInteraction}
                variant="outlined"
              >
                Try Again
              </Button>
            }
          >
            <AlertTitle>Audio Permissions Required</AlertTitle>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Modern browsers require user interaction to play audio. To use the metronome:
            </Typography>
            <Typography variant="body2" component="ol" sx={{ pl: 2, mb: 1 }}>
              <li>Click anywhere on the page first</li>
              <li>Then try starting the metronome</li>
              <li>Allow audio if prompted by your browser</li>
            </Typography>
          </Alert>
        );

      default:
        return (
          <Alert 
            severity="error"
            action={
              <Button 
                size="small" 
                onClick={this.handleRetry}
                startIcon={<RefreshIcon />}
              >
                Try Again
              </Button>
            }
          >
            <AlertTitle>Metronome Error</AlertTitle>
            <Typography variant="body2" sx={{ mb: 1 }}>
              An unexpected error occurred with the metronome system.
            </Typography>
            {error && (
              <Typography variant="caption" sx={{ fontFamily: 'monospace', display: 'block', mb: 1 }}>
                {error.message}
              </Typography>
            )}
            <Typography variant="body2">
              The piano will continue to work normally without metronome functionality.
            </Typography>
          </Alert>
        );
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <Box sx={{ p: 2 }}>
          {this.getErrorContent()}
        </Box>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook to check Web Audio API support and provide fallback information
 */
export function useMetronomeSupport() {
  const isSupported = !!(window.AudioContext || (window as any).webkitAudioContext);
  
  const fallbackContent = !isSupported ? (
    <Alert severity="info">
      <AlertTitle>Metronome Unavailable</AlertTitle>
      <Typography variant="body2">
        The metronome requires Web Audio API support which is not available in this browser.
        Please use a modern browser like Chrome, Firefox, or Safari.
      </Typography>
    </Alert>
  ) : null;

  return {
    isSupported,
    fallbackContent
  };
}