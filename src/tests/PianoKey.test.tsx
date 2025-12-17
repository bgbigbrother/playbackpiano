import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PianoKey } from '../components/PianoKey';

describe('PianoKey Component', () => {
  const defaultProps = {
    note: 'C4',
    isPressed: false,
    isBlack: false,
    width: '2.86%',
    onPress: vi.fn(),
    onRelease: vi.fn(),
  };

  it('renders white key correctly', () => {
    render(<PianoKey {...defaultProps} />);
    
    const key = screen.getByTestId('piano-key-C4');
    expect(key).toBeInTheDocument();
    expect(key).toHaveTextContent('C4');
  });

  it('renders black key correctly', () => {
    render(<PianoKey {...defaultProps} isBlack={true} note="C#4" />);
    
    const key = screen.getByTestId('piano-key-C#4');
    expect(key).toBeInTheDocument();
    expect(key).toHaveTextContent('C#4');
  });

  it('calls onPress when mouse down', () => {
    const onPress = vi.fn();
    render(<PianoKey {...defaultProps} onPress={onPress} />);
    
    const key = screen.getByTestId('piano-key-C4');
    fireEvent.mouseDown(key);
    
    expect(onPress).toHaveBeenCalledWith('C4');
  });

  it('calls onRelease when mouse up', () => {
    const onRelease = vi.fn();
    render(<PianoKey {...defaultProps} onRelease={onRelease} />);
    
    const key = screen.getByTestId('piano-key-C4');
    fireEvent.mouseUp(key);
    
    expect(onRelease).toHaveBeenCalledWith('C4');
  });

  it('calls onRelease when mouse leaves', () => {
    const onRelease = vi.fn();
    render(<PianoKey {...defaultProps} onRelease={onRelease} />);
    
    const key = screen.getByTestId('piano-key-C4');
    fireEvent.mouseLeave(key);
    
    expect(onRelease).toHaveBeenCalledWith('C4');
  });

  it('applies correct width style', () => {
    render(<PianoKey {...defaultProps} width="5%" />);
    
    const key = screen.getByTestId('piano-key-C4');
    expect(key).toHaveStyle({ width: '5%' });
  });

  it('has correct accessibility attributes', () => {
    render(<PianoKey {...defaultProps} />);
    
    const key = screen.getByTestId('piano-key-C4');
    expect(key).toHaveAttribute('aria-label', 'Piano key C4');
  });
});