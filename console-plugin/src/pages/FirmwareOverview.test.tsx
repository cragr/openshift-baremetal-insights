import { render, screen, waitFor } from '@testing-library/react';
import { FirmwareOverview } from './FirmwareOverview';
import * as api from '../services/api';
import { Node } from '../types';

jest.mock('../services/api');

const mockNodes: Node[] = [
  {
    name: 'worker-0',
    bmcAddress: '10.0.0.1',
    model: 'PowerEdge R640',
    manufacturer: 'Dell',
    serviceTag: 'ABC123',
    lastScanned: '2025-12-21T00:00:00Z',
    status: 'up-to-date',
    firmwareCount: 5,
    updatesAvailable: 0,
  },
  {
    name: 'worker-1',
    bmcAddress: '10.0.0.2',
    model: 'PowerEdge R640',
    manufacturer: 'Dell',
    serviceTag: 'ABC124',
    lastScanned: '2025-12-21T00:00:00Z',
    status: 'needs-update',
    firmwareCount: 5,
    updatesAvailable: 3,
  },
  {
    name: 'worker-2',
    bmcAddress: '10.0.0.3',
    model: 'PowerEdge R640',
    manufacturer: 'Dell',
    serviceTag: 'ABC125',
    lastScanned: '2025-12-21T00:00:00Z',
    status: 'needs-update',
    firmwareCount: 5,
    updatesAvailable: 1,
  },
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

  it('displays loading spinner initially', () => {
    (api.getNodes as jest.Mock).mockImplementation(() => new Promise(() => {}));
    render(<FirmwareOverview />);
    expect(screen.getByLabelText('Loading')).toBeInTheDocument();
  });

  it('displays error message on API failure', async () => {
    (api.getNodes as jest.Mock).mockRejectedValue(new Error('Network error'));
    render(<FirmwareOverview />);
    await waitFor(() => {
      expect(screen.getByText('Error loading data')).toBeInTheDocument();
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });
});
