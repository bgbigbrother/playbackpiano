import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { LoadingIndicator } from '../components/LoadingIndicator';

describe('LoadingIndicator Component', () => {
  describe('Initial loading state display', () => {
    it('should display loading message when isLoading is true', () => {
      render(
        <LoadingIndicator
          progress={0}
          isLoading={true}
          message="Loading Piano Samples..."
        />
      );

      expect(screen.getByText('Loading Piano Samples...')).toBeInTheDocument();
      expect(screen.getByText('Initializing...')).toBeInTheDocument();
    });

    it('should show indeterminate progress when progress is 0', () => {
      const { container } = render(
        <LoadingIndicator progress={0} isLoading={true} variant="linear" />
      );

      // Linear progress should be present
      const progressBar = container.querySelector('.MuiLinearProgress-root');
      expect(progressBar).toBeInTheDocument();
    });

    it('should display progress percentage when showProgress is true', () => {
      render(
        <LoadingIndicator
          progress={45}
          isLoading={true}
          showProgress={true}
          variant="linear"
        />
      );

      expect(screen.getByText('45%')).toBeInTheDocument();
    });

    it('should not display progress percentage when showProgress is false', () => {
      render(
        <LoadingIndicator
          progress={45}
          isLoading={true}
          showProgress={false}
          variant="linear"
        />
      );

      expect(screen.queryByText('45%')).not.toBeInTheDocument();
    });

    it('should display appropriate status text based on progress', () => {
      const { rerender } = render(
        <LoadingIndicator progress={0} isLoading={true} />
      );
      expect(screen.getByText('Initializing...')).toBeInTheDocument();

      rerender(<LoadingIndicator progress={25} isLoading={true} />);
      expect(screen.getByText('Preparing audio engine...')).toBeInTheDocument();

      rerender(<LoadingIndicator progress={75} isLoading={true} />);
      expect(screen.getByText('Loading piano samples...')).toBeInTheDocument();

      rerender(<LoadingIndicator progress={100} isLoading={true} />);
      expect(screen.getByText('Almost ready...')).toBeInTheDocument();
    });

    it('should display custom status text when provided', () => {
      render(
        <LoadingIndicator
          progress={50}
          isLoading={true}
          statusText="Custom status message"
        />
      );

      expect(screen.getByText('Custom status message')).toBeInTheDocument();
    });

    it('should render circular progress variant', () => {
      const { container } = render(
        <LoadingIndicator
          progress={50}
          isLoading={true}
          variant="circular"
        />
      );

      const circularProgress = container.querySelector(
        '.MuiCircularProgress-root'
      );
      expect(circularProgress).toBeInTheDocument();
    });
  });

  describe('Successful loading completion', () => {
    it('should not render when loading is complete and no error', () => {
      const { container } = render(
        <LoadingIndicator progress={100} isLoading={false} />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should show 100% progress before hiding', () => {
      render(
        <LoadingIndicator
          progress={100}
          isLoading={true}
          showProgress={true}
        />
      );

      expect(screen.getByText('100%')).toBeInTheDocument();
    });
  });

  describe('Error state handling and retry functionality', () => {
    it('should display error message when error is present', () => {
      render(
        <LoadingIndicator
          progress={50}
          isLoading={false}
          error="Network connection failed"
        />
      );

      expect(screen.getByText('Loading Failed')).toBeInTheDocument();
      expect(
        screen.getByText(/Network connection failed/)
      ).toBeInTheDocument();
    });

    it('should show retry button when error occurs and onRetry is provided', () => {
      const mockRetry = vi.fn();

      render(
        <LoadingIndicator
          progress={50}
          isLoading={false}
          error="Loading failed"
          onRetry={mockRetry}
        />
      );

      const retryButton = screen.getByRole('button', { name: /try again/i });
      expect(retryButton).toBeInTheDocument();
    });

    it('should call onRetry when retry button is clicked', () => {
      const mockRetry = vi.fn();

      render(
        <LoadingIndicator
          progress={50}
          isLoading={false}
          error="Loading failed"
          onRetry={mockRetry}
        />
      );

      const retryButton = screen.getByRole('button', { name: /try again/i });
      fireEvent.click(retryButton);

      expect(mockRetry).toHaveBeenCalledTimes(1);
    });

    it('should not show retry button when onRetry is not provided', () => {
      render(
        <LoadingIndicator
          progress={50}
          isLoading={false}
          error="Loading failed"
        />
      );

      const retryButton = screen.queryByRole('button', { name: /try again/i });
      expect(retryButton).not.toBeInTheDocument();
    });

    it('should not show progress indicator when error is present', () => {
      const { container } = render(
        <LoadingIndicator
          progress={50}
          isLoading={false}
          error="Loading failed"
          variant="linear"
        />
      );

      const progressBar = container.querySelector('.MuiLinearProgress-root');
      expect(progressBar).not.toBeInTheDocument();
    });

    it('should display error even when isLoading is false', () => {
      render(
        <LoadingIndicator
          progress={0}
          isLoading={false}
          error="Connection timeout"
        />
      );

      expect(screen.getByText('Loading Failed')).toBeInTheDocument();
      expect(screen.getByText(/Connection timeout/)).toBeInTheDocument();
    });

    it('should show helpful message during loading', () => {
      render(
        <LoadingIndicator progress={50} isLoading={true} showProgress={true} />
      );

      expect(
        screen.getByText(
          /This may take a few moments depending on your internet connection/
        )
      ).toBeInTheDocument();
    });

    it('should not show helpful message when progress is 0 or 100', () => {
      const { rerender } = render(
        <LoadingIndicator progress={0} isLoading={true} />
      );

      expect(
        screen.queryByText(/This may take a few moments/)
      ).not.toBeInTheDocument();

      rerender(<LoadingIndicator progress={100} isLoading={true} />);

      expect(
        screen.queryByText(/This may take a few moments/)
      ).not.toBeInTheDocument();
    });
  });
});
