/**
 * Piano keyboard layout calculation utilities
 * Handles generation of 37 white keys and corresponding black keys
 * with responsive width calculations and positioning
 */

export interface KeyInfo {
  note: string;
  octave: number;
  isBlack: boolean;
  position: number; // Position index for layout calculations
}

export interface BlackKeyInfo extends KeyInfo {
  offsetPercentage: number; // Percentage offset from left edge for positioning
}

export interface KeyboardLayout {
  whiteKeys: KeyInfo[];
  blackKeys: BlackKeyInfo[];
  whiteKeyWidth: number; // Percentage width per white key
  blackKeyWidth: number; // Percentage width per black key
}

// Piano note names in chromatic order
const CHROMATIC_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/**
 * Generates the complete keyboard layout based on the 48-key mapping file
 */
export async function generateKeyboardLayoutFromMapping(): Promise<KeyboardLayout> {
  const keyMappingData = await load48KeyMapping();
  
  if (!keyMappingData) {
    console.warn('Failed to load 48-key mapping, using empty layout');
    return {
      whiteKeys: [],
      blackKeys: [],
      whiteKeyWidth: 0,
      blackKeyWidth: 0
    };
  }

  const whiteKeys: KeyInfo[] = [];
  const blackKeys: BlackKeyInfo[] = [];
  
  // Count white keys (excluding null keys)
  const validWhiteKeys = keyMappingData.whiteKeys.filter((k: any) => k.note);
  const whiteKeyCount = validWhiteKeys.length;
  
  // Calculate responsive widths
  const whiteKeyWidth = 100 / whiteKeyCount;
  const blackKeyWidth = whiteKeyWidth * 0.6;
  
  // Process white keys
  validWhiteKeys.forEach((keyData: any, index: number) => {
    whiteKeys.push({
      note: keyData.note,
      octave: keyData.octave,
      isBlack: false,
      position: index
    });
  });
  
  // Process black keys
  if (keyMappingData.blackKeys) {
    keyMappingData.blackKeys.forEach((keyData: any, index: number) => {
      if (keyData.noteSharp) {
        // Find the position between white keys for this black key
        // Black keys are positioned based on their octave and note name
        const whiteKeyIndex = whiteKeys.findIndex(wk => {
          const wkNote = wk.note.replace(/\d+/, '');
          const blackNote = keyData.noteName.replace('#', '');
          return wk.octave === keyData.octave && wkNote === blackNote;
        });
        
        const offsetPercentage = whiteKeyIndex >= 0 
          ? (whiteKeyIndex * whiteKeyWidth) + (whiteKeyWidth * 0.7)
          : (index * whiteKeyWidth * 1.5); // Fallback positioning
        
        blackKeys.push({
          note: keyData.noteSharp,
          octave: keyData.octave,
          isBlack: true,
          position: index,
          offsetPercentage
        });
      }
    });
  }
  
  return {
    whiteKeys,
    blackKeys,
    whiteKeyWidth,
    blackKeyWidth
  };
}

// Cache for the keyboard layout
let cachedLayout: KeyboardLayout | null = null;

/**
 * Generates the complete keyboard layout with caching
 */
export function generateKeyboardLayout(): KeyboardLayout {
  // Return cached layout if available
  if (cachedLayout) {
    return cachedLayout;
  }
  
  // Return empty layout if not initialized yet
  console.warn('Keyboard layout not initialized yet');
  return {
    whiteKeys: [],
    blackKeys: [],
    whiteKeyWidth: 0,
    blackKeyWidth: 0
  };
}

/**
 * Initializes the keyboard layout by loading from the 48-key mapping file
 */
export async function initializeKeyboardLayout(): Promise<void> {
  cachedLayout = await generateKeyboardLayoutFromMapping();
}

/**
 * Calculates responsive width for white keys based on the current layout
 */
export function calculateWhiteKeyWidth(): string {
  const layout = generateKeyboardLayout();
  return `${layout.whiteKeyWidth}%`;
}

/**
 * Calculates responsive width for black keys based on the current layout
 */
