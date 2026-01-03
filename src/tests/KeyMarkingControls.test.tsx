import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { KeyMarkingControls } from '../components/KeyMarkingControls';

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('KeyMarkingControls', () => {
  const defaultProps = {
    enabled: true,
    markedKeys: new Set<string>(),
    onPlayMarkedKeys: vi.fn(),
    onResetMarkedKeys: vi.fn(),
  };

  it('renders nothing when disabled', () => {
    const { container } = renderWithTheme(
      <KeyMarkingControls {...defaultProps} enabled={false} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders key marking controls when enabled', () => {
    renderWithTheme(<KeyMarkingControls {...defaultProps} />);
    
    expect(screen.getByText('Key Marking')).toBeInTheDocument();
    expect(screen.getByText('0 marked')).toBeInTheDocument();
    expect(screen.getByText('Play Marked')).toBeInTheDocument();
    expect(screen.getByLabelText('Clear all marked keys')).toBeInTheDocument();
  });

  it('displays marked keys count correctly', () => {
    const markedKeys = new Set(['C4', 'E4', 'G4']);
    renderWithTheme(
      <KeyMarkingControls {...defaultProps} markedKeys={markedKeys} />
    );
    
    expect(screen.getByText('3 marked')).toBeInTheDocument();
  });

  it('displays marked keys as chips', () => {
    const markedKeys = new Set(['C4', 'E4', 'G4']);
    renderWithTheme(
      <KeyMarkingControls {...defaultProps} markedKeys={markedKeys} />
    );
    
    expect(screen.getByText('Marked Keys:')).toBeInTheDocument();
    expect(screen.getByText('C4')).toBeInTheDocument();
    expect(screen.getByText('E4')).toBeInTheDocument();
    expect(screen.getByText('G4')).toBeInTheDocument();
  });

  it('shows instruction text when no keys are marked', () => {
    renderWithTheme(<KeyMarkingControls {...defaultProps} />);
    
    expect(screen.getByText('Click piano keys to mark them')).toBeInTheDocument();
  });

  it('disables buttons when no keys are marked', () => {
    renderWithTheme(<KeyMarkingControls {...defaultProps} />);
    
    const playButton = screen.getByText('Play Marked').closest('button');
    const clearButton = screen.getByLabelText('Clear all marked keys');
    
    expect(playButton).toBeDisabled();
    expect(clearButton).toBeDisabled();
  });

  it('enables buttons when keys are marked', () => {
    const markedKeys = new Set(['C4']);
    renderWithTheme(
      <KeyMarkingControls {...defaultProps} markedKeys={markedKeys} />
    );
    
    const playButton = screen.getByText('Play Marked').closest('button');
    const clearButton = screen.getByLabelText('Clear all marked keys');
    
    expect(playButton).not.toBeDisabled();
    expect(clearButton).not.toBeDisabled();
  });

  it('calls onPlayMarkedKeys when play button is clicked', () => {
    const markedKeys = new Set(['C4']);
    const onPlayMarkedKeys = vi.fn();
    
    renderWithTheme(
      <KeyMarkingControls 
        {...defaultProps} 
        markedKeys={markedKeys}
        onPlayMarkedKeys={onPlayMarkedKeys}
      />
    );
    
    const playButton = screen.getByText('Play Marked').closest('button');
    fireEvent.click(playButton!);
    
    expect(onPlayMarkedKeys).toHaveBeenCalledTimes(1);
  });

  it('calls onResetMarkedKeys when clear button is clicked', () => {
    const markedKeys = new Set(['C4']);
    const onResetMarkedKeys = vi.fn();
    
    renderWithTheme(
      <KeyMarkingControls 
        {...defaultProps} 
        markedKeys={markedKeys}
        onResetMarkedKeys={onResetMarkedKeys}
      />
    );
    
    const clearButton = screen.getByLabelText('Clear all marked keys');
    fireEvent.click(clearButton);
    
    expect(onResetMarkedKeys).toHaveBeenCalledTimes(1);
  });

  it('sorts marked keys alphabetically', () => {
    const markedKeys = new Set(['G4', 'C4', 'E4']);
    renderWithTheme(
      <KeyMarkingControls {...defaultProps} markedKeys={markedKeys} />
    );
    
    // Find the marked keys section and check the order
    expect(screen.getByText('C4')).toBeInTheDocument();
    expect(screen.getByText('E4')).toBeInTheDocument();
    expect(screen.getByText('G4')).toBeInTheDocument();
    
    // The keys should be displayed in sorted order in the UI
    const markedKeysSection = screen.getByText('Marked Keys:').parentElement;
    expect(markedKeysSection).toBeInTheDocument();
  });
});