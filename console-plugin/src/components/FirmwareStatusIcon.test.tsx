import { render, screen } from '@testing-library/react';
import { FirmwareStatusIcon } from './FirmwareStatusIcon';

describe('FirmwareStatusIcon', () => {
  it('renders success icon for up-to-date', () => {
    render(<FirmwareStatusIcon status="up-to-date" />);
    expect(screen.getByText('Up to date')).toBeInTheDocument();
  });

  it('renders warning icon for needs-update', () => {
    render(<FirmwareStatusIcon status="needs-update" />);
    expect(screen.getByText('Updates available')).toBeInTheDocument();
  });

  it('renders unknown icon for unknown status', () => {
    render(<FirmwareStatusIcon status="unknown" />);
    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });

  it('renders error icon for auth-failed', () => {
    render(<FirmwareStatusIcon status="auth-failed" />);
    expect(screen.getByText('Auth failed')).toBeInTheDocument();
  });
});
