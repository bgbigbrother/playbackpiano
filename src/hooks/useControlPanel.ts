import { useState, useCallback, useRef, useEffect } from 'react';

export interface ControlPanelState {
  // Panel visibility
  isOpen: boolean;
  
  // Feature toggles
  keyMarkingEnabled: boolean;
  metronomeVisible: boolean;
  labelsVisible: boolean;
  recorderVisible: boolean;
  
  // Key marking state
  markedKeys: Set<string>;
  
  // Note logging state
  noteLog: NoteEntry[];
  
  // Metronome state
  metronomeActive: boolean;
  bpm: number;
  
  // Recording state
  isRecording: boolean;
  recordedAudio: Blob | null;
  recordingDuration: number;
}

export interface NoteEntry {
  id: string;
  note: string;
  timestamp: number;
  velocity?: number;
  duration?: number;
}

export interface ControlPanelActions {
  // Panel actions
  togglePanel: () => void;
  setIsOpen: (open: boolean) => void;
  
  // Feature toggle actions
  toggleKeyMarking: () => void;
  toggleMetronomeVisible: () => void;
  toggleLabelsVisible: () => void;
  toggleRecorderVisible: () => void;
  
  // Key marking actions
  toggleMarkedKey: (note: string) => void;
  clearMarkedKeys: () => void;
  
  // Note logging actions
  addNoteEntry: (note: string) => void;
  clearNoteLog: () => void;
  
  // Metronome actions
  toggleMetronome: () => void;
  setBPM: (bpm: number) => void;
  
  // Recording actions
  setIsRecording: (recording: boolean) => void;
  setRecordedAudio: (audio: Blob | null) => void;
  setRecordingDuration: (duration: number) => void;
}

export interface UseControlPanelReturn extends ControlPanelState, ControlPanelActions {
  keyMarkingEnabledRef: React.MutableRefObject<boolean>;
}

/**
 * Hook for managing control panel state and actions
 * Provides centralized state management for all control panel features
 */
export function useControlPanel(): UseControlPanelReturn {
  // Panel visibility state
  const [isOpen, setIsOpen] = useState(false);
  
  // Feature toggle states
  const [keyMarkingEnabled, setKeyMarkingEnabled] = useState(false);
  const keyMarkingEnabledRef = useRef(keyMarkingEnabled);
  
  // Update ref whenever state changes
  useEffect(() => {
    keyMarkingEnabledRef.current = keyMarkingEnabled;
  }, [keyMarkingEnabled]);
  
  const [metronomeVisible, setMetronomeVisible] = useState(false);
  const [labelsVisible, setLabelsVisible] = useState(true); // Default to visible
  const [recorderVisible, setRecorderVisible] = useState(false);
  
  // Key marking state
  const [markedKeys, setMarkedKeys] = useState<Set<string>>(new Set());
  
  // Note logging state
  const [noteLog, setNoteLog] = useState<NoteEntry[]>([]);
  
  // Metronome state
  const [metronomeActive, setMetronomeActive] = useState(false);
  const [bpm, setBPMState] = useState(100); // Default BPM
  
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);

  // Panel actions
  const togglePanel = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  // Feature toggle actions
  const toggleKeyMarking = useCallback(() => {
    setKeyMarkingEnabled(prev => {
      const newValue = !prev;
      
      // Update ref immediately for synchronous access
      keyMarkingEnabledRef.current = newValue;
      
      // Clear marked keys when disabling key marking mode
      if (!newValue) {
        setMarkedKeys(new Set());
      }
      
      return newValue;
    });
  }, []);

  const toggleMetronomeVisible = useCallback(() => {
    setMetronomeVisible(prev => !prev);
  }, []);

  const toggleLabelsVisible = useCallback(() => {
    setLabelsVisible(prev => !prev);
  }, []);

  const toggleRecorderVisible = useCallback(() => {
    setRecorderVisible(prev => !prev);
  }, []);

  // Key marking actions
  const toggleMarkedKey = useCallback((note: string) => {
    setMarkedKeys(prev => {
      const newSet = new Set(prev);
      if (newSet.has(note)) {
        newSet.delete(note);
      } else {
        newSet.add(note);
      }
      return newSet;
    });
  }, []);

  const clearMarkedKeys = useCallback(() => {
    setMarkedKeys(new Set());
  }, []);

  // Note logging actions
  const addNoteEntry = useCallback((note: string) => {
    const entry: NoteEntry = {
      id: `${Date.now()}-${Math.random()}`,
      note,
      timestamp: Date.now(),
    };
    
    setNoteLog(prev => {
      const newLog = [...prev, entry];
      // Keep only the last 100 entries to prevent memory issues
      return newLog.slice(-100);
    });
  }, []);

  const clearNoteLog = useCallback(() => {
    setNoteLog([]);
  }, []);

  // Metronome actions
  const toggleMetronome = useCallback(() => {
    setMetronomeActive(prev => !prev);
  }, []);

  const setBPM = useCallback((newBPM: number) => {
    // Clamp BPM between 30 and 300
    const clampedBPM = Math.max(30, Math.min(300, newBPM));
    setBPMState(clampedBPM);
  }, []);

  return {
    // State
    isOpen,
    keyMarkingEnabled,
    keyMarkingEnabledRef, // Expose the ref for synchronous access
    metronomeVisible,
    labelsVisible,
    recorderVisible,
    markedKeys,
    noteLog,
    metronomeActive,
    bpm,
    isRecording,
    recordedAudio,
    recordingDuration,
    
    // Actions
    togglePanel,
    setIsOpen,
    toggleKeyMarking,
    toggleMetronomeVisible,
    toggleLabelsVisible,
    toggleRecorderVisible,
    toggleMarkedKey,
    clearMarkedKeys,
    addNoteEntry,
    clearNoteLog,
    toggleMetronome,
    setBPM,
    setIsRecording,
    setRecordedAudio,
    setRecordingDuration,
  };
}