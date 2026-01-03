import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Chip,
  Stack,
  Slider,
  useTheme,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Speed as SpeedIcon,
  VolumeUp as VolumeIcon,
} from '@mui/icons-material';
import { MetronomeEngine } from '../utils/MetronomeEngine';
import { MetronomeErrorBoundary, useMetronomeSupport } from './MetronomeErrorBoundary';

export interface MetronomeControlsProps {
  /** Whether metronome controls are visible */
  visible: boolean;
  /** MetronomeEngine instance for controlling metronome */
  metronomeEngine: MetronomeEngine;
  /** Initial BPM value (default: 100) */
  initialBPM?: number;
  /** Callback when BPM changes */
  onBPMChange?: (bpm: number) => void;
  /** Callback when metronome starts */
  onStart?: () => void;
  /** Callback when metronome stops */
  onStop?: () => void;
}

/**
 * MetronomeControls component provides UI for metronome functionality
 * Includes start/stop button, BPM slider, and real-time tempo adjustment
 * Wrapped with error boundary for graceful error handling
 */
export const MetronomeControls: React.FC<MetronomeControlsProps> = ({
  visible,
  metronomeEngine,
  initialBPM = 100,
  onBPMChange,
  onStart,
  onStop,
}) => {
  const { isSupported, fallbackContent } = useMetronomeSupport();

  if (!visible) {
    return null;
  }

  // Show fallback content if not supported
  if (!isSupported) {
    return (
      <Box sx={{ p: 2 }}>
        {fallbackContent}
      </Box>
    );
  }

  return (
    <MetronomeErrorBoundary
      onError={(error, errorInfo) => {
        console.error('MetronomeControls error:', error, errorInfo);
      }}
      onRetry={() => {
        // Reset metronome engine if needed
        if (metronomeEngine) {
          metronomeEngine.clearError();
        }
      }}
    >
      <MetronomeControlsInternal
        visible={visible}
        metronomeEngine={metronomeEngine}
        initialBPM={initialBPM}
        onBPMChange={onBPMChange}
        onStart={onStart}
        onStop={onStop}
      />
    </MetronomeErrorBoundary>
  );
};

/**
 * Internal component with the actual metronome controls logic
 */
const MetronomeControlsInternal: React.FC<MetronomeControlsProps> = ({
  visible,
  metronomeEngine,
  initialBPM = 100,
  onBPMChange,
  onStart,
  onStop,
}) => {
  const theme = useTheme();
  const [isActive, setIsActive] = useState(false);
  const [currentBPM, setCurrentBPM] = useState(initialBPM);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  // Get BPM range from metronome engine
  const bpmRange = metronomeEngine.bpmRange;

  // Sync with metronome engine state
  useEffect(() => {
    if (metronomeEngine) {
      setIsActive(metronomeEngine.isActive);
      setCurrentBPM(metronomeEngine.bpm);
      
      // Check for errors
      if (metronomeEngine.hasError) {
        setError(metronomeEngine.getErrorMessage());
      } else {
        setError(null);
      }
    }
  }, [metronomeEngine]);

  // Initialize BPM on mount
  useEffect(() => {
    if (metronomeEngine && metronomeEngine.isReady) {
      metronomeEngine.setBPM(initialBPM);
      setCurrentBPM(initialBPM);
    }
  }, [metronomeEngine, initialBPM]);

  if (!visible) {
    return null;
  }

  // Handle start/stop toggle
  const handleToggle = async () => {
    if (!metronomeEngine || !metronomeEngine.isReady) {
      setError('Metronome not ready. Please try again.');
      return;
    }

    setIsInitializing(true);
    setError(null);

    try {
      if (isActive) {
        metronomeEngine.stop();
        setIsActive(false);
        onStop?.();
      } else {
        metronomeEngine.start();
        setIsActive(true);
        onStart?.();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to toggle metronome';
      setError(errorMessage);
    } finally {
      setIsInitializing(false);
    }
  };

  // Handle BPM change from slider
  const handleBPMChange = (_event: Event, newValue: number | number[]) => {
    const bpm = Array.isArray(newValue) ? newValue[0] : newValue;
    setCurrentBPM(bpm);
    
    if (metronomeEngine && metronomeEngine.isReady) {
      metronomeEngine.setBPM(bpm);
      onBPMChange?.(bpm);
    }
  };

  // Handle BPM change committed (when user releases slider)
  const handleBPMChangeCommitted = (_event: Event | React.SyntheticEvent, newValue: number | number[]) => {
    const bpm = Array.isArray(newValue) ? newValue[0] : newValue;
    
    if (metronomeEngine && metronomeEngine.isReady) {
      metronomeEngine.setBPM(bpm);
      onBPMChange?.(bpm);
    }
  };

  // Clear error
  const handleClearError = () => {
    setError(null);
    if (metronomeEngine) {
      metronomeEngine.clearError();
    }
  };

  // Format BPM display
  const formatBPM = (bpm: number): string => {
    return `${Math.round(bpm)} BPM`;
  };

  // Get tempo description
  const getTempoDescription = (bpm: number): string => {
    if (bpm < 60) return 'Very Slow';
    if (bpm < 80) return 'Slow';
    if (bpm < 100) return 'Moderate';
    if (bpm < 120) return 'Medium';
    if (bpm < 140) return 'Fast';
    if (bpm < 180) return 'Very Fast';
    return 'Extremely Fast';
  };

  const isDisabled = !metronomeEngine?.isReady || isInitializing;
  const statusColor = isActive ? 'success' : 'default';

  return (
    <Box
      sx={{
        p: 2,
        bgcolor: 'background.paper',
        borderRadius: 1,
        border: `1px solid ${theme.palette.divider}`,
        mt: 1,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          mb: 2,
        }}
      >
        <SpeedIcon 
          sx={{ 
            color: 'primary.main',
            fontSize: '1.2rem',
          }} 
        />
        <Typography 
          variant="subtitle2" 
          sx={{ 
            fontWeight: 600,
            color: 'text.primary',
          }}
        >
          Metronome
        </Typography>
        <Chip
          label={isActive ? 'Active' : 'Stopped'}
          size="small"
          color={statusColor}
          variant={isActive ? 'filled' : 'outlined'}
          sx={{ ml: 'auto' }}
        />
      </Box>

      {/* Error Display */}
      {error && (
        <Alert 
          severity="error" 
          onClose={handleClearError}
          sx={{ mb: 2 }}
        >
          {error}
        </Alert>
      )}

      {/* Main Controls */}
      <Stack spacing={2}>
        {/* Start/Stop Button */}
        <Button
          variant="contained"
          startIcon={
            isInitializing ? (
              <CircularProgress size={16} color="inherit" />
            ) : isActive ? (
              <StopIcon />
            ) : (
              <PlayIcon />
            )
          }
          onClick={handleToggle}
          disabled={isDisabled}
          color={isActive ? 'error' : 'primary'}
          size="medium"
          sx={{
            textTransform: 'none',
            fontWeight: 500,
            py: 1,
          }}
        >
          {isInitializing 
            ? 'Starting...' 
            : isActive 
              ? 'Stop Metronome' 
              : 'Start Metronome'
          }
        </Button>

        {/* BPM Display */}
        <Box
          sx={{
            textAlign: 'center',
            p: 2,
            bgcolor: 'action.hover',
            borderRadius: 1,
          }}
        >
          <Typography 
            variant="h4" 
            sx={{ 
              fontWeight: 700,
              color: 'primary.main',
              fontFamily: 'monospace',
            }}
          >
            {Math.round(currentBPM)}
          </Typography>
          <Typography 
            variant="caption" 
            sx={{ 
              color: 'text.secondary',
              display: 'block',
              fontWeight: 500,
            }}
          >
            BPM • {getTempoDescription(currentBPM)}
          </Typography>
        </Box>

        {/* BPM Slider */}
        <Box sx={{ px: 1 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              mb: 1,
            }}
          >
            <VolumeIcon 
              sx={{ 
                color: 'text.secondary',
                fontSize: '1rem',
              }} 
            />
            <Typography 
              variant="caption" 
              sx={{ 
                color: 'text.secondary',
                fontWeight: 500,
              }}
            >
              Tempo
            </Typography>
          </Box>
          
          <Slider
            value={currentBPM}
            onChange={handleBPMChange}
            onChangeCommitted={handleBPMChangeCommitted}
            min={bpmRange.min}
            max={bpmRange.max}
            step={1}
            disabled={isDisabled}
            valueLabelDisplay="auto"
            valueLabelFormat={formatBPM}
            marks={[
              { value: bpmRange.min, label: `${bpmRange.min}` },
              { value: 60, label: '60' },
              { value: 100, label: '100' },
              { value: 120, label: '120' },
              { value: 180, label: '180' },
              { value: bpmRange.max, label: `${bpmRange.max}` },
            ]}
            sx={{
              '& .MuiSlider-thumb': {
                width: 20,
                height: 20,
              },
              '& .MuiSlider-track': {
                height: 4,
              },
              '& .MuiSlider-rail': {
                height: 4,
              },
            }}
          />
          
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              mt: 0.5,
            }}
          >
            <Typography variant="caption" color="text.secondary">
              Slow
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Fast
            </Typography>
          </Box>
        </Box>

        {/* Quick BPM Presets */}
        <Box>
          <Typography 
            variant="caption" 
            sx={{ 
              color: 'text.secondary',
              fontWeight: 500,
              mb: 1,
              display: 'block',
            }}
          >
            Quick Presets:
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {[60, 80, 100, 120, 140, 160].map((bpm) => (
              <Button
                key={bpm}
                variant={Math.abs(currentBPM - bpm) < 2 ? 'contained' : 'outlined'}
                size="small"
                onClick={() => {
                  setCurrentBPM(bpm);
                  if (metronomeEngine && metronomeEngine.isReady) {
                    metronomeEngine.setBPM(bpm);
                    onBPMChange?.(bpm);
                  }
                }}
                disabled={isDisabled}
                sx={{
                  minWidth: '48px',
                  textTransform: 'none',
                  fontSize: '0.75rem',
                }}
              >
                {bpm}
              </Button>
            ))}
          </Stack>
        </Box>
      </Stack>

      {/* Instructions */}
      <Typography 
        variant="caption" 
        sx={{ 
          color: 'text.secondary',
          display: 'block',
          mt: 2,
          fontStyle: 'italic',
        }}
      >
        Tip: Adjust tempo in real-time while playing. Use presets for common tempos.
      </Typography>
    </Box>
  );
};