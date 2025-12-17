import { render, screen, waitFor } from '@testing-library/react';
import App from '../App';

describe('App', () => {
  it('renders error message when audio engine fails to initialize', async () => {
    render(<App />);
    
    // In test environment, Web Audio API is not available, so we expect an error message
    // The error message is now displayed within the LoadingIndicator component
    await waitFor(() => {
      expect(screen.getByText('Loading Failed')).toBeInTheDocument();
    });
    
    // Also check for the retry error message that appears
    await waitFor(() => {
      expect(screen.getByText(/Loading failed, retrying/)).toBeInTheDocument();
    });
  });
});