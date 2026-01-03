import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { LabelToggleControls } from '../components/LabelToggleControls';

const theme = createTheme();

describe('LabelToggleControls', () => {
  it('renders without crashing', () => {
    const mockOnToggle = vi.fn();
    render(
      <ThemeProvider theme={theme}>
        <LabelToggleControls labelsVisible={true} onToggle={mockOnToggle} />
      </ThemeProvider>
    );
  });

  it('displays "Hide Key Labels" when labels are visible', () => {
    const mockOnToggle = vi.fn();
    render(
      <ThemeProvider theme={theme}>
        <LabelToggleControls labelsVisible={true} onToggle={mockOnToggle} />
      </ThemeProvider>
    );
    
    expect(screen.getByText('Hide Key Labels')).toBeInTheDocument();
  });

  it('displays "Show Key Labels" when labels are hidden', () => {
    const mockOnToggle = vi.fn();
    render(
      <ThemeProvider theme={theme}>
        <LabelToggleControls labelsVisible={false} onToggle={mockOnToggle} />
      </ThemeProvider>
    );
    
    expect(screen.getByText('Show Key Labels')).toBeInTheDocument();
  });

  it('calls onToggle when switch is clicked', () => {
    const mockOnToggle = vi.fn();
    render(
      <ThemeProvider theme={theme}>
        <LabelToggleControls labelsVisible={true} onToggle={mockOnToggle} />
      </ThemeProvider>
    );
    
    const switchElement = screen.getByRole('checkbox');
    fireEvent.click(switchElement);
    
    expect(mockOnToggle).toHaveBeenCalledTimes(1);
  });

  it('shows correct switch state based on labelsVisible prop', () => {
    const mockOnToggle = vi.fn();
    
    // Test when labels are visible (switch should be checked)
    const { rerender } = render(
      <ThemeProvider theme={theme}>
        <LabelToggleControls labelsVisible={true} onToggle={mockOnToggle} />
      </ThemeProvider>
    );
    
    expect(screen.getByRole('checkbox')).toBeChecked();
    
    // Test when labels are hidden (switch should be unchecked)
    rerender(
      <ThemeProvider theme={theme}>
        <LabelToggleControls labelsVisible={false} onToggle={mockOnToggle} />
      </ThemeProvider>
    );
    
    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });

  it('displays correct label text for each state', () => {
    const mockOnToggle = vi.fn();
    
    // Test visible state label
    const { rerender } = render(
      <ThemeProvider theme={theme}>
        <LabelToggleControls labelsVisible={true} onToggle={mockOnToggle} />
      </ThemeProvider>
    );
    
    expect(screen.getByText('Hide Key Labels')).toBeInTheDocument();
    
    // Test hidden state label
    rerender(
      <ThemeProvider theme={theme}>
        <LabelToggleControls labelsVisible={false} onToggle={mockOnToggle} />
      </ThemeProvider>
    );
    
    expect(screen.getByText('Show Key Labels')).toBeInTheDocument();
  });
});