export function calculateBlackKeyWidth(): string {
  const layout = generateKeyboardLayout();
  return `${layout.blackKeyWidth}%`;
}

/**
 * Calculates the left offset position for a black key
 */
export function calculateBlackKeyOffset(whiteKeyIndex: number): string {
  const layout = generateKeyboardLayout();
  const offset = (whiteKeyIndex * layout.whiteKeyWidth) + (layout.whiteKeyWidth * 0.7);
  return `${offset}%`;
}

/**
 * Gets all piano notes from the current keyboard layout
 */
export function getAllPianoNotes(): string[] {
  const layout = generateKeyboardLayout();
  
  // Combine white and black keys, sort by chromatic order
  const allKeys = [...layout.whiteKeys, ...layout.blackKeys];
  
  // Sort by note order (C2, C#2, D2, D#2, etc.)
  allKeys.sort((a, b) => {
    if (a.octave !== b.octave) {
      return a.octave - b.octave;
    }
    
    const aIndex = CHROMATIC_NOTES.indexOf(a.note.replace(/\d+/, ''));
    const bIndex = CHROMATIC_NOTES.indexOf(b.note.replace(/\d+/, ''));
    
    return aIndex - bIndex;
  });
  
  return allKeys.map(key => key.note);
}
/**
 * Loads the 48-key mapping from the JSON file
 */
async function load48KeyMapping(): Promise<any> {
  try {
    // Try to import the JSON file directly (works in both Vite and tests)
    const keyMapping = await import('/48_key_mapping.json');
    return keyMapping.default || keyMapping;
  } catch (error) {
    // Fallback to fetch for production
    try {
      const response = await fetch('/48_key_mapping.json');
      if (!response.ok) {
        throw new Error('Failed to load 48-key mapping');
      }
      return await response.json();
    } catch (fetchError) {
      console.error('Error loading 48-key mapping:', error);
      return null;
    }
  }
}

// Cache for the keyboard mapping
let cachedMapping: Record<string, string> | null = null;

/**
 * Creates a mapping from computer keyboard keys to piano notes
 * Uses the 48_key_mapping.json file for the mapping
 */
export async function createKeyboardMapping(): Promise<Record<string, string>> {
  if (cachedMapping) {
    return cachedMapping;
  }

  const mapping: Record<string, string> = {};
  const keyMappingData = await load48KeyMapping();
  
  if (!keyMappingData) {
    console.warn('Failed to load 48-key mapping, using empty mapping');
    return mapping;
  }

  // Map white keys
  if (keyMappingData.whiteKeys) {
    keyMappingData.whiteKeys.forEach((keyData: any) => {
      if (keyData.key && keyData.note) {
        mapping[keyData.key.toLowerCase()] = keyData.note;
      }
    });
  }

  // Map black keys (using sharp notation)
  if (keyMappingData.blackKeys) {
    keyMappingData.blackKeys.forEach((keyData: any) => {
      if (keyData.key && keyData.noteSharp) {
        mapping[keyData.key.toLowerCase()] = keyData.noteSharp;
      }
    });
  }

  cachedMapping = mapping;
  return mapping;
}

/**
 * Synchronous version that returns the cached mapping
 * Must be called after createKeyboardMapping() has been called at least once
 */
export function getKeyboardMapping(): Record<string, string> {
  return cachedMapping || {};
}

/**
 * Gets the piano note for a given keyboard key
 */
export function getPianoNoteForKey(key: string): string | null {
  const mapping = getKeyboardMapping();
  return mapping[key.toLowerCase()] || null;
}

/**
 * Gets the keyboard key for a given piano note
 */
export function getKeyboardKeyForNote(note: string): string | null {
  const mapping = getKeyboardMapping();
  const entry = Object.entries(mapping).find(([, pianoNote]) => pianoNote === note);
  return entry ? entry[0] : null;
}

/**
 * Initializes both the keyboard mapping and layout by loading the 48-key mapping file
 * Should be called on app startup
 */
export async function initializeKeyboardMapping(): Promise<void> {
  await Promise.all([
    createKeyboardMapping(),
    initializeKeyboardLayout()
  ]);
}