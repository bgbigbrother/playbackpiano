import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Tabs,
  Tab,
  Chip,
  Stack,
  IconButton,
  Tooltip,
  FormControl,
  FormLabel,
  FormGroup,
  FormControlLabel,
  Switch,
  Select,
  MenuItem,
  TextField
} from '@mui/material';
import {
  BugReport as BugIcon,
  Clear as ClearIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { debugLogger, type LogEntry } from '../utils/debugLogger';
import { debugConfig, saveDebugConfig, DEBUG_PRESETS, type DebugConfig } from '../config/debugConfig';

interface DebugPanelProps {
  open: boolean;
  onClose: () => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index, ...other }: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`debug-tabpanel-${index}`}
      aria-labelledby={`debug-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
    </div>
  );
}

export function DebugPanel({ open, onClose }: DebugPanelProps) {
  const [tabValue, setTabValue] = useState(0);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [config, setConfig] = useState<DebugConfig>(debugConfig);

  // Refresh logs
  const refreshLogs = () => {
    setLogs(debugLogger.getLogs());
  };

  // Auto-refresh logs
  useEffect(() => {
    if (!open || !autoRefresh) return;

    const interval = setInterval(refreshLogs, 1000);
    return () => clearInterval(interval);
  }, [open, autoRefresh]);

  // Initial load
  useEffect(() => {
    if (open) {
      refreshLogs();
    }
  }, [open]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleClearLogs = () => {
    debugLogger.clear();
    refreshLogs();
  };

  const handleDownloadLogs = () => {
    const logsData = debugLogger.exportLogs();
    const blob = new Blob([logsData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `piano-debug-logs-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleConfigChange = (key: keyof DebugConfig, value: any) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    saveDebugConfig({ [key]: value });
    
    // Update logger configuration
    debugLogger.updateConfig({
      enabled: newConfig.enabled,
      maxLogs: newConfig.maxLogs,
      logLevel: newConfig.logLevel
    });
  };

  const handlePresetApply = (preset: keyof typeof DEBUG_PRESETS) => {
    const presetConfig = DEBUG_PRESETS[preset];
    setConfig(presetConfig);
    saveDebugConfig(presetConfig);
    debugLogger.updateConfig({
      enabled: presetConfig.enabled,
      maxLogs: presetConfig.maxLogs,
      logLevel: presetConfig.logLevel
    });
  };

  const getLevelColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'error': return 'error';
      case 'warn': return 'warning';
      case 'info': return 'info';
      case 'debug': return 'default';
      default: return 'default';
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const errorLogs = logs.filter(log => log.level === 'error');
  const networkLogs = logs.filter(log => 
    log.message.includes('Network') || log.message.includes('XHR')
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { height: '80vh' }
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <BugIcon />
          Debug Panel
          <Box flexGrow={1} />
          <Tooltip title="Auto-refresh">
            <IconButton
              size="small"
              color={autoRefresh ? 'primary' : 'default'}
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Clear logs">
            <IconButton size="small" onClick={handleClearLogs}>
              <ClearIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Download logs">
            <IconButton size="small" onClick={handleDownloadLogs}>
              <DownloadIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label={`All Logs (${logs.length})`} />
          <Tab label={`Errors (${errorLogs.length})`} />
          <Tab label={`Network (${networkLogs.length})`} />
          <Tab label="System Info" />
          <Tab label="Configuration" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <Box sx={{ height: '50vh', overflow: 'auto' }}>
            {logs.length === 0 ? (
              <Typography color="text.secondary">No logs available</Typography>
            ) : (
              <Stack spacing={1}>
                {logs.slice(-100).map((log, index) => (
                  <Box
                    key={index}
                    sx={{
                      p: 1,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      fontSize: '0.875rem',
                      fontFamily: 'monospace'
                    }}
                  >
                    <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                      <Chip
                        label={log.level.toUpperCase()}
                        size="small"
                        color={getLevelColor(log.level)}
                        sx={{ minWidth: 60 }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {formatTimestamp(log.timestamp)}
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                      {log.message}
                    </Typography>
                    {log.data && (
                      <Box
                        component="pre"
                        sx={{
                          mt: 1,
                          p: 1,
                          bgcolor: 'grey.100',
                          borderRadius: 1,
                          fontSize: '0.75rem',
                          overflow: 'auto',
                          maxHeight: 200
                        }}
                      >
                        {JSON.stringify(log.data, null, 2)}
                      </Box>
                    )}
                  </Box>
                ))}
              </Stack>
            )}
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Box sx={{ height: '50vh', overflow: 'auto' }}>
            {errorLogs.length === 0 ? (
              <Typography color="text.secondary">No errors logged</Typography>
            ) : (
              <Stack spacing={1}>
                {errorLogs.map((log, index) => (
                  <Box
                    key={index}
                    sx={{
                      p: 1,
                      border: '1px solid',
                      borderColor: 'error.main',
                      borderRadius: 1,
                      bgcolor: 'error.light',
                      color: 'error.contrastText'
                    }}
                  >
                    <Typography variant="caption">
                      {formatTimestamp(log.timestamp)}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      {log.message}
                    </Typography>
                    {log.data && (
                      <Box
                        component="pre"
                        sx={{
                          mt: 1,
                          p: 1,
                          bgcolor: 'rgba(0,0,0,0.1)',
                          borderRadius: 1,
                          fontSize: '0.75rem',
                          overflow: 'auto'
                        }}
                      >
                        {JSON.stringify(log.data, null, 2)}
                      </Box>
                    )}
                  </Box>
                ))}
              </Stack>
            )}
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Box sx={{ height: '50vh', overflow: 'auto' }}>
            {networkLogs.length === 0 ? (
              <Typography color="text.secondary">No network requests logged</Typography>
            ) : (
              <Stack spacing={1}>
                {networkLogs.map((log, index) => (
                  <Box
                    key={index}
                    sx={{
                      p: 1,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1
                    }}
                  >
                    <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                      <Chip
                        label={log.level.toUpperCase()}
                        size="small"
                        color={getLevelColor(log.level)}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {formatTimestamp(log.timestamp)}
                      </Typography>
                    </Box>
                    <Typography variant="body2">{log.message}</Typography>
                    {log.data && (
                      <Box sx={{ mt: 1 }}>
                        {log.data.url && (
                          <Typography variant="caption" display="block">
                            URL: {log.data.url}
                          </Typography>
                        )}
                        {log.data.duration && (
                          <Typography variant="caption" display="block">
                            Duration: {log.data.duration}ms
                          </Typography>
                        )}
                        {log.data.status && (
                          <Typography variant="caption" display="block">
                            Status: {log.data.status}
                          </Typography>
                        )}
                      </Box>
                    )}
                  </Box>
                ))}
              </Stack>
            )}
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <Stack spacing={2}>
            <Typography variant="h6">System Information</Typography>
            <Box>
              <Typography variant="body2">
                <strong>User Agent:</strong> {navigator.userAgent}
              </Typography>
              <Typography variant="body2">
                <strong>Platform:</strong> {navigator.platform}
              </Typography>
              <Typography variant="body2">
                <strong>Language:</strong> {navigator.language}
              </Typography>
              <Typography variant="body2">
                <strong>Online:</strong> {navigator.onLine ? 'Yes' : 'No'}
              </Typography>
              <Typography variant="body2">
                <strong>Connection:</strong> {(navigator as any).connection?.effectiveType || 'Unknown'}
              </Typography>
            </Box>
            
            <Typography variant="h6">Audio Context Info</Typography>
            <Box>
              <Typography variant="body2">
                <strong>Audio Context Support:</strong> {window.AudioContext ? 'Yes' : 'No'}
              </Typography>
              <Typography variant="body2">
                <strong>WebKit Audio Context:</strong> {(window as any).webkitAudioContext ? 'Yes' : 'No'}
              </Typography>
            </Box>

            <Typography variant="h6">Performance</Typography>
            <Box>
              <Typography variant="body2">
                <strong>Memory:</strong> {(performance as any).memory ? 
                  `${Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024)}MB used` : 
                  'Not available'}
              </Typography>
            </Box>
          </Stack>
        </TabPanel>

        <TabPanel value={tabValue} index={4}>
          <Stack spacing={3}>
            <Typography variant="h6">Debug Configuration</Typography>
            
            {/* Quick Presets */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>Quick Presets</Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {Object.entries(DEBUG_PRESETS).map(([key]) => (
                  <Button
                    key={key}
                    variant="outlined"
                    size="small"
                    onClick={() => handlePresetApply(key as keyof typeof DEBUG_PRESETS)}
                    sx={{ textTransform: 'capitalize' }}
                  >
                    {key}
                  </Button>
                ))}
              </Stack>
            </Box>

            {/* Individual Settings */}
            <FormControl component="fieldset">
              <FormLabel component="legend">Debug Features</FormLabel>
              <FormGroup>
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.enabled}
                      onChange={(e) => handleConfigChange('enabled', e.target.checked)}
                    />
                  }
                  label="Enable Debug Logging"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.showFab}
                      onChange={(e) => handleConfigChange('showFab', e.target.checked)}
                    />
                  }
                  label="Show Debug FAB Button"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.showKeyboardShortcut}
                      onChange={(e) => handleConfigChange('showKeyboardShortcut', e.target.checked)}
                    />
                  }
                  label="Enable Keyboard Shortcut (Ctrl+D)"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.autoOpen}
                      onChange={(e) => handleConfigChange('autoOpen', e.target.checked)}
                    />
                  }
                  label="Auto-open Debug Panel"
                />
              </FormGroup>
            </FormControl>

            {/* Log Level */}
            <FormControl>
              <FormLabel>Log Level</FormLabel>
              <Select
                value={config.logLevel}
                onChange={(e) => handleConfigChange('logLevel', e.target.value)}
                size="small"
              >
                <MenuItem value="debug">Debug (All messages)</MenuItem>
                <MenuItem value="info">Info (Info, Warn, Error)</MenuItem>
                <MenuItem value="warn">Warn (Warn, Error only)</MenuItem>
                <MenuItem value="error">Error (Errors only)</MenuItem>
              </Select>
            </FormControl>

            {/* Max Logs */}
            <FormControl>
              <FormLabel>Maximum Logs to Keep</FormLabel>
              <TextField
                type="number"
                value={config.maxLogs}
                onChange={(e) => handleConfigChange('maxLogs', parseInt(e.target.value, 10))}
                size="small"
                inputProps={{ min: 10, max: 10000 }}
              />
            </FormControl>

            {/* Current Status */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>Current Status</Typography>
              <Typography variant="body2" color="text.secondary">
                Debug Enabled: {config.enabled ? 'Yes' : 'No'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Current Log Count: {logs.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Active Log Level: {config.logLevel.toUpperCase()}
              </Typography>
            </Box>

            {/* Environment Variables Info */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>Environment Variables</Typography>
              <Typography variant="caption" color="text.secondary">
                You can set these in your .env file:
              </Typography>
              <Box component="pre" sx={{ fontSize: '0.75rem', bgcolor: 'grey.100', p: 1, borderRadius: 1, mt: 1 }}>
{`VITE_DEBUG_ENABLED=true
VITE_DEBUG_SHOW_FAB=true
VITE_DEBUG_SHOW_KEYBOARD_SHORTCUT=true
VITE_DEBUG_AUTO_OPEN=false
VITE_DEBUG_LOG_LEVEL=debug
VITE_DEBUG_MAX_LOGS=1000`}
              </Box>
            </Box>

            {/* URL Parameters Info */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>URL Parameters</Typography>
              <Typography variant="caption" color="text.secondary">
                Quick overrides via URL:
              </Typography>
              <Box component="pre" sx={{ fontSize: '0.75rem', bgcolor: 'grey.100', p: 1, borderRadius: 1, mt: 1 }}>
{`?debug=true&debug-fab=true&debug-auto-open=true&debug-level=info`}
              </Box>
            </Box>
          </Stack>
        </TabPanel>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}