import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Chip,
  Stack,
  LinearProgress,
  useTheme,
  Alert,
  CircularProgress,
  Slider,
  FormControl,
  Select,
  MenuItem,
} from '@mui/material';
import {
  FiberManualRecord as RecordIcon,
  Stop as StopIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Mic as MicIcon,
  Replay as ReplayIcon,
  Speed as SpeedIcon,
} from '@mui/icons-material';
import { AudioRecorder } from '../utils/AudioRecorder';
import { AudioRecorderErrorBoundary, useAudioRecordingSupport } from './AudioRecorderErrorBoundary';
import { browserSupport } from '../utils/BrowserCompatibility';

export interface AudioRecorderControlsProps {
  /** Whether audio recorder controls are visible */
  visible: boolean;
  /** AudioRecorder instance for controlling recording */
  audioRecorder: AudioRecorder;
  /** Callback when recording starts */
  onRecordingStart?: () => void;
  /** Callback when recording stops */
  onRecordingStop?: () => void;
  /** Callback when playback starts */
  onPlaybackStart?: () => void;
  /** Callback when performance replay starts */
  onReplayStart?: () => void;
  /** Callback when recording is downloaded */
  onDownload?: () => void;
}

/**
 * AudioRecorderControls component provides UI for audio recording functionality
 * Includes record, playback, download, and clear buttons with progress indicators
 * Wrapped with error boundary for graceful error handling
 */
export const AudioRecorderControls: React.FC<AudioRecorderControlsProps> = ({
  visible,
  audioRecorder,
  onRecordingStart,
  onRecordingStop,
  onPlaybackStart,
  onReplayStart,
  onDownload,
}) => {
  const { isSupported, fallbackContent } = useAudioRecordingSupport();

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
    <AudioRecorderErrorBoundary
      onError={(error, errorInfo) => {
        console.error('AudioRecorderControls error:', error, errorInfo);
      }}
      onRetry={() => {
        // Reset any local state if needed
        window.location.reload();
      }}
    >
      <AudioRecorderControlsInternal
        visible={visible}
        audioRecorder={audioRecorder}
        onRecordingStart={onRecordingStart}
        onRecordingStop={onRecordingStop}
        onPlaybackStart={onPlaybackStart}
        onReplayStart={onReplayStart}
        onDownload={onDownload}
      />
    </AudioRecorderErrorBoundary>
  );
};

/**
 * Internal component with the actual recording controls logic
 */
const AudioRecorderControlsInternal: React.FC<AudioRecorderControlsProps> = ({
  visible,
  audioRecorder,
  onRecordingStart,
  onRecordingStop,
  onPlaybackStart,
  onReplayStart,
  onDownload,
}) => {
  const theme = useTheme();
  const [isRecording, setIsRecording] = useState(false);
  const [hasRecording, setHasRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Replay-specific state
  const [isReplaying, setIsReplaying] = useState(false);
  const [isReplayPaused, setIsReplayPaused] = useState(false);
  const [replaySpeed, setReplaySpeed] = useState(1.0);
  const [canReplay, setCanReplay] = useState(false);
  
  // MP3 export state
  const [isConvertingMP3, setIsConvertingMP3] = useState(false);
  const [conversionProgress, setConversionProgress] = useState<number>(0);
  const [exportFormat, setExportFormat] = useState<'mp3' | 'original'>('mp3');
  const [conversionSuccess, setConversionSuccess] = useState<boolean | null>(null);
  const [lastDownloadFormat, setLastDownloadFormat] = useState<string>('');

  // Sync with audio recorder state
  useEffect(() => {
    if (audioRecorder) {
      setIsRecording(audioRecorder.isRecording);
      setHasRecording(audioRecorder.hasRecording);
      setDuration(audioRecorder.duration);
      setCanReplay(audioRecorder.canReplayPerformance);
      setIsReplaying(audioRecorder.isReplayingPerformance);
      setIsReplayPaused(audioRecorder.isPerformanceReplayPaused);
      setReplaySpeed(audioRecorder.performanceReplaySpeed);
      setIsConvertingMP3(audioRecorder.isConvertingToMP3);
      
      // Update conversion progress
      const progress = audioRecorder.conversionProgress;
      if (progress) {
        setConversionProgress(progress.progress);
      }
      
      // Check for errors
      if (audioRecorder.hasError) {
        setError(audioRecorder.getErrorMessage());
      } else {
        setError(null);
      }
    }
  }, [audioRecorder]);

  // Add a polling mechanism to ensure state stays in sync
  useEffect(() => {
    if (!audioRecorder) return;

    const syncInterval = setInterval(() => {
      // Only sync if there are potential state changes
      if (audioRecorder.isRecording || audioRecorder.hasRecording) {
        setIsRecording(audioRecorder.isRecording);
        setHasRecording(audioRecorder.hasRecording);
        setDuration(audioRecorder.duration);
        setCanReplay(audioRecorder.canReplayPerformance);
        setIsReplaying(audioRecorder.isReplayingPerformance);
        setIsReplayPaused(audioRecorder.isPerformanceReplayPaused);
        setIsConvertingMP3(audioRecorder.isConvertingToMP3);
        
        // Update conversion progress
        const progress = audioRecorder.conversionProgress;
        if (progress) {
          setConversionProgress(progress.progress);
        }
      }
    }, 100); // Check every 100ms

    return () => clearInterval(syncInterval);
  }, [audioRecorder]);

  // Update duration while recording
  useEffect(() => {
    let interval: number | null = null;
    
    if (isRecording && audioRecorder) {
      interval = window.setInterval(() => {
        setDuration(audioRecorder.duration);
      }, 100);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isRecording, audioRecorder]);

  if (!visible) {
    return null;
  }

  // Check if recording is supported
  const canRecord = browserSupport.canRecordAudio();

  // Handle start recording
  const handleStartRecording = async () => {
    if (!audioRecorder || !canRecord) {
      setError('Audio recording is not supported in this browser.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      await audioRecorder.startRecording();
      setIsRecording(true);
      onRecordingStart?.();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start recording';
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle stop recording
  const handleStopRecording = () => {
    if (!audioRecorder) return;

    setIsProcessing(true);
    
    try {
      audioRecorder.stopRecording();
      setIsRecording(false);
      onRecordingStop?.();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to stop recording';
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle play recording
  const handlePlayRecording = () => {
    if (!audioRecorder || !hasRecording) return;

    try {
      audioRecorder.playRecording();
      setIsPlaying(true);
      onPlaybackStart?.();
      
      // Reset playing state after estimated duration
      setTimeout(() => {
        setIsPlaying(false);
      }, duration * 1000 + 500); // Add small buffer
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to play recording';
      setError(errorMessage);
    }
  };

  // Handle download recording
  const handleDownloadRecording = async () => {
    if (!audioRecorder || !hasRecording) return;

    try {
      setIsProcessing(true);
      setConversionSuccess(null);
      
      if (exportFormat === 'mp3') {
        // Download as MP3 with conversion
        await audioRecorder.downloadRecording(true);
        setLastDownloadFormat('MP3');
        
        // Check if there was a conversion error (fallback to original format)
        if (audioRecorder.hasError && audioRecorder.error?.type === 'EXPORT_FAILED') {
          setConversionSuccess(false);
        } else {
          setConversionSuccess(true);
        }
      } else {
        // Download in original format
        await audioRecorder.downloadOriginalFormat();
        setLastDownloadFormat('Original');
        setConversionSuccess(true);
      }
      
      onDownload?.();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to download recording';
      setError(errorMessage);
      setConversionSuccess(false);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle clear recording
  const handleClearRecording = () => {
    if (!audioRecorder) return;

    try {
      audioRecorder.clearRecording();
      setHasRecording(false);
      setDuration(0);
      setIsPlaying(false);
      setIsReplaying(false);
      setIsReplayPaused(false);
      setCanReplay(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clear recording';
      setError(errorMessage);
    }
  };

  // Handle replay performance
  const handleReplayPerformance = async () => {
    if (!audioRecorder || !canReplay) return;

    try {
      if (isReplaying && !isReplayPaused) {
        // Pause replay
        audioRecorder.pausePerformanceReplay();
        setIsReplayPaused(true);
      } else if (isReplaying && isReplayPaused) {
        // Resume replay
        audioRecorder.resumePerformanceReplay();
        setIsReplayPaused(false);
      } else {
        // Start replay
        await audioRecorder.replayPerformance();
        setIsReplaying(true);
        setIsReplayPaused(false);
        onReplayStart?.();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to replay performance';
      setError(errorMessage);
    }
  };

  // Handle stop replay
  const handleStopReplay = () => {
    if (!audioRecorder) return;

    try {
      audioRecorder.stopPerformanceReplay();
      setIsReplaying(false);
      setIsReplayPaused(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to stop replay';
      setError(errorMessage);
    }
  };

  // Handle replay speed change
  const handleReplaySpeedChange = (newSpeed: number) => {
    if (!audioRecorder) return;

    try {
      audioRecorder.setPerformanceReplaySpeed(newSpeed);
      setReplaySpeed(newSpeed);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to change replay speed';
      setError(errorMessage);
    }
  };

  // Clear error
  const handleClearError = () => {
    setError(null);
    if (audioRecorder) {
      audioRecorder.clearError();
    }
  };

  // Format duration display
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get recording status
  const getRecordingStatus = (): string => {
    if (isRecording) return 'Recording';
    if (hasRecording) return 'Ready';
    return 'No Recording';
  };

  // Get status color
  const getStatusColor = (): 'error' | 'success' | 'default' => {
    if (isRecording) return 'error';
    if (hasRecording) return 'success';
    return 'default';
  };

  const isDisabled = !canRecord || isProcessing;

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
        <MicIcon 
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
          Audio Recorder
        </Typography>
        <Chip
          label={getRecordingStatus()}
          size="small"
          color={getStatusColor()}
          variant={isRecording || hasRecording ? 'filled' : 'outlined'}
          sx={{ ml: 'auto' }}
        />
      </Box>

      {/* Browser Support Check */}
      {!canRecord && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Audio recording is not supported in this browser. Please try Chrome, Firefox, or Safari.
        </Alert>
      )}

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
        {/* Recording Controls */}
        <Box>
          {!isRecording ? (
            <Button
              variant="contained"
              startIcon={
                isProcessing ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <RecordIcon />
                )
              }
              onClick={handleStartRecording}
              disabled={isDisabled}
              color="error"
              size="medium"
              fullWidth
              sx={{
                textTransform: 'none',
                fontWeight: 500,
                py: 1.5,
              }}
            >
              {isProcessing ? 'Starting...' : 'Start Recording'}
            </Button>
          ) : (
            <Button
              variant="contained"
              startIcon={
                isProcessing ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <StopIcon />
                )
              }
              onClick={handleStopRecording}
              disabled={isProcessing}
              color="primary"
              size="medium"
              fullWidth
              sx={{
                textTransform: 'none',
                fontWeight: 500,
                py: 1.5,
              }}
            >
              {isProcessing ? 'Stopping...' : 'Stop Recording'}
            </Button>
          )}
        </Box>

        {/* Duration Display */}
        <Box
          sx={{
            textAlign: 'center',
            p: 2,
            bgcolor: isRecording ? 'error.main' + '10' : 'action.hover',
            borderRadius: 1,
            border: isRecording ? `1px solid ${theme.palette.error.main}` : 'none',
          }}
        >
          <Typography 
            variant="h4" 
            sx={{ 
              fontWeight: 700,
              color: isRecording ? 'error.main' : 'primary.main',
              fontFamily: 'monospace',
            }}
          >
            {formatDuration(duration)}
          </Typography>
          <Typography 
            variant="caption" 
            sx={{ 
              color: 'text.secondary',
              display: 'block',
              fontWeight: 500,
            }}
          >
            {isRecording ? 'Recording...' : hasRecording ? 'Recorded' : 'Duration'}
          </Typography>
          
          {/* Recording Progress Bar */}
          {isRecording && (
            <LinearProgress
              variant="indeterminate"
              color="error"
              sx={{
                mt: 1,
                height: 3,
                borderRadius: 1.5,
              }}
            />
          )}
        </Box>

        {/* Playback and Export Controls */}
        {hasRecording && (
          <Stack spacing={2}>
            {/* Audio Playback and Performance Replay */}
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                startIcon={isPlaying ? <PauseIcon /> : <PlayIcon />}
                onClick={handlePlayRecording}
                disabled={isDisabled || isRecording || isReplaying}
                size="small"
                sx={{
                  flex: 1,
                  textTransform: 'none',
                  fontWeight: 500,
                }}
              >
                {isPlaying ? 'Playing...' : 'Play Audio'}
              </Button>
              
              {canReplay && (
                <Button
                  variant={isReplaying ? "contained" : "outlined"}
                  startIcon={
                    isReplaying && !isReplayPaused ? <PauseIcon /> : <ReplayIcon />
                  }
                  onClick={handleReplayPerformance}
                  disabled={isDisabled || isRecording || isPlaying}
                  size="small"
                  color={isReplaying ? "secondary" : "primary"}
                  sx={{
                    flex: 1,
                    textTransform: 'none',
                    fontWeight: 500,
                  }}
                >
                  {isReplaying && !isReplayPaused 
                    ? 'Pause Replay' 
                    : isReplaying && isReplayPaused 
                      ? 'Resume Replay'
                      : 'Replay Performance'
                  }
                </Button>
              )}
            </Stack>

            {/* Replay Controls */}
            {canReplay && (
              <Box
                sx={{
                  p: 1.5,
                  bgcolor: 'secondary.main' + '10',
                  borderRadius: 1,
                  border: `1px solid ${theme.palette.secondary.main}30`,
                }}
              >
                <Stack spacing={1}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SpeedIcon sx={{ fontSize: '1rem', color: 'secondary.main' }} />
                    <Typography variant="caption" sx={{ fontWeight: 500 }}>
                      Replay Speed: {replaySpeed}x
                    </Typography>
                    {isReplaying && (
                      <Button
                        variant="text"
                        size="small"
                        onClick={handleStopReplay}
                        sx={{ ml: 'auto', minWidth: 'auto', p: 0.5 }}
                      >
                        <StopIcon fontSize="small" />
                      </Button>
                    )}
                  </Box>
                  
                  <Slider
                    value={replaySpeed}
                    onChange={(_, value) => handleReplaySpeedChange(value as number)}
                    min={0.5}
                    max={2.0}
                    step={0.1}
                    disabled={isDisabled || isRecording}
                    size="small"
                    marks={[
                      { value: 0.5, label: '0.5x' },
                      { value: 1.0, label: '1x' },
                      { value: 1.5, label: '1.5x' },
                      { value: 2.0, label: '2x' },
                    ]}
                    sx={{
                      '& .MuiSlider-mark': {
                        fontSize: '0.7rem',
                      },
                    }}
                  />
                </Stack>
              </Box>
            )}

            {/* Download and Clear Controls */}
            <Stack spacing={1}>
              {/* Export Format Selection */}
              <Box
                sx={{
                  p: 1.5,
                  bgcolor: 'primary.main' + '10',
                  borderRadius: 1,
                  border: `1px solid ${theme.palette.primary.main}30`,
                }}
              >
                <Stack spacing={1}>
                  <Typography variant="caption" sx={{ fontWeight: 500, color: 'primary.main' }}>
                    Export Format
                  </Typography>
                  
                  <FormControl size="small" fullWidth>
                    <Select
                      value={exportFormat}
                      onChange={(e) => setExportFormat(e.target.value as 'mp3' | 'original')}
                      disabled={isDisabled || isRecording || isConvertingMP3}
                      sx={{ fontSize: '0.875rem' }}
                    >
                      <MenuItem value="mp3">
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            MP3 Format
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            Compressed, smaller file size
                          </Typography>
                        </Box>
                      </MenuItem>
                      <MenuItem value="original">
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            Original Format
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            Uncompressed, best quality
                          </Typography>
                        </Box>
                      </MenuItem>
                    </Select>
                  </FormControl>

                  {/* MP3 Conversion Progress */}
                  {isConvertingMP3 && (
                    <Box sx={{ mt: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <CircularProgress size={12} />
                        <Typography variant="caption" sx={{ color: 'primary.main' }}>
                          Converting to MP3... {Math.round(conversionProgress * 100)}%
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={conversionProgress * 100}
                        sx={{
                          height: 3,
                          borderRadius: 1.5,
                          backgroundColor: theme.palette.primary.main + '20',
                        }}
                      />
                    </Box>
                  )}

                  {/* Conversion Success/Failure Feedback */}
                  {conversionSuccess !== null && !isConvertingMP3 && !isProcessing && (
                    <Alert 
                      severity={conversionSuccess ? "success" : "warning"}
                      sx={{ 
                        mt: 1,
                        '& .MuiAlert-message': {
                          fontSize: '0.75rem',
                        }
                      }}
                      onClose={() => setConversionSuccess(null)}
                    >
                      {conversionSuccess 
                        ? `✓ Successfully downloaded as ${lastDownloadFormat} format`
                        : exportFormat === 'mp3' 
                          ? '⚠ MP3 conversion failed. Downloaded in original format instead.'
                          : '⚠ Download completed with warnings'
                      }
                    </Alert>
                  )}
                </Stack>
              </Box>

              {/* Download and Clear Buttons */}
              <Stack direction="row" spacing={1}>
                <Button
                  variant="contained"
                  startIcon={
                    isConvertingMP3 || isProcessing ? (
                      <CircularProgress size={16} color="inherit" />
                    ) : (
                      <DownloadIcon />
                    )
                  }
                  onClick={handleDownloadRecording}
                  disabled={isDisabled || isRecording || isConvertingMP3 || isProcessing}
                  size="small"
                  sx={{
                    flex: 1,
                    textTransform: 'none',
                    fontWeight: 500,
                  }}
                >
                  {isConvertingMP3 
                    ? 'Converting...' 
                    : isProcessing 
                      ? 'Downloading...'
                      : `Download ${exportFormat === 'mp3' ? 'MP3' : 'Original'}`
                  }
                </Button>
                
                <IconButton
                  onClick={handleClearRecording}
                  disabled={isDisabled || isRecording}
                  size="small"
                  color="error"
                  sx={{
                    border: `1px solid ${theme.palette.divider}`,
                    '&:hover': {
                      backgroundColor: theme.palette.error.main + '10',
                    },
                  }}
                  aria-label="Clear recording"
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Stack>
            </Stack>
          </Stack>
        )}

        {/* Recording Info */}
        {hasRecording && !isRecording && (
          <Box
            sx={{
              p: 1.5,
              bgcolor: 'success.main' + '10',
              borderRadius: 1,
              border: `1px solid ${theme.palette.success.main}30`,
            }}
          >
            <Typography 
              variant="body2" 
              sx={{ 
                color: 'success.dark',
                fontWeight: 500,
                textAlign: 'center',
              }}
            >
              ✓ Recording saved ({formatDuration(duration)})
            </Typography>
          </Box>
        )}
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
        {isRecording 
          ? 'Recording in progress. Play piano to capture audio and note events.'
          : hasRecording
            ? canReplay 
              ? 'Use Play for audio, Replay for performance recreation, Download to save, or Clear to start over.'
              : 'Use Play to preview, Download to save, or Clear to start over.'
            : 'Click "Start Recording" to capture your piano performance with note tracking.'
        }
      </Typography>
    </Box>
  );
};