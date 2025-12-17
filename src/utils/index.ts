// Utility function exports will be added here as utilities are implemented
export { AudioEngine } from './AudioEngine';
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