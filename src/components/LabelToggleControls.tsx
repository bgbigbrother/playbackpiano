import React from 'react';
import {
  Switch,
  FormControlLabel,
} from '@mui/material';

export interface LabelToggleControlsProps {
  labelsVisible: boolean;
  onToggle: () => void;
}

/**
 * LabelToggleControls component provides a simple toggle for
 * the visibility of piano key labels (note names and keyboard bindings).
 */
export const LabelToggleControls: React.FC<LabelToggleControlsProps> = ({
  labelsVisible,
  onToggle,
}) => {
  return (
    <FormControlLabel
      control={
        <Switch
          checked={labelsVisible}
          onChange={onToggle}
          color="primary"
          size="small"
        />
      }
      label={labelsVisible ? 'Hide Key Labels' : 'Show Key Labels'}
      sx={{
        width: '100%',
        ml: 0,
      }}
    />
  );
};