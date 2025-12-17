import React from 'react';
import {
  Box,
  CircularProgress,
  LinearProgress,
  Typography,
  Paper,
  Button,
} from '@mui/material';
import { styled } from '@mui/material/styles';

const LoadingContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  textAlign: 'center',
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.spacing(2),
  boxShadow: theme.shadows[3],
  maxWidth: 400,
  margin: '0 auto',
}));

const ProgressContainer = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(3),
  marginBottom: theme.spacing(2),
}));

const StatusText = styled(Typography)(({ theme }) => ({
  marginTop: theme.spacing(2),
  color: theme.palette.text.secondary,
}));

const ErrorContainer = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(2),
  padding: theme.spacing(2),
  backgroundColor: theme.palette.error.light,
  borderRadius: theme.spacing(1),
  color: theme.palette.error.contrastText,
}));

const RetryButton = styled(Button)(({ theme }) => ({
  marginTop: theme.spacing(2),
}));

export interface LoadingIndicatorProps {
  /** Current loading progress (0-100) */
  progress: number;
  /** Whether loading is in progress */
  isLoading: boolean;
  /** Error message to display, if any */
  error?: string | null;
  /** Custom loading message */
  message?: string;
  /** Custom status text */
  statusText?: string;
  /** Callback for retry button when error occurs */
  onRetry?: () => void;
  /** Whether to show detailed progress percentage */
  showProgress?: boolean;
  /** Whether to use circular or linear progress indicator */
  variant?: 'circular' | 'linear';
}

/**
 * LoadingIndicator component for displaying sample loading progress
 * Positioned where the piano keyboard will appear with Material-UI styling
 */
export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  progress,
  isLoading,
  error,
  message = 'Loading Piano Samples...',
  statusText,
  onRetry,
  showProgress = true,
  variant = 'linear',
}) => {
  // Don't render if not loading and no error
  if (!isLoading && !error) {
    return null;
  }

  const getStatusMessage = (): string => {
    if (error) {
      return 'Loading Failed';
    }
    if (statusText) {
      return statusText;
    }
    if (progress === 0) {
      return 'Initializing...';
    }
    if (progress < 50) {
      return 'Preparing audio engine...';
    }
    if (progress < 100) {
      return 'Loading piano samples...';
    }
    return 'Almost ready...';
  };

  const renderProgressIndicator = () => {
    if (error) {
      return null;
    }

    if (variant === 'circular') {
      return (
        <Box display="flex" justifyContent="center" alignItems="center">
          <CircularProgress
            variant={progress > 0 ? 'determinate' : 'indeterminate'}
            value={progress}
            size={60}
            thickness={4}
          />
          {showProgress && progress > 0 && (
            <Box
              position="absolute"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Typography variant="caption" component="div" color="text.secondary">
                {Math.round(progress)}%
              </Typography>
            </Box>
          )}
        </Box>
      );
    }

    return (
      <Box width="100%">
        <LinearProgress
          variant={progress > 0 ? 'determinate' : 'indeterminate'}
          value={progress}
          sx={{ height: 8, borderRadius: 4 }}
        />
        {showProgress && progress > 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {Math.round(progress)}%
          </Typography>
        )}
      </Box>
    );
  };

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="200px"
      padding={2}
    >
      <LoadingContainer elevation={3}>
        <Typography variant="h5" component="h2" gutterBottom>
          {message}
        </Typography>

        <StatusText variant="body1">
          {getStatusMessage()}
        </StatusText>

        {!error && (
          <ProgressContainer>
            {renderProgressIndicator()}
          </ProgressContainer>
        )}

        {error && (
          <ErrorContainer>
            <Typography variant="body2" gutterBottom>
              <strong>Error:</strong> {error}
            </Typography>
            {onRetry && (
              <RetryButton
                variant="contained"
                color="primary"
                onClick={onRetry}
                size="small"
              >
                Try Again
              </RetryButton>
            )}
          </ErrorContainer>
        )}

        {!error && progress > 0 && progress < 100 && (
          <StatusText variant="caption">
            This may take a few moments depending on your internet connection
          </StatusText>
        )}
      </LoadingContainer>
    </Box>
  );
};

export default LoadingIndicator;