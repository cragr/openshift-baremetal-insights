import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { RefreshCountdown } from './RefreshCountdown';

describe('RefreshCountdown', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders countdown text', () => {
    const futureTime = new Date(Date.now() + 60000).toISOString(); // 1 minute
    render(<RefreshCountdown nextRefresh={futureTime} onRefresh={jest.fn()} />);
    expect(screen.getByText(/Refreshing in/)).toBeInTheDocument();
  });

  it('shows refresh button', () => {
    render(<RefreshCountdown nextRefresh={new Date().toISOString()} onRefresh={jest.fn()} />);
    expect(screen.getByRole('button', { name: /refresh now/i })).toBeInTheDocument();
  });

  it('calls onRefresh when button is clicked', () => {
    const onRefresh = jest.fn();
    render(<RefreshCountdown nextRefresh={new Date().toISOString()} onRefresh={onRefresh} />);

    fireEvent.click(screen.getByRole('button', { name: /refresh now/i }));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });
});
