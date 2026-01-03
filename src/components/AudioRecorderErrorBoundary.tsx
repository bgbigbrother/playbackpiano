import { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Alert, AlertTitle, Button, Typography } from '@mui/material';
import { Refresh as RefreshIcon, MicOff as MicOffIcon } from '@mui/icons-material';
import { AudioRecorder } from '../utils/AudioRecorder';

interface AudioRecorderErrorBoundaryProps {
  children: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onRetry?: () => void;
}

interface AudioRecorderErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorType: 'PERMISSION' | 'UNSUPPORTED' | 'RECORDING' | 'UNKNOWN';
}

/**
 * Error boundary specifically for audio recording functionality
 * Provides specialized error handling and recovery for MediaRecorder API issues
 */
export class AudioRecorderErrorBoundary extends Component<
  AudioRecorderErrorBoundaryProps,
  AudioRecorderErrorBoundaryState
> {
  constructor(props: AudioRecorderErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorType: 'UNKNOWN'
    };
  }

  static getDerivedStateFromError(error: Error): Partial<AudioRecorderErrorBoundaryState> {
    // Analyze error to determine type
    let errorType: AudioRecorderErrorBoundaryState['errorType'] = 'UNKNOWN';
    
    const errorMessage = error.message.toLowerCase();
    
    if (errorMessage.includes('permission') || errorMessage.includes('denied')) {
      errorType = 'PERMISSION';
    } else if (errorMessage.includes('not supported') || errorMessage.includes('unavailable')) {
      errorType = 'UNSUPPORTED';
    } else if (errorMessage.includes('recording') || errorMessage.includes('mediarecorder')) {
      errorType = 'RECORDING';
    }

    return {
      hasError: true,
      error,
      errorType
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('AudioRecorderErrorBoundary caught an error:', error, errorInfo);
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

  handlePermissionRequest = async (): Promise<void> => {
    try {
      // Request microphone permission explicitly
      await navigator.mediaDevices.getUserMedia({ audio: true });
      this.handleRetry();
    } catch (error) {
      console.error('Failed to request microphone permission:', error);
      // Error state will remain, showing permission instructions
    }
  };

  getErrorContent(): ReactNode {
    const { errorType, error } = this.state;

    switch (errorType) {
      case 'PERMISSION':
        return (
          <Alert 
            severity="warning" 
            icon={<MicOffIcon />}
            action={
              <Box sx={{ display: 'flex', gap: 1, flexDirection: { xs: 'column', sm: 'row' } }}>
                <Button 
                  size="small" 
                  onClick={this.handlePermissionRequest}
                  variant="outlined"
                >
                  Request Permission
                </Button>
                <Button 
                  size="small" 
                  onClick={this.handleRetry}
                  startIcon={<RefreshIcon />}
                >
                  Retry
                </Button>
              </Box>
            }
          >
            <AlertTitle>Microphone Access Required</AlertTitle>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Audio recording requires microphone access. Please:
            </Typography>
            <Typography variant="body2" component="ol" sx={{ pl: 2, mb: 0 }}>
              <li>Click "Request Permission" to allow microphone access</li>
              <li>Or check your browser's address bar for permission settings</li>
              <li>Refresh the page if needed</li>
            </Typography>
          </Alert>
        );

      case 'UNSUPPORTED':
        return (
          <Alert 
            severity="error"
            action={
              <Button 
                size="small" 
                onClick={this.handleRetry}
                startIcon={<RefreshIcon />}
              >
                Retry
              </Button>
            }
          >
            <AlertTitle>Audio Recording Not Supported</AlertTitle>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Your browser doesn't support audio recording. Try:
            </Typography>
            <Typography variant="body2" component="ul" sx={{ pl: 2, mb: 0 }}>
              <li>Using Chrome, Firefox, or Safari</li>
              <li>Updating your browser to the latest version</li>
              <li>Enabling HTTPS if using a custom domain</li>
            </Typography>
          </Alert>
        );

      case 'RECORDING':
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
            <AlertTitle>Recording Error</AlertTitle>
            <Typography variant="body2">
              An error occurred during recording. This might be due to:
            </Typography>
            <Typography variant="body2" component="ul" sx={{ pl: 2, mb: 1 }}>
              <li>Microphone being used by another application</li>
              <li>Audio driver issues</li>
              <li>Insufficient storage space</li>
            </Typography>
            <Typography variant="body2">
              Please try again or restart your browser.
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
            <AlertTitle>Audio Recording Error</AlertTitle>
            <Typography variant="body2" sx={{ mb: 1 }}>
              An unexpected error occurred with audio recording.
            </Typography>
            {error && (
              <Typography variant="caption" sx={{ fontFamily: 'monospace', display: 'block' }}>
                {error.message}
              </Typography>
            )}
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
 * Hook to check if audio recording is supported and provide fallback UI
 */
export function useAudioRecordingSupport() {
  const isSupported = AudioRecorder.isSupported();
  
  const fallbackContent = !isSupported ? (
    <Alert severity="info">
      <AlertTitle>Audio Recording Unavailable</AlertTitle>
      <Typography variant="body2">
        Audio recording is not available in this browser or environment.
        The piano will work normally without recording functionality.
      </Typography>
    </Alert>
  ) : null;

  return {
    isSupported,
    fallbackContent
  };
}