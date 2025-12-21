import { render, screen, waitFor } from '@testing-library/react';
import { FirmwareOverview } from './FirmwareOverview';
import * as api from '../services/api';

jest.mock('../services/api');

const mockNodes = [
  { name: 'worker-0', status: 'up-to-date', updatesAvailable: 0 },
  { name: 'worker-1', status: 'needs-update', updatesAvailable: 3 },
  { name: 'worker-2', status: 'needs-update', updatesAvailable: 1 },
];

describe('FirmwareOverview', () => {
  beforeEach(() => {
    (api.getNodes as jest.Mock).mockResolvedValue(mockNodes);
  });

  it('renders title', async () => {
    render(<FirmwareOverview />);
    await waitFor(() => {
      expect(screen.getByText('Firmware Overview')).toBeInTheDocument();
    });
  });

  it('displays node count', async () => {
    render(<FirmwareOverview />);
    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  it('displays nodes needing updates count', async () => {
    render(<FirmwareOverview />);
    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });
});
