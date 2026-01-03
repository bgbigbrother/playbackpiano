import { render } from '@testing-library/react';
import { vi } from 'vitest';
import App from '../App';

// Mock heavy dependencies to speed up tests
vi.mock('../utils/AudioEngine', () => ({
  AudioEngine: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
    dispose: vi.fn(),
    hasError: false,
    getErrorMessage: vi.fn().mockReturnValue(''),
    isReady: true,
    playNote: vi.fn(),
    releaseNote: vi.fn(),
    error: null
  }))
}));

vi.mock('../utils/keyboardLayout', () => ({
  initializeKeyboardMapping: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('../utils/performanceMonitor', () => ({}));

vi.mock('../utils/debugLogger', () => ({
  debugLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

describe('App', () => {
  it('renders without crashing', () => {
    const { container } = render(<App />);
    expect(container).toBeInTheDocument();
  });
});