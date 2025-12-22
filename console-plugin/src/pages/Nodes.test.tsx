import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Nodes } from './Nodes';
import * as api from '../services/api';
import { Node } from '../types';

jest.mock('../services/api');

const mockNodes: Node[] = [
  {
    name: 'worker-0',
    namespace: 'default',
    bmcAddress: '10.0.0.1',
    model: 'PowerEdge R640',
    manufacturer: 'Dell',
    serviceTag: 'ABC123',
    lastScanned: '2025-12-21T00:00:00Z',
    status: 'up-to-date',
    firmwareCount: 5,
    updatesAvailable: 0,
    health: 'OK',
    thermalSummary: { inletTempC: 22, maxTempC: 45, fanCount: 8, fansHealthy: 8, status: 'OK' },
    powerSummary: { currentWatts: 250, psuCount: 2, psusHealthy: 2, redundancy: 'Full', status: 'OK' },
  },
];

describe('Nodes', () => {
  beforeEach(() => {
    (api.getNodes as jest.Mock).mockResolvedValue(mockNodes);
  });

  it('renders title', async () => {
    render(
      <MemoryRouter>
        <Nodes />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('Nodes')).toBeInTheDocument();
    });
  });

  it('displays node name', async () => {
    render(
      <MemoryRouter>
        <Nodes />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('worker-0')).toBeInTheDocument();
    });
  });

  it('displays model', async () => {
    render(
      <MemoryRouter>
        <Nodes />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('PowerEdge R640')).toBeInTheDocument();
    });
  });
});
