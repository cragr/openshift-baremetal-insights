import { render, screen } from '@testing-library/react';
import { UpdateBadge } from './UpdateBadge';

describe('UpdateBadge', () => {
  it('renders green label for count of 0', () => {
    render(<UpdateBadge count={0} />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('renders orange label for count greater than 0', () => {
    render(<UpdateBadge count={5} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('handles large numbers', () => {
    render(<UpdateBadge count={100} />);
    expect(screen.getByText('100')).toBeInTheDocument();
  });
});
