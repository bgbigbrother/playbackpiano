// Utility function exports will be added here as utilities are implemented
export { AudioEngine } from './AudioEngine';
export { KeyMarkingManager } from './KeyMarkingManager';
export { NoteLogger, type NoteEntry } from './NoteLogger';
export { MetronomeEngine, type MetronomeConfig, type MetronomeError } from './MetronomeEngine';
export { AudioRecorder, type AudioRecorderError, type RecordingConfig, type TimedNoteEvent, type RecordingSession } from './AudioRecorder';
export { PerformanceReplay, type PerformanceReplayError } from './PerformanceReplay';
export { MP3Converter, type MP3ConversionConfig, type MP3ConversionProgress, type MP3ConversionResult } from './MP3Converter';
export { SettingsManager, settingsManager, type UserSettings, type SettingsError } from './SettingsManager';
export { 
  generateKeyboardLayout, 
  calculateWhiteKeyWidth, 
  calculateBlackKeyWidth, 
  calculateBlackKeyOffset,
  getAllPianoNotes,
  initializeKeyboardMapping,
  getPianoNoteForKey,
  getKeyboardKeyForNote,
  type KeyInfo,
  type BlackKeyInfo,
  type KeyboardLayout
} from './keyboardLayout';

// Browser Compatibility and Error Handling
export { 
  BrowserCompatibility, 
  getBrowserCompatibility, 
  browserSupport,
  type BrowserFeatureSupport,
  type CompatibilityIssue
} from './BrowserCompatibility';