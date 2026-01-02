# Debug Console Configuration

The debug console can now be controlled through multiple configuration methods, allowing you to show/hide it based on environment, user preferences, or runtime conditions.

## 🎛️ **Configuration Methods**

### 1. **Environment Variables** (Recommended)
Set these in your `.env.local`, `.env.development`, or `.env.production` files:

```bash
# Enable/disable debug features entirely
VITE_DEBUG_ENABLED=true

# Show the debug FAB button in the UI
VITE_DEBUG_SHOW_FAB=true

# Enable Ctrl+D keyboard shortcut to open debug panel
VITE_DEBUG_SHOW_KEYBOARD_SHORTCUT=true

# Auto-open debug panel on app start (useful for development)
VITE_DEBUG_AUTO_OPEN=false

# Log level: debug, info, warn, error
VITE_DEBUG_LOG_LEVEL=debug

# Maximum number of logs to keep in memory
VITE_DEBUG_MAX_LOGS=1000
```

### 2. **URL Parameters** (Quick Testing)
Add these to your URL for quick overrides:

```
http://localhost:5173/?debug=true&debug-fab=true&debug-auto-open=true&debug-level=info
```

Available parameters:
- `debug=true/false` - Enable/disable debug features
- `debug-fab=true/false` - Show/hide the FAB button
- `debug-auto-open=true/false` - Auto-open the debug panel
- `debug-level=debug/info/warn/error` - Set log level

### 3. **Runtime Configuration** (Persistent)
Use the Configuration tab in the debug panel or browser console:

```javascript
// Save configuration (persists in localStorage)
window.debugConfig.save({
  enabled: true,
  showFab: false,
  logLevel: 'warn'
});

// Apply a preset
window.debugConfig.applyPreset('production');

// Get current configuration
window.debugConfig.get();
```

### 4. **Programmatic Control**
```javascript
import { saveDebugConfig, applyDebugPreset } from './src/config/debugConfig';

// Save specific settings
saveDebugConfig({ enabled: false, showFab: false });

// Apply preset
applyDebugPreset('production');
```

## 📋 **Configuration Presets**

### Development (Default in dev mode)
```javascript
{
  enabled: true,
  showFab: true,
  showKeyboardShortcut: true,
  autoOpen: false,
  logLevel: 'debug',
  maxLogs: 1000
}
```

### Production (Default in production)
```javascript
{
  enabled: false,
  showFab: false,
  showKeyboardShortcut: false,
  autoOpen: false,
  logLevel: 'error',
  maxLogs: 100
}
```

### Testing (For debugging issues)
```javascript
{
  enabled: true,
  showFab: true,
  showKeyboardShortcut: true,
  autoOpen: true,
  logLevel: 'debug',
  maxLogs: 2000
}
```

### Minimal (Errors only, no UI)
```javascript
{
  enabled: true,
  showFab: false,
  showKeyboardShortcut: false,
  autoOpen: false,
  logLevel: 'error',
  maxLogs: 50
}
```

## 🔧 **Configuration Options**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | boolean | `true` (dev), `false` (prod) | Enable/disable all debug features |
| `showFab` | boolean | `true` (dev), `false` (prod) | Show the floating debug button |
| `showKeyboardShortcut` | boolean | `true` (dev), `false` (prod) | Enable Ctrl+D shortcut |
| `autoOpen` | boolean | `false` | Auto-open debug panel on app start |
| `logLevel` | string | `'debug'` (dev), `'error'` (prod) | Minimum log level to capture |
| `maxLogs` | number | `1000` (dev), `100` (prod) | Maximum logs to keep in memory |

## 🎯 **Common Use Cases**

### Hide Debug Console in Production
```bash
# .env.production
VITE_DEBUG_ENABLED=false
```

### Show Only Errors in Production
```bash
# .env.production
VITE_DEBUG_ENABLED=true
VITE_DEBUG_SHOW_FAB=false
VITE_DEBUG_SHOW_KEYBOARD_SHORTCUT=false
VITE_DEBUG_LOG_LEVEL=error
```

### Development with Auto-Open
```bash
# .env.development
VITE_DEBUG_AUTO_OPEN=true
```

### Quick Testing Mode
```
http://localhost:5173/?debug=true&debug-auto-open=true&debug-level=debug
```

### Disable Debug Button but Keep Logging
```bash
VITE_DEBUG_ENABLED=true
VITE_DEBUG_SHOW_FAB=false
VITE_DEBUG_SHOW_KEYBOARD_SHORTCUT=true
```

## 🔄 **Configuration Priority**

Configuration is merged in this order (later overrides earlier):

1. **Default configuration** (hardcoded)
2. **Environment variables** (from .env files)
3. **Runtime configuration** (from localStorage)
4. **URL parameters** (highest priority)

## 💾 **Persistence**

- **Environment variables**: Set at build time
- **Runtime configuration**: Saved to localStorage, persists across sessions
- **URL parameters**: Temporary, only for current session

## 🛠️ **Development Workflow**

### For Development
1. Use `.env.development` with debug enabled
2. Set `VITE_DEBUG_AUTO_OPEN=true` if you want it to open automatically
3. Use `debug=true` URL parameter for quick testing

### For Production
1. Use `.env.production` with debug disabled
2. Or set `VITE_DEBUG_ENABLED=false` to completely hide debug features
3. Consider keeping error logging enabled for troubleshooting

### For Testing/Debugging Issues
1. Use URL parameters: `?debug=true&debug-auto-open=true`
2. Or apply the 'testing' preset in the Configuration tab
3. Export logs for analysis

## 🎨 **UI Behavior**

- **Debug FAB**: Only shows when `enabled=true` AND `showFab=true`
- **Keyboard Shortcut**: Only works when `enabled=true` AND `showKeyboardShortcut=true`
- **Debug Panel**: Only renders when `enabled=true`
- **Auto-open**: Only works when `enabled=true` AND `autoOpen=true`

This gives you complete control over when and how the debug console appears!