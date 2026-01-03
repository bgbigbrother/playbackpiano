import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { ControlPanel } from '../components/ControlPanel';
import { useControlPanel } from '../hooks/useControlPanel';

const theme = createTheme();

// Test wrapper component that uses the hook
function TestControlPanel() {
  const controlPanelState = useControlPanel();
  
  return (
    <ThemeProvider theme={theme}>
      <ControlPanel controlPanelState={controlPanelState} />
    </ThemeProvider>
  );
}

describe('ControlPanel', () => {
  it('renders without crashing', () => {
    render(<TestControlPanel />);
  });

  it('displays the correct title when opened', () => {
    const TestWrapper = () => {
      const controlPanelState = useControlPanel();
      
      // Open the panel for testing
      React.useEffect(() => {
        controlPanelState.setIsOpen(true);
      }, []);
      
      return (
        <ThemeProvider theme={theme}>
          <ControlPanel controlPanelState={controlPanelState} />
        </ThemeProvider>
      );
    };

    render(<TestWrapper />);
    expect(screen.getByText('Piano Controls')).toBeInTheDocument();
  });

  it('shows control panel content when opened', () => {
    const TestWrapper = () => {
      const controlPanelState = useControlPanel();
      
      // Open the panel for testing
      React.useEffect(() => {
        controlPanelState.setIsOpen(true);
      }, []);
      
      return (
        <ThemeProvider theme={theme}>
          <ControlPanel controlPanelState={controlPanelState} />
        </ThemeProvider>
      );
    };

    render(<TestWrapper />);
    expect(screen.getByText('Piano Controls')).toBeInTheDocument();
    expect(screen.getByText('Features')).toBeInTheDocument();
    expect(screen.getByText('Key Marking')).toBeInTheDocument();
    // The LabelToggleControls shows "Hide Key Labels" when labels are visible (default state)
    expect(screen.getByText('Hide Key Labels')).toBeInTheDocument();
    expect(screen.getByText('Advanced Features')).toBeInTheDocument();
    expect(screen.getByText('Metronome')).toBeInTheDocument();
    expect(screen.getByText('Audio Recorder')).toBeInTheDocument();
  });
});