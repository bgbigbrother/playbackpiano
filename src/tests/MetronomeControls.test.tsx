import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MetronomeControls } from '../components/MetronomeControls';

// Mock MetronomeEngine
vi.mock('../utils/MetronomeEngine');

// Mock Web Audio API support
Object.defineProperty(window, 'AudioContext', {
  writable: true,
  value: vi.fn().mockImplementation(() => ({
    createOscillator: vi.fn(),
    createGain: vi.fn(),
    destination: {},
    currentTime: 0,
    sampleRate: 44100,
    state: 'running',
    suspend: vi.fn(),
    resume: vi.fn(),
    close: vi.fn(),
  })),
});

// Also mock webkitAudioContext for older browsers
Object.defineProperty(window, 'webkitAudioContext', {
  writable: true,
  value: window.AudioContext,
});

describe('MetronomeControls', () => {
  let mockMetronomeEngine: any;

  beforeEach(() => {
    mockMetronomeEngine = {
      isActive: false,
      bpm: 100,
      bpmRange: { min: 30, max: 300 },
      isReady: true,
      hasError: false,
      start: vi.fn(),
      stop: vi.fn(),
      setBPM: vi.fn(),
      clearError: vi.fn(),
      getErrorMessage: vi.fn(() => ''),
    };
  });

  describe('Visibility', () => {
    it('should not render when visible is false', () => {
      render(
        <MetronomeControls
          visible={false}
          metronomeEngine={mockMetronomeEngine}
        />
      );

      expect(screen.queryByText('Metronome')).not.toBeInTheDocument();
    });

    it('should render when visible is true', () => {
      render(
        <MetronomeControls
          visible={true}
          metronomeEngine={mockMetronomeEngine}
        />
      );

      expect(screen.getByText('Metronome')).toBeInTheDocument();
    });
  });

  describe('Status Display', () => {
    it('should show "Stopped" status when metronome is inactive', () => {
      render(
        <MetronomeControls
          visible={true}
          metronomeEngine={mockMetronomeEngine}
        />
      );

      expect(screen.getByText('Stopped')).toBeInTheDocument();
    });

    it('should show "Active" status when metronome is active', () => {
      mockMetronomeEngine.isActive = true;
      
      render(
        <MetronomeControls
          visible={true}
          metronomeEngine={mockMetronomeEngine}
        />
      );

      expect(screen.getByText('Active')).toBeInTheDocument();
    });
  });

  describe('BPM Display', () => {
    it('should display current BPM value', () => {
      mockMetronomeEngine.bpm = 120;
      
      render(
        <MetronomeControls
          visible={true}
          metronomeEngine={mockMetronomeEngine}
        />
      );

      // Look for the main BPM display (h4 element)
      expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent('100');
    });

    it('should display tempo description', () => {
      mockMetronomeEngine.bpm = 120;
      
      render(
        <MetronomeControls
          visible={true}
          metronomeEngine={mockMetronomeEngine}
        />
      );

      expect(screen.getByText(/Medium/)).toBeInTheDocument();
    });
  });

  describe('Start/Stop Button', () => {
    it('should show "Start Metronome" when inactive', () => {
      render(
        <MetronomeControls
          visible={true}
          metronomeEngine={mockMetronomeEngine}
        />
      );

      expect(screen.getByText('Start Metronome')).toBeInTheDocument();
    });

    it('should show "Stop Metronome" when active', () => {
      mockMetronomeEngine.isActive = true;
      
      render(
        <MetronomeControls
          visible={true}
          metronomeEngine={mockMetronomeEngine}
        />
      );

      expect(screen.getByText('Stop Metronome')).toBeInTheDocument();
    });

    it('should call start when clicked and inactive', () => {
      render(
        <MetronomeControls
          visible={true}
          metronomeEngine={mockMetronomeEngine}
        />
      );

      const startButton = screen.getByText('Start Metronome');
      fireEvent.click(startButton);

      expect(mockMetronomeEngine.start).toHaveBeenCalled();
    });

    it('should call stop when clicked and active', () => {
      mockMetronomeEngine.isActive = true;
      
      render(
        <MetronomeControls
          visible={true}
          metronomeEngine={mockMetronomeEngine}
        />
      );

      const stopButton = screen.getByText('Stop Metronome');
      fireEvent.click(stopButton);

      expect(mockMetronomeEngine.stop).toHaveBeenCalled();
    });
  });

  describe('BPM Presets', () => {
    it('should render BPM preset buttons', () => {
      render(
        <MetronomeControls
          visible={true}
          metronomeEngine={mockMetronomeEngine}
        />
      );

      // Look for preset buttons specifically (they should be buttons, not slider marks)
      const presetButtons = screen.getAllByRole('button');
      const bpmTexts = presetButtons.map(button => button.textContent);
      
      expect(bpmTexts).toContain('60');
      expect(bpmTexts).toContain('80');
      expect(bpmTexts).toContain('100');
      expect(bpmTexts).toContain('120');
      expect(bpmTexts).toContain('140');
      expect(bpmTexts).toContain('160');
    });

    it('should call setBPM when preset button is clicked', () => {
      render(
        <MetronomeControls
          visible={true}
          metronomeEngine={mockMetronomeEngine}
        />
      );

      // Find the preset button specifically (not the slider mark)
      const buttons = screen.getAllByRole('button');
      const preset120Button = buttons.find(button => button.textContent === '120');
      
      expect(preset120Button).toBeDefined();
      fireEvent.click(preset120Button!);

      expect(mockMetronomeEngine.setBPM).toHaveBeenCalledWith(120);
    });
  });

  describe('Error Handling', () => {
    it('should display error message when metronome has error', () => {
      mockMetronomeEngine.hasError = true;
      mockMetronomeEngine.getErrorMessage = vi.fn(() => 'Test error message');
      
      render(
        <MetronomeControls
          visible={true}
          metronomeEngine={mockMetronomeEngine}
        />
      );

      expect(screen.getByText('Test error message')).toBeInTheDocument();
    });

    it('should not display error when metronome has no error', () => {
      render(
        <MetronomeControls
          visible={true}
          metronomeEngine={mockMetronomeEngine}
        />
      );

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('Callbacks', () => {
    it('should call onBPMChange when BPM changes', () => {
      const onBPMChange = vi.fn();
      
      render(
        <MetronomeControls
          visible={true}
          metronomeEngine={mockMetronomeEngine}
          onBPMChange={onBPMChange}
        />
      );

      // Find the preset button specifically (not the slider mark)
      const buttons = screen.getAllByRole('button');
      const preset120Button = buttons.find(button => button.textContent === '120');
      
      expect(preset120Button).toBeDefined();
      fireEvent.click(preset120Button!);

      expect(onBPMChange).toHaveBeenCalledWith(120);
    });

    it('should call onStart when metronome starts', () => {
      const onStart = vi.fn();
      
      render(
        <MetronomeControls
          visible={true}
          metronomeEngine={mockMetronomeEngine}
          onStart={onStart}
        />
      );

      const startButton = screen.getByText('Start Metronome');
      fireEvent.click(startButton);

      expect(onStart).toHaveBeenCalled();
    });

    it('should call onStop when metronome stops', () => {
      const onStop = vi.fn();
      mockMetronomeEngine.isActive = true;
      
      render(
        <MetronomeControls
          visible={true}
          metronomeEngine={mockMetronomeEngine}
          onStop={onStop}
        />
      );

      const stopButton = screen.getByText('Stop Metronome');
      fireEvent.click(stopButton);

      expect(onStop).toHaveBeenCalled();
    });
  });
});