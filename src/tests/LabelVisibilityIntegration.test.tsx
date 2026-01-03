import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { PianoKey } from '../components/PianoKey';

const theme = createTheme();

describe('Label Visibility Integration', () => {
  it('shows labels when labelsVisible is true', () => {
    const mockOnPress = vi.fn();
    const mockOnRelease = vi.fn();
    
    render(
      <ThemeProvider theme={theme}>
        <PianoKey
          note="C4"
          isPressed={false}
          isBlack={false}
          labelsVisible={true}
          width="50px"
          onPress={mockOnPress}
          onRelease={mockOnRelease}
        />
      </ThemeProvider>
    );
    
    // Should show the note name
    expect(screen.getByText('C4')).toBeInTheDocument();
  });

  it('hides labels when labelsVisible is false', () => {
    const mockOnPress = vi.fn();
    const mockOnRelease = vi.fn();
    
    render(
      <ThemeProvider theme={theme}>
        <PianoKey
          note="C4"
          isPressed={false}
          isBlack={false}
          labelsVisible={false}
          width="50px"
          onPress={mockOnPress}
          onRelease={mockOnRelease}
        />
      </ThemeProvider>
    );
    
    // Should not show the note name
    expect(screen.queryByText('C4')).not.toBeInTheDocument();
  });

  it('shows labels by default when labelsVisible prop is not provided', () => {
    const mockOnPress = vi.fn();
    const mockOnRelease = vi.fn();
    
    render(
      <ThemeProvider theme={theme}>
        <PianoKey
          note="C4"
          isPressed={false}
          isBlack={false}
          width="50px"
          onPress={mockOnPress}
          onRelease={mockOnRelease}
        />
      </ThemeProvider>
    );
    
    // Should show the note name by default
    expect(screen.getByText('C4')).toBeInTheDocument();
  });

  it('works correctly for black keys', () => {
    const mockOnPress = vi.fn();
    const mockOnRelease = vi.fn();
    
    // Test with labels visible
    const { rerender } = render(
      <ThemeProvider theme={theme}>
        <PianoKey
          note="C#4"
          isPressed={false}
          isBlack={true}
          labelsVisible={true}
          width="30px"
          onPress={mockOnPress}
          onRelease={mockOnRelease}
        />
      </ThemeProvider>
    );
    
    expect(screen.getByText('C#4')).toBeInTheDocument();
    
    // Test with labels hidden
    rerender(
      <ThemeProvider theme={theme}>
        <PianoKey
          note="C#4"
          isPressed={false}
          isBlack={true}
          labelsVisible={false}
          width="30px"
          onPress={mockOnPress}
          onRelease={mockOnRelease}
        />
      </ThemeProvider>
    );
    
    expect(screen.queryByText('C#4')).not.toBeInTheDocument();
  });

  it('maintains functionality when labels are hidden', () => {
    const mockOnPress = vi.fn();
    const mockOnRelease = vi.fn();
    
    render(
      <ThemeProvider theme={theme}>
        <PianoKey
          note="C4"
          isPressed={false}
          isBlack={false}
          labelsVisible={false}
          width="50px"
          onPress={mockOnPress}
          onRelease={mockOnRelease}
        />
      </ThemeProvider>
    );
    
    // The key should still be clickable and have proper accessibility
    const keyElement = screen.getByTestId('piano-key-C4');
    expect(keyElement).toBeInTheDocument();
    expect(keyElement).toHaveAttribute('aria-label', expect.stringContaining('Piano key C4'));
  });
});