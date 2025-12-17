import React, { useState, useCallback, useMemo } from 'react';
import { Box, styled } from '@mui/material';
import { PianoKey } from './PianoKey';
import { generateKeyboardLayout } from '../utils/keyboardLayout';

export interface PianoKeyboardProps {
  onKeyPress?: (note: string) => void;
  onKeyRelease?: (note: string) => void;
  pressedKeys?: Set<string>;
}

// Styled container for the piano keyboard
const KeyboardContainer = styled(Box)(() => ({
  position: 'relative',
  width: '100%',
  height: '200px',
  display: 'flex',
  alignItems: 'flex-end',
  userSelect: 'none',
  touchAction: 'manipulation', // Optimize for touch devices
}));

// Container for white keys
const WhiteKeysContainer = styled(Box)({
  position: 'relative',
  width: '100%',
  height: '100%',
  display: 'flex',
  zIndex: 1,
});

// Container for black keys
const BlackKeysContainer = styled(Box)({
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  zIndex: 2,
  pointerEvents: 'none', // Allow clicks to pass through to white keys
});

/**
 * PianoKeyboard component that renders a complete 37-key piano keyboard
 * with responsive design and Material-UI styling
 */
export const PianoKeyboard: React.FC<PianoKeyboardProps> = ({
  onKeyPress,
  onKeyRelease,
  pressedKeys = new Set()
}) => {
  const [localPressedKeys, setLocalPressedKeys] = useState<Set<string>>(new Set());
  
  // Memoize the keyboard layout to avoid recalculating on every render
  const layout = useMemo(() => generateKeyboardLayout(), []);
  
  // Combine external pressed keys with local state
  const allPressedKeys = new Set([...pressedKeys, ...localPressedKeys]);
  
  const handleKeyPress = useCallback((note: string) => {
    setLocalPressedKeys(prev => new Set([...prev, note]));
    onKeyPress?.(note);
  }, [onKeyPress]);
  
  const handleKeyRelease = useCallback((note: string) => {
    setLocalPressedKeys(prev => {
      const newSet = new Set(prev);
      newSet.delete(note);
      return newSet;
    });
    onKeyRelease?.(note);
  }, [onKeyRelease]);

  return (
    <KeyboardContainer>
      {/* White Keys */}
      <WhiteKeysContainer>
        {layout.whiteKeys.map((key) => (
          <PianoKey
            key={key.note}
            note={key.note}
            isPressed={allPressedKeys.has(key.note)}
            isBlack={false}
            width={`${layout.whiteKeyWidth}%`}
            onPress={handleKeyPress}
            onRelease={handleKeyRelease}
          />
        ))}
      </WhiteKeysContainer>
      
      {/* Black Keys */}
      <BlackKeysContainer>
        {layout.blackKeys.map((key) => (
          <PianoKey
            key={key.note}
            note={key.note}
            isPressed={allPressedKeys.has(key.note)}
            isBlack={true}
            width={`${layout.blackKeyWidth}%`}
            onPress={handleKeyPress}
            onRelease={handleKeyRelease}
            style={{
              left: `${key.offsetPercentage}%`,
              pointerEvents: 'auto' // Enable clicks on black keys
            }}
          />
        ))}
      </BlackKeysContainer>
    </KeyboardContainer>
  );
};