// Component exports will be added here as components are implemented
export { PianoKey, type PianoKeyProps } from './PianoKey';
export { PianoKeyboard, type PianoKeyboardProps } from './PianoKeyboard';
export { LoadingIndicator, type LoadingIndicatorProps } from './LoadingIndicator';
export { ErrorBoundary } from './ErrorBoundary';
export { DebugPanel } from './DebugPanel';
export { ControlPanel, type ControlPanelProps } from './ControlPanel';
export { PanelToggle, type PanelToggleProps } from './PanelToggle';
export { KeyMarkingControls, type KeyMarkingControlsProps } from './KeyMarkingControls';
export { NoteLoggerControls, type NoteLoggerControlsProps } from './NoteLoggerControls';
export { MetronomeControls, type MetronomeControlsProps } from './MetronomeControls';
export { LabelToggleControls, type LabelToggleControlsProps } from './LabelToggleControls';
export { AudioRecorderControls, type AudioRecorderControlsProps } from './AudioRecorderControls';

// Error Boundary Components
export { AudioRecorderErrorBoundary, useAudioRecordingSupport } from './AudioRecorderErrorBoundary';
export { MetronomeErrorBoundary, useMetronomeSupport } from './MetronomeErrorBoundary';
export { ControlPanelErrorBoundary, useFeatureSupport } from './ControlPanelErrorBoundary';