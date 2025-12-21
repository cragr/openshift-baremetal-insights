import { render, screen, waitFor } from '@testing-library/react';
import { FirmwareUpdates } from './FirmwareUpdates';
import * as api from '../services/api';

jest.mock('../services/api');

const mockUpdates = [
  {
    componentType: 'BIOS',
    availableVersion: '2.19.1',
    affectedNodes: ['worker-0', 'worker-1'],
    nodeCount: 2,
  },
];

describe('FirmwareUpdates', () => {
  beforeEach(() => {
    (api.getUpdates as jest.Mock).mockResolvedValue({ updates: mockUpdates });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders title', async () => {
    render(<FirmwareUpdates />);
    await waitFor(() => {
      expect(screen.getByText('Firmware Updates')).toBeInTheDocument();
    });
  });

  it('displays update in table', async () => {
    render(<FirmwareUpdates />);
    await waitFor(() => {
      expect(screen.getByText('BIOS')).toBeInTheDocument();
      expect(screen.getByText('2.19.1')).toBeInTheDocument();
    });
  });

  it('displays loading spinner initially', () => {
    (api.getUpdates as jest.Mock).mockImplementation(() => new Promise(() => {}));
    render(<FirmwareUpdates />);
    expect(screen.getByLabelText('Loading')).toBeInTheDocument();
  });

  it('displays error message on API failure', async () => {
    (api.getUpdates as jest.Mock).mockRejectedValue(new Error('Network error'));
    render(<FirmwareUpdates />);
    await waitFor(() => {
      expect(screen.getByText('Error loading data')).toBeInTheDocument();
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('displays empty state when no updates', async () => {
    (api.getUpdates as jest.Mock).mockResolvedValue({ updates: [] });
    render(<FirmwareUpdates />);
    await waitFor(() => {
      expect(screen.getByText('All firmware is up to date')).toBeInTheDocument();
    });
  });
});
