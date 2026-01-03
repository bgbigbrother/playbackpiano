import React from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Chip,
  Stack,
  useTheme,
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Clear as ClearIcon,
  Piano as PianoIcon,
} from '@mui/icons-material';

export interface KeyMarkingControlsProps {
  /** Whether key marking mode is currently enabled */
  enabled: boolean;
  /** Set of currently marked keys */
  markedKeys: Set<string>;
  /** Callback to play all marked keys simultaneously */
  onPlayMarkedKeys: () => void;
  /** Callback to clear all marked keys */
  onResetMarkedKeys: () => void;
}

/**
 * KeyMarkingControls component provides UI controls for the key marking system
 * Displays marked keys, play button, and reset button with Material-UI styling
 */
export const KeyMarkingControls: React.FC<KeyMarkingControlsProps> = ({
  enabled,
  markedKeys,
  onPlayMarkedKeys,
  onResetMarkedKeys,
}) => {
  const theme = useTheme();
  const markedKeysArray = Array.from(markedKeys);
  const hasMarkedKeys = markedKeysArray.length > 0;

  if (!enabled) {
    return null;
  }

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
        <PianoIcon 
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
          Key Marking
        </Typography>
        <Chip
          label={`${markedKeysArray.length} marked`}
          size="small"
          color={hasMarkedKeys ? 'primary' : 'default'}
          variant="outlined"
          sx={{ ml: 'auto' }}
        />
      </Box>

      {/* Action Buttons */}
      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <Button
          variant="contained"
          startIcon={<PlayIcon />}
          onClick={onPlayMarkedKeys}
          disabled={!hasMarkedKeys}
          size="small"
          sx={{
            flex: 1,
            textTransform: 'none',
            fontWeight: 500,
          }}
        >
          Play Marked
        </Button>
        <IconButton
          onClick={onResetMarkedKeys}
          disabled={!hasMarkedKeys}
          size="small"
          color="error"
          sx={{
            border: `1px solid ${theme.palette.divider}`,
            '&:hover': {
              backgroundColor: theme.palette.error.main + '10',
            },
          }}
          aria-label="Clear all marked keys"
        >
          <ClearIcon fontSize="small" />
        </IconButton>
      </Stack>

      {/* Marked Keys Display */}
      {hasMarkedKeys ? (
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
            Marked Keys:
          </Typography>
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 0.5,
              maxHeight: '80px',
              overflow: 'auto',
              p: 1,
              bgcolor: 'action.hover',
              borderRadius: 0.5,
            }}
          >
            {markedKeysArray.sort().map((note) => (
              <Chip
                key={note}
                label={note}
                size="small"
                variant="filled"
                color="primary"
                sx={{
                  fontSize: '0.75rem',
                  height: '20px',
                  '& .MuiChip-label': {
                    px: 1,
                  },
                }}
              />
            ))}
          </Box>
        </Box>
      ) : (
        <Box
          sx={{
            textAlign: 'center',
            py: 2,
            color: 'text.secondary',
          }}
        >
          <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
            Click piano keys to mark them
          </Typography>
        </Box>
      )}

      {/* Instructions */}
      <Typography 
        variant="caption" 
        sx={{ 
          color: 'text.secondary',
          display: 'block',
          mt: 1,
          fontStyle: 'italic',
        }}
      >
        Tip: Click keys to mark/unmark them, then use "Play Marked" to play all at once
      </Typography>
    </Box>
  );
};