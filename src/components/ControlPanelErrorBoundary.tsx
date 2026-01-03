import { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Alert, AlertTitle, Button, Typography, Collapse } from '@mui/material';
import { 
  Refresh as RefreshIcon, 
  ExpandMore as ExpandMoreIcon,
  Settings as SettingsIcon 
} from '@mui/icons-material';
import { useState } from 'react';

interface ControlPanelErrorBoundaryProps {
  children: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onRetry?: () => void;
  featureName?: string;
}

interface ControlPanelErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorType: 'STORAGE' | 'COMPONENT' | 'SETTINGS' | 'UNKNOWN';
}

/**
 * General error boundary for control panel features
 * Provides graceful degradation and recovery options for various control panel errors
 */
export class ControlPanelErrorBoundary extends Component<
  ControlPanelErrorBoundaryProps,
  ControlPanelErrorBoundaryState
> {
  constructor(props: ControlPanelErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorType: 'UNKNOWN'
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ControlPanelErrorBoundaryState> {
    // Analyze error to determine type
    let errorType: ControlPanelErrorBoundaryState['errorType'] = 'UNKNOWN';
    
    const errorMessage = error.message.toLowerCase();
    
    if (errorMessage.includes('localstorage') || errorMessage.includes('storage') || errorMessage.includes('quota')) {
      errorType = 'STORAGE';
    } else if (errorMessage.includes('settings') || errorMessage.includes('config')) {
      errorType = 'SETTINGS';
    } else if (errorMessage.includes('component') || errorMessage.includes('render')) {
      errorType = 'COMPONENT';
    }

    return {
      hasError: true,
      error,
      errorType
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ControlPanelErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      errorInfo
    });
    
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = (): void => {
    // Reset error state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorType: 'UNKNOWN'
    });
    
    // Call optional retry handler
    this.props.onRetry?.();
  };

  handleClearStorage = (): void => {
    try {
      // Clear localStorage to resolve storage-related issues
      localStorage.removeItem('piano-control-panel-settings');
      localStorage.removeItem('piano-settings');
      
      // Also clear any other piano-related storage
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('piano-') || key.startsWith('control-panel-')) {
          localStorage.removeItem(key);
        }
      });
      
      this.handleRetry();
    } catch (error) {
      console.error('Failed to clear storage:', error);
      // If clearing storage fails, just retry anyway
      this.handleRetry();
    }
  };

  getErrorContent(): ReactNode {
    const { errorType, error } = this.state;
    const featureName = this.props.featureName || 'Control Panel';

    switch (errorType) {
      case 'STORAGE':
        return (
          <Alert 
            severity="warning" 
            icon={<SettingsIcon />}
            action={
              <Box sx={{ display: 'flex', gap: 1, flexDirection: { xs: 'column', sm: 'row' } }}>
                <Button 
                  size="small" 
                  onClick={this.handleClearStorage}
                  variant="outlined"
                >
                  Clear Settings
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
            <AlertTitle>Settings Storage Error</AlertTitle>
            <Typography variant="body2" sx={{ mb: 1 }}>
              There was an issue with saving or loading your settings. This might be due to:
            </Typography>
            <Typography variant="body2" component="ul" sx={{ pl: 2, mb: 1 }}>
              <li>Browser storage quota exceeded</li>
              <li>Private browsing mode restrictions</li>
              <li>Corrupted settings data</li>
            </Typography>
            <Typography variant="body2">
              Click "Clear Settings" to reset to defaults, or "Retry" to try again.
            </Typography>
          </Alert>
        );

      case 'SETTINGS':
        return (
          <Alert 
            severity="error"
            action={
              <Box sx={{ display: 'flex', gap: 1, flexDirection: { xs: 'column', sm: 'row' } }}>
                <Button 
                  size="small" 
                  onClick={this.handleClearStorage}
                  variant="outlined"
                >
                  Reset Settings
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
            <AlertTitle>Configuration Error</AlertTitle>
            <Typography variant="body2" sx={{ mb: 1 }}>
              The {featureName} configuration is invalid or corrupted.
            </Typography>
            <Typography variant="body2">
              Click "Reset Settings" to restore default configuration.
            </Typography>
          </Alert>
        );

      case 'COMPONENT':
        return (
          <Alert 
            severity="error"
            action={
              <Button 
                size="small" 
                onClick={this.handleRetry}
                startIcon={<RefreshIcon />}
              >
                Reload Feature
              </Button>
            }
          >
            <AlertTitle>{featureName} Error</AlertTitle>
            <Typography variant="body2" sx={{ mb: 1 }}>
              The {featureName} component encountered an error and couldn't render properly.
            </Typography>
            <Typography variant="body2">
              The piano will continue to work normally. Try reloading this feature.
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
            <AlertTitle>{featureName} Error</AlertTitle>
            <Typography variant="body2" sx={{ mb: 1 }}>
              An unexpected error occurred in the {featureName}.
            </Typography>
            <Typography variant="body2">
              The piano will continue to work normally without this feature.
            </Typography>
            <ErrorDetails error={error} />
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
 * Component to show expandable error details for debugging
 */
function ErrorDetails({ error }: { error: Error | null }) {
  const [expanded, setExpanded] = useState(false);

  if (!error) return null;

  return (
    <Box sx={{ mt: 1 }}>
      <Button
        size="small"
        onClick={() => setExpanded(!expanded)}
        endIcon={<ExpandMoreIcon sx={{ transform: expanded ? 'rotate(180deg)' : 'none' }} />}
        sx={{ p: 0, minWidth: 'auto', textTransform: 'none' }}
      >
        <Typography variant="caption">
          Show technical details
        </Typography>
      </Button>
      <Collapse in={expanded}>
        <Box
          sx={{
            mt: 1,
            p: 1,
            backgroundColor: 'grey.100',
            borderRadius: 1,
            maxHeight: 150,
            overflow: 'auto'
          }}
        >
          <Typography variant="caption" component="pre" sx={{ margin: 0, whiteSpace: 'pre-wrap' }}>
            {error.toString()}
            {error.stack && `\n\nStack trace:\n${error.stack}`}
          </Typography>
        </Box>
      </Collapse>
    </Box>
  );
}

/**
 * Hook to provide graceful degradation for unsupported features
 */
export function useFeatureSupport(featureName: string, checkSupport: () => boolean) {
  const isSupported = checkSupport();
  
  const fallbackContent = !isSupported ? (
    <Alert severity="info">
      <AlertTitle>{featureName} Unavailable</AlertTitle>
      <Typography variant="body2">
        {featureName} is not supported in this browser or environment.
        The piano will work normally without this feature.
      </Typography>
    </Alert>
  ) : null;

  return {
    isSupported,
    fallbackContent
  };
}