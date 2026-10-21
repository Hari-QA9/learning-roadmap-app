import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the landing page headline', () => {
  render(<App />);
  expect(screen.getByText(/path you’ll/i)).toBeInTheDocument();
});
