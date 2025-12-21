import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { FirmwareNodes } from './FirmwareNodes';
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
    lastScanned: '2024-01-15T10:30:00Z',
    status: 'needs-update',
    firmwareCount: 15,
    updatesAvailable: 3,
  },
];

describe('FirmwareNodes', () => {
  beforeEach(() => {
    (api.getNodes as jest.Mock).mockResolvedValue(mockNodes);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders title', async () => {
    render(
      <MemoryRouter>
        <FirmwareNodes />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('Firmware Nodes')).toBeInTheDocument();
    });
  });

  it('displays node in table', async () => {
    render(
      <MemoryRouter>
        <FirmwareNodes />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('worker-0')).toBeInTheDocument();
      expect(screen.getByText('PowerEdge R640')).toBeInTheDocument();
    });
  });

  it('displays loading spinner initially', () => {
    (api.getNodes as jest.Mock).mockImplementation(() => new Promise(() => {}));
    render(
      <MemoryRouter>
        <FirmwareNodes />
      </MemoryRouter>
    );
    expect(screen.getByLabelText('Loading')).toBeInTheDocument();
  });

  it('displays error message on API failure', async () => {
    (api.getNodes as jest.Mock).mockRejectedValue(new Error('Network error'));
    render(
      <MemoryRouter>
        <FirmwareNodes />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('Error loading data')).toBeInTheDocument();
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('displays empty state when no nodes', async () => {
    (api.getNodes as jest.Mock).mockResolvedValue([]);
    render(
      <MemoryRouter>
        <FirmwareNodes />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('No nodes found')).toBeInTheDocument();
    });
  });
});
