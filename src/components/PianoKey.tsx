import React from 'react';
import { Button, styled, Box } from '@mui/material';
import { getKeyboardKeyForNote } from '../utils/keyboardLayout';

export interface PianoKeyProps {
  note: string;
  isPressed: boolean;
  isBlack: boolean;
  isMarked?: boolean;
  labelsVisible?: boolean;
  width: string;
  onPress: (note: string) => void;
  onRelease: (note: string) => void;
  style?: React.CSSProperties;
}

// Styled white key component
const WhiteKeyButton = styled(Button, {
  shouldForwardProp: (prop) => prop !== 'isPressed' && prop !== 'isMarked',
})<{ isPressed: boolean; isMarked: boolean }>(({ isPressed, isMarked }) => ({
  backgroundColor: isMarked 
    ? (isPressed ? '#b3d9ff' : '#e6f3ff')
    : (isPressed ? '#e0e0e0' : '#ffffff'),
  color: '#000000',
  border: isMarked ? '2px solid #2196f3' : '1px solid #cccccc',
  borderRadius: '0 0 8px 8px',
  height: '200px',
  minWidth: 0,
  padding: 0,
  position: 'relative',
  display: 'flex',
  alignItems: 'flex-end',
  justifyContent: 'center',
  paddingBottom: '16px',
  fontSize: '12px',
  fontWeight: 500,
  textTransform: 'none',
  boxShadow: isPressed 
    ? 'inset 0 2px 4px rgba(0,0,0,0.2)' 
    : (isMarked ? '0 2px 8px rgba(33,150,243,0.3)' : '0 2px 4px rgba(0,0,0,0.1)'),
  transition: 'all 0.1s ease-in-out',
  '&:hover': {
    backgroundColor: isMarked
      ? (isPressed ? '#a6d2ff' : '#d9edff')
      : (isPressed ? '#d0d0d0' : '#f5f5f5'),
    boxShadow: isPressed 
      ? 'inset 0 2px 4px rgba(0,0,0,0.2)' 
      : (isMarked ? '0 4px 12px rgba(33,150,243,0.4)' : '0 4px 8px rgba(0,0,0,0.15)'),
  },
  '&:active': {
    backgroundColor: isMarked ? '#b3d9ff' : '#e0e0e0',
    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)',
  }
}));

// Styled black key component
const BlackKeyButton = styled(Button, {
  shouldForwardProp: (prop) => prop !== 'isPressed' && prop !== 'isMarked',
})<{ isPressed: boolean; isMarked: boolean }>(({ isPressed, isMarked }) => ({
  backgroundColor: isMarked
    ? (isPressed ? '#1976d2' : '#2196f3')
    : (isPressed ? '#333333' : '#000000'),
  color: '#ffffff',
  border: isMarked ? '2px solid #64b5f6' : 'none',
  borderRadius: '0 0 4px 4px',
  height: '120px',
  minWidth: 0,
  padding: 0,
  position: 'absolute',
  display: 'flex',
  alignItems: 'flex-end',
  justifyContent: 'center',
  paddingBottom: '12px',
  fontSize: '10px',
  fontWeight: 500,
  textTransform: 'none',
  zIndex: 2,
  boxShadow: isPressed 
    ? 'inset 0 2px 4px rgba(255,255,255,0.1)' 
    : (isMarked ? '0 2px 8px rgba(33,150,243,0.5)' : '0 2px 6px rgba(0,0,0,0.3)'),
  transition: 'all 0.1s ease-in-out',
  '&:hover': {
    backgroundColor: isMarked
      ? (isPressed ? '#1565c0' : '#1976d2')
      : (isPressed ? '#444444' : '#222222'),
    boxShadow: isPressed 
      ? 'inset 0 2px 4px rgba(255,255,255,0.1)' 
      : (isMarked ? '0 4px 12px rgba(33,150,243,0.6)' : '0 4px 8px rgba(0,0,0,0.4)'),
  },
  '&:active': {
    backgroundColor: isMarked ? '#1976d2' : '#333333',
    boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.1)',
  }
}));

/**
 * PianoKey component that renders both white and black piano keys
 * with Material-UI styling and responsive design
 * Optimized with React.memo to prevent unnecessary re-renders
 */
const PianoKeyComponent: React.FC<PianoKeyProps> = ({
  note,
  isPressed,
  isBlack,
  isMarked = false,
  labelsVisible = true,
  width,
  onPress,
  onRelease,
  style = {}
}) => {
  const handleMouseDown = (event: React.MouseEvent) => {
    event.preventDefault();
    onPress(note);
  };

  const handleMouseUp = (event: React.MouseEvent) => {
    event.preventDefault();
    onRelease(note);
  };

  const handleMouseLeave = (event: React.MouseEvent) => {
    event.preventDefault();
    // Release the key when mouse leaves to prevent stuck keys
    onRelease(note);
  };

  // Prevent context menu on right click
  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
  };

  const keyStyle: React.CSSProperties = {
    width,
    ...style
  };

  // Get the keyboard key that maps to this piano note
  const keyboardKey = getKeyboardKeyForNote(note);

  if (isBlack) {
    return (
      <BlackKeyButton
        isPressed={isPressed}
        isMarked={isMarked}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onContextMenu={handleContextMenu}
        style={keyStyle}
        disableRipple
        data-testid={`piano-key-${note}`}
        aria-label={`Piano key ${note}${keyboardKey ? `, keyboard key ${keyboardKey}` : ''}${isMarked ? ', marked' : ''}`}
      >
        {labelsVisible && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ fontSize: '10px', fontWeight: 'bold' }}>{note}</Box>
            {keyboardKey && (
              <Box sx={{ 
                fontSize: '8px', 
                opacity: 0.7,
                backgroundColor: 'rgba(255,255,255,0.2)',
                borderRadius: '2px',
                padding: '1px 3px',
                minWidth: '12px',
                textAlign: 'center'
              }}>
                {keyboardKey.toUpperCase()}
              </Box>
            )}
          </Box>
        )}
      </BlackKeyButton>
    );
  }

  return (
    <WhiteKeyButton
      isPressed={isPressed}
      isMarked={isMarked}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onContextMenu={handleContextMenu}
      style={keyStyle}
      disableRipple
      data-testid={`piano-key-${note}`}
      aria-label={`Piano key ${note}${keyboardKey ? `, keyboard key ${keyboardKey}` : ''}${isMarked ? ', marked' : ''}`}
    >
      {labelsVisible && (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ fontSize: '12px', fontWeight: 'bold' }}>{note}</Box>
          {keyboardKey && (
            <Box sx={{ 
              fontSize: '10px', 
              opacity: 0.6,
              backgroundColor: 'rgba(0,0,0,0.1)',
              borderRadius: '3px',
              padding: '2px 4px',
              minWidth: '16px',
              textAlign: 'center'
            }}>
              {keyboardKey.toUpperCase()}
            </Box>
          )}
        </Box>
      )}
    </WhiteKeyButton>
  );
};

// Memoize the component to prevent unnecessary re-renders
// Only re-render when note, isPressed, isBlack, isMarked, labelsVisible, or width changes
export const PianoKey = React.memo(PianoKeyComponent, (prevProps, nextProps) => {
  return (
    prevProps.note === nextProps.note &&
    prevProps.isPressed === nextProps.isPressed &&
    prevProps.isBlack === nextProps.isBlack &&
    prevProps.isMarked === nextProps.isMarked &&
    prevProps.labelsVisible === nextProps.labelsVisible &&
    prevProps.width === nextProps.width
  );
});