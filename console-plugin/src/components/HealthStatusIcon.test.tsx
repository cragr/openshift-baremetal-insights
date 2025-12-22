import { render, screen } from '@testing-library/react';
import { HealthStatusIcon } from './HealthStatusIcon';

describe('HealthStatusIcon', () => {
  it('renders OK status with green check', () => {
    render(<HealthStatusIcon status="OK" />);
    expect(screen.getByLabelText('OK')).toBeInTheDocument();
  });

  it('renders Warning status with yellow icon', () => {
    render(<HealthStatusIcon status="Warning" />);
    expect(screen.getByLabelText('Warning')).toBeInTheDocument();
  });

  it('renders Critical status with red icon', () => {
    render(<HealthStatusIcon status="Critical" />);
    expect(screen.getByLabelText('Critical')).toBeInTheDocument();
  });

  it('renders Unknown status with gray icon', () => {
    render(<HealthStatusIcon status="Unknown" />);
    expect(screen.getByLabelText('Unknown')).toBeInTheDocument();
  });
});
