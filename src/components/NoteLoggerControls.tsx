import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Chip,
  Stack,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  useTheme,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Clear as ClearIcon,
  History as HistoryIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
} from '@mui/icons-material';
import { NoteEntry } from '../utils/NoteLogger';

export interface NoteLoggerControlsProps {
  /** Whether note logging controls are visible */
  visible: boolean;
  /** Array of logged note entries in chronological order */
  noteEntries: NoteEntry[];
  /** Whether replay is currently in progress */
  isReplaying?: boolean;
  /** Callback to replay all logged notes */
  onReplayLog: () => Promise<void>;
  /** Callback to clear all logged entries */
  onClearLog: () => void;
  /** Callback to export log as JSON */
  onExportLog?: () => string;
  /** Callback to import log from JSON */
  onImportLog?: (jsonData: string) => void;
}

/**
 * NoteLoggerControls component provides UI for viewing and managing note log entries
 * Displays chronological list of notes with replay and management functionality
 */
export const NoteLoggerControls: React.FC<NoteLoggerControlsProps> = ({
  visible,
  noteEntries,
  isReplaying = false,
  onReplayLog,
  onClearLog,
  onExportLog,
  onImportLog,
}) => {
  const theme = useTheme();
  const [replayError, setReplayError] = useState<string | null>(null);
  const [isReplayingInternal, setIsReplayingInternal] = useState(false);

  const hasEntries = noteEntries.length > 0;
  const isReplayDisabled = !hasEntries || isReplaying || isReplayingInternal;

  if (!visible) {
    return null;
  }

  // Format timestamp for display
  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit'
    });
  };

  // Format note entry for display
  const formatNoteEntry = (entry: NoteEntry, index: number): string => {
    const velocity = entry.velocity ? ` (v${Math.round(entry.velocity * 100)})` : '';
    return `${index + 1}. ${entry.note}${velocity}`;
  };

  // Handle replay with error handling
  const handleReplay = async () => {
    if (isReplayDisabled) return;

    setIsReplayingInternal(true);
    setReplayError(null);

    try {
      await onReplayLog();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to replay notes';
      setReplayError(errorMessage);
    } finally {
      setIsReplayingInternal(false);
    }
  };

  // Handle export
  const handleExport = () => {
    if (!onExportLog) return;

    try {
      const jsonData = onExportLog();
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `piano-notes-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export note log:', error);
    }
  };

  // Handle import
  const handleImport = () => {
    if (!onImportLog) return;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const jsonData = e.target?.result as string;
          onImportLog(jsonData);
        } catch (error) {
          console.error('Failed to import note log:', error);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  // Calculate log duration
  const getLogDuration = (): string => {
    if (noteEntries.length < 2) return '0s';
    
    const firstTimestamp = noteEntries[0].timestamp;
    const lastTimestamp = noteEntries[noteEntries.length - 1].timestamp;
    const durationMs = lastTimestamp - firstTimestamp;
    const durationSeconds = Math.round(durationMs / 100) / 10; // Round to 1 decimal
    
    return `${durationSeconds}s`;
  };

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
        <HistoryIcon 
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
          Note Log
        </Typography>
        <Chip
          label={`${noteEntries.length} notes`}
          size="small"
          color={hasEntries ? 'primary' : 'default'}
          variant="outlined"
          sx={{ ml: 'auto' }}
        />
      </Box>

      {/* Action Buttons */}
      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <Button
          variant="contained"
          startIcon={
            isReplayingInternal ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <PlayIcon />
            )
          }
          onClick={handleReplay}
          disabled={isReplayDisabled}
          size="small"
          sx={{
            flex: 1,
            textTransform: 'none',
            fontWeight: 500,
          }}
        >
          {isReplayingInternal ? 'Replaying...' : 'Replay Log'}
        </Button>
        
        {onExportLog && (
          <IconButton
            onClick={handleExport}
            disabled={!hasEntries}
            size="small"
            color="primary"
            sx={{
              border: `1px solid ${theme.palette.divider}`,
              '&:hover': {
                backgroundColor: theme.palette.primary.main + '10',
              },
            }}
            aria-label="Export note log"
          >
            <DownloadIcon fontSize="small" />
          </IconButton>
        )}

        {onImportLog && (
          <IconButton
            onClick={handleImport}
            size="small"
            color="primary"
            sx={{
              border: `1px solid ${theme.palette.divider}`,
              '&:hover': {
                backgroundColor: theme.palette.primary.main + '10',
              },
            }}
            aria-label="Import note log"
          >
            <UploadIcon fontSize="small" />
          </IconButton>
        )}

        <IconButton
          onClick={onClearLog}
          disabled={!hasEntries}
          size="small"
          color="error"
          sx={{
            border: `1px solid ${theme.palette.divider}`,
            '&:hover': {
              backgroundColor: theme.palette.error.main + '10',
            },
          }}
          aria-label="Clear note log"
        >
          <ClearIcon fontSize="small" />
        </IconButton>
      </Stack>

      {/* Error Display */}
      {replayError && (
        <Alert 
          severity="error" 
          onClose={() => setReplayError(null)}
          sx={{ mb: 2 }}
        >
          {replayError}
        </Alert>
      )}

      {/* Log Statistics */}
      {hasEntries && (
        <Box
          sx={{
            display: 'flex',
            gap: 2,
            mb: 2,
            p: 1,
            bgcolor: 'action.hover',
            borderRadius: 0.5,
          }}
        >
          <Typography variant="caption" color="text.secondary">
            Duration: {getLogDuration()}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            First: {formatTimestamp(noteEntries[0].timestamp)}
          </Typography>
          {noteEntries.length > 1 && (
            <Typography variant="caption" color="text.secondary">
              Last: {formatTimestamp(noteEntries[noteEntries.length - 1].timestamp)}
            </Typography>
          )}
        </Box>
      )}

      {/* Note Entries List */}
      {hasEntries ? (
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
            Recent Notes:
          </Typography>
          <Box
            sx={{
              maxHeight: '200px',
              overflow: 'auto',
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 0.5,
              bgcolor: 'background.default',
            }}
          >
            <List dense disablePadding>
              {noteEntries.slice(-20).reverse().map((entry, index) => {
                const originalIndex = noteEntries.length - 1 - index;
                return (
                  <ListItem
                    key={entry.id}
                    sx={{
                      py: 0.5,
                      px: 1,
                      borderBottom: index < Math.min(19, noteEntries.length - 1) 
                        ? `1px solid ${theme.palette.divider}` 
                        : 'none',
                    }}
                  >
                    <ListItemText
                      primary={formatNoteEntry(entry, originalIndex)}
                      secondary={formatTimestamp(entry.timestamp)}
                      primaryTypographyProps={{
                        variant: 'body2',
                        fontFamily: 'monospace',
                      }}
                      secondaryTypographyProps={{
                        variant: 'caption',
                        color: 'text.secondary',
                      }}
                    />
                    {entry.velocity && (
                      <ListItemSecondaryAction>
                        <Chip
                          label={`${Math.round(entry.velocity * 100)}`}
                          size="small"
                          variant="outlined"
                          sx={{
                            height: '16px',
                            fontSize: '0.6rem',
                            '& .MuiChip-label': {
                              px: 0.5,
                            },
                          }}
                        />
                      </ListItemSecondaryAction>
                    )}
                  </ListItem>
                );
              })}
            </List>
          </Box>
          {noteEntries.length > 20 && (
            <Typography 
              variant="caption" 
              sx={{ 
                color: 'text.secondary',
                display: 'block',
                mt: 0.5,
                textAlign: 'center',
                fontStyle: 'italic',
              }}
            >
              Showing last 20 of {noteEntries.length} notes
            </Typography>
          )}
        </Box>
      ) : (
        <Box
          sx={{
            textAlign: 'center',
            py: 3,
            color: 'text.secondary',
          }}
        >
          <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
            No notes logged yet
          </Typography>
          <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
            Play piano keys to start logging
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
        Tip: Notes are logged automatically as you play. Use "Replay Log" to hear your sequence again.
      </Typography>
    </Box>
  );
};