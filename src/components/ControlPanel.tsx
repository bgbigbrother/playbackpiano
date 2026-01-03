import { useRef, useEffect } from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Divider,
  List,
  ListItem,
  ListItemText,
  Switch,
  FormControlLabel,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Close as CloseIcon,
  Piano as PianoIcon,
} from '@mui/icons-material';
import { UseControlPanelReturn } from '../hooks/useControlPanel';
import { KeyMarkingControls } from './KeyMarkingControls';
import { LabelToggleControls } from './LabelToggleControls';
import { MetronomeControls } from './MetronomeControls';
import { AudioRecorderControls } from './AudioRecorderControls';
import { ControlPanelErrorBoundary } from './ControlPanelErrorBoundary';
import { getBrowserCompatibility } from '../utils/BrowserCompatibility';
import { MetronomeEngine } from '../utils/MetronomeEngine';
import { AudioRecorder } from '../utils/AudioRecorder';

export interface ControlPanelProps {
  controlPanelState: UseControlPanelReturn;
  onPlayMarkedKeys?: () => void;
}

/**
 * Control Panel component that provides a collapsible sidebar with piano control features
 * Uses Material-UI Drawer for responsive layout and smooth animations
 * Wrapped with error boundaries for graceful error handling
 */
export function ControlPanel({ controlPanelState, onPlayMarkedKeys }: ControlPanelProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const browserCompat = getBrowserCompatibility();
  
  // Create instances of MetronomeEngine and AudioRecorder
  const metronomeEngineRef = useRef<MetronomeEngine | null>(null);
  const audioRecorderRef = useRef<AudioRecorder | null>(null);
  
  // Initialize engines eagerly to avoid double-toggle bug
  useEffect(() => {
    if (!metronomeEngineRef.current) {
      metronomeEngineRef.current = new MetronomeEngine();
    }
    if (!audioRecorderRef.current) {
      audioRecorderRef.current = new AudioRecorder();
    }
  }, []); // Empty dependency array - initialize once on mount
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (metronomeEngineRef.current) {
        metronomeEngineRef.current.dispose?.();
      }
      if (audioRecorderRef.current) {
        audioRecorderRef.current.dispose?.();
      }
    };
  }, []);
  
  const {
    isOpen,
    keyMarkingEnabled,
    metronomeVisible,
    labelsVisible,
    recorderVisible,
    markedKeys,
    togglePanel,
    toggleKeyMarking,
    toggleMetronomeVisible,
    toggleLabelsVisible,
    toggleRecorderVisible,
    clearMarkedKeys,
    setBPM,
    bpm,
  } = controlPanelState;

  // Drawer width - responsive based on screen size
  const drawerWidth = isMobile ? '100%' : 320;

  return (
    <ControlPanelErrorBoundary
      onError={(error, errorInfo) => {
        console.error('ControlPanel error:', error, errorInfo);
      }}
      onRetry={() => {
        // Reset any problematic state
        if (!browserCompat.isGenerallyCompatible()) {
          browserCompat.refresh();
        }
      }}
      featureName="Control Panel"
    >
      <Drawer
        anchor="right"
        open={isOpen}
        onClose={togglePanel}
        variant={isMobile ? 'temporary' : 'persistent'}
        sx={{
          width: isOpen ? drawerWidth : 0,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            backgroundColor: theme.palette.background.paper,
            borderLeft: `1px solid ${theme.palette.divider}`,
          },
        }}
        ModalProps={{
          // Improve performance on mobile
          keepMounted: true,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 2,
              borderBottom: `1px solid ${theme.palette.divider}`,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PianoIcon color="primary" />
              <Typography variant="h6" component="h2">
                Piano Controls
              </Typography>
            </Box>
            <IconButton
              onClick={togglePanel}
              size="small"
              aria-label="Close control panel"
              sx={{
                color: theme.palette.text.secondary,
                '&:hover': {
                  backgroundColor: theme.palette.action.hover,
                },
              }}
            >
              <CloseIcon />
            </IconButton>
          </Box>

          {/* Content */}
          <Box
            sx={{
              flex: 1,
              overflow: 'auto',
              p: 1,
            }}
          >
            <List disablePadding>
              {/* Feature Toggles Section */}
              <ListItem>
                <ListItemText
                  primary="Features"
                  primaryTypographyProps={{
                    variant: 'subtitle2',
                    color: 'text.secondary',
                    fontWeight: 600,
                  }}
                />
              </ListItem>

              {/* Key Marking Toggle */}
              <ListItem>
                <FormControlLabel
                  control={
                    <Switch
                      checked={keyMarkingEnabled}
                      onChange={toggleKeyMarking}
                      color="primary"
                      size="small"
                    />
                  }
                  label="Key Marking"
                  sx={{ width: '100%', ml: 0 }}
                />
              </ListItem>

              {/* Labels Visibility Toggle */}
              <ListItem>
                <ControlPanelErrorBoundary featureName="Label Toggle">
                  <LabelToggleControls
                    labelsVisible={labelsVisible}
                    onToggle={toggleLabelsVisible}
                  />
                </ControlPanelErrorBoundary>
              </ListItem>

              <Divider sx={{ my: 1 }} />

              {/* Advanced Features Section */}
              <ListItem>
                <ListItemText
                  primary="Advanced Features"
                  primaryTypographyProps={{
                    variant: 'subtitle2',
                    color: 'text.secondary',
                    fontWeight: 600,
                  }}
                />
              </ListItem>

              {/* Metronome Toggle */}
              <ListItem>
                <FormControlLabel
                  control={
                    <Switch
                      checked={metronomeVisible}
                      onChange={toggleMetronomeVisible}
                      color="primary"
                      size="small"
                      disabled={!browserCompat.isSupported('audioContext')}
                    />
                  }
                  label="Metronome"
                  sx={{ width: '100%', ml: 0 }}
                />
              </ListItem>

              {/* Audio Recorder Toggle */}
              <ListItem>
                <FormControlLabel
                  control={
                    <Switch
                      checked={recorderVisible}
                      onChange={toggleRecorderVisible}
                      color="primary"
                      size="small"
                      disabled={!browserCompat.isSupported('mediaRecorder')}
                    />
                  }
                  label="Audio Recorder"
                  sx={{ width: '100%', ml: 0 }}
                />
              </ListItem>
            </List>

            {/* Feature-specific controls */}
            {keyMarkingEnabled && (
              <ControlPanelErrorBoundary featureName="Key Marking">
                <KeyMarkingControls
                  enabled={keyMarkingEnabled}
                  markedKeys={markedKeys}
                  onPlayMarkedKeys={onPlayMarkedKeys || (() => {})}
                  onResetMarkedKeys={clearMarkedKeys}
                />
              </ControlPanelErrorBoundary>
            )}

            {metronomeVisible && (
              <ControlPanelErrorBoundary featureName="Metronome">
                <MetronomeControls
                  visible={metronomeVisible}
                  metronomeEngine={metronomeEngineRef.current!}
                  initialBPM={bpm}
                  onBPMChange={setBPM}
                  onStart={() => {
                    // Optional: Add any additional logic when metronome starts
                  }}
                  onStop={() => {
                    // Optional: Add any additional logic when metronome stops
                  }}
                />
              </ControlPanelErrorBoundary>
            )}

            {recorderVisible && (
              <ControlPanelErrorBoundary featureName="Audio Recorder">
                <AudioRecorderControls
                  visible={recorderVisible}
                  audioRecorder={audioRecorderRef.current!}
                  onRecordingStart={() => {
                    // Optional: Add any additional logic when recording starts
                  }}
                  onRecordingStop={() => {
                    // Optional: Add any additional logic when recording stops
                  }}
                  onPlaybackStart={() => {
                    // Optional: Add any additional logic when playback starts
                  }}
                  onDownload={() => {
                    // Optional: Add any additional logic when download occurs
                  }}
                />
              </ControlPanelErrorBoundary>
            )}
          </Box>
        </Box>
      </Drawer>
    </ControlPanelErrorBoundary>
  );
}