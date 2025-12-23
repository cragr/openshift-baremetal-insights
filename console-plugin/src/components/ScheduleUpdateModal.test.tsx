import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ScheduleUpdateModal } from './ScheduleUpdateModal';

describe('ScheduleUpdateModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onConfirm: jest.fn(),
    selectedNodes: ['worker-0', 'worker-1'],
    updateCount: 5,
    isLoading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when closed', () => {
    render(<ScheduleUpdateModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('Schedule Firmware Updates')).not.toBeInTheDocument();
  });

  it('renders title when open', () => {
    render(<ScheduleUpdateModal {...defaultProps} />);
    expect(screen.getByText('Schedule Firmware Updates')).toBeInTheDocument();
  });

  it('shows update count and node count', () => {
    render(<ScheduleUpdateModal {...defaultProps} />);
    expect(screen.getByText(/5 updates/)).toBeInTheDocument();
    expect(screen.getByText(/2 servers/)).toBeInTheDocument();
  });

  it('lists affected servers', () => {
    render(<ScheduleUpdateModal {...defaultProps} />);
    expect(screen.getByText('worker-0')).toBeInTheDocument();
    expect(screen.getByText('worker-1')).toBeInTheDocument();
  });

  it('shows OnReboot note', () => {
    render(<ScheduleUpdateModal {...defaultProps} />);
    expect(screen.getByText(/next server reboot/i)).toBeInTheDocument();
  });

  it('calls onClose when Cancel clicked', () => {
    render(<ScheduleUpdateModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('calls onConfirm when Confirm clicked', () => {
    render(<ScheduleUpdateModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Confirm'));
    expect(defaultProps.onConfirm).toHaveBeenCalled();
  });

  it('disables confirm button when loading', () => {
    render(<ScheduleUpdateModal {...defaultProps} isLoading={true} />);
    const confirmButton = screen.getByRole('button', { name: 'Loading... Scheduling...' });
    expect(confirmButton).toBeInTheDocument();
    expect(confirmButton).toBeDisabled();
  });
});
