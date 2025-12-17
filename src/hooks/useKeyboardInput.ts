import { useEffect, useCallback, useRef } from 'react';
import { getPianoNoteForKey } from '../utils/keyboardLayout';

export interface UseKeyboardInputProps {
  onKeyPress?: (note: string) => void;
  onKeyRelease?: (note: string) => void;
  enabled?: boolean;
}

/**
 * Custom hook to handle keyboard input for piano keys
 * Maps computer keyboard keys to piano notes and manages key press/release events
 */
export function useKeyboardInput({
  onKeyPress,
  onKeyRelease,
  enabled = true
}: UseKeyboardInputProps) {
  const pressedKeysRef = useRef<Set<string>>(new Set());

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;
    
    // Prevent default behavior for mapped keys
    const note = getPianoNoteForKey(event.key);
    if (!note) return;
    
    // Prevent key repeat
    if (pressedKeysRef.current.has(event.key)) return;
    
    // Prevent default browser behavior for mapped keys
    event.preventDefault();
    
    // Add to pressed keys set
    pressedKeysRef.current.add(event.key);
    
    // Trigger piano note
    onKeyPress?.(note);
  }, [enabled, onKeyPress]);

  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;
    
    const note = getPianoNoteForKey(event.key);
    if (!note) return;
    
    // Remove from pressed keys set
    pressedKeysRef.current.delete(event.key);
    
    // Release piano note
    onKeyRelease?.(note);
  }, [enabled, onKeyRelease]);

  // Handle window blur to release all keys
  const handleWindowBlur = useCallback(() => {
    if (!enabled) return;
    
    // Release all currently pressed keys
    pressedKeysRef.current.forEach(key => {
      const note = getPianoNoteForKey(key);
      if (note) {
        onKeyRelease?.(note);
      }
    });
    
    // Clear pressed keys set
    pressedKeysRef.current.clear();
  }, [enabled, onKeyRelease]);

  useEffect(() => {
    if (!enabled) return;

    // Add event listeners
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleWindowBlur);

    // Cleanup function
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleWindowBlur);
      
      // Release any remaining pressed keys
      pressedKeysRef.current.clear();
    };
  }, [enabled, handleKeyDown, handleKeyUp, handleWindowBlur]);

  return {
    // Return the current pressed keys for external use if needed
    getPressedKeys: () => Array.from(pressedKeysRef.current)
  };
}