import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { PanelToggle } from '../components/PanelToggle';

const theme = createTheme();

describe('PanelToggle', () => {
  it('renders without crashing', () => {
    const mockOnClick = vi.fn();
    render(
      <ThemeProvider theme={theme}>
        <PanelToggle onClick={mockOnClick} isOpen={false} />
      </ThemeProvider>
    );
  });

  it('calls onClick when clicked', () => {
    const mockOnClick = vi.fn();
    render(
      <ThemeProvider theme={theme}>
        <PanelToggle onClick={mockOnClick} isOpen={false} />
      </ThemeProvider>
    );
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it('has correct aria-label when closed', () => {
    const mockOnClick = vi.fn();
    render(
      <ThemeProvider theme={theme}>
        <PanelToggle onClick={mockOnClick} isOpen={false} />
      </ThemeProvider>
    );
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Open control panel');
  });

  it('has correct aria-label when open', () => {
    const mockOnClick = vi.fn();
    render(
      <ThemeProvider theme={theme}>
        <PanelToggle onClick={mockOnClick} isOpen={true} />
      </ThemeProvider>
    );
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Close control panel');
  });
});