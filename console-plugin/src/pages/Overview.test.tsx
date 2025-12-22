import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Overview } from './Overview';
import * as api from '../services/api';
import { Node, HealthEvent } from '../types';

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
  },
  {
    name: 'worker-1',
    namespace: 'default',
    bmcAddress: '10.0.0.2',
    model: 'PowerEdge R640',
    manufacturer: 'Dell',
    serviceTag: 'ABC124',
    lastScanned: '2025-12-21T00:00:00Z',
    status: 'needs-update',
    firmwareCount: 5,
    updatesAvailable: 2,
    health: 'Critical',
  },
];

const mockEvents: HealthEvent[] = [
  {
    id: '1',
    timestamp: '2025-12-22T14:00:00Z',
    severity: 'Critical',
    message: 'PSU 1 failed',
    nodeName: 'worker-1',
  },
];

describe('Overview', () => {
  beforeEach(() => {
    (api.getNodes as jest.Mock).mockResolvedValue(mockNodes);
    (api.getEvents as jest.Mock).mockResolvedValue(mockEvents);
  });

  it('renders title', async () => {
    render(
      <MemoryRouter>
        <Overview />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('Overview')).toBeInTheDocument();
    });
  });

  it('displays total node count', async () => {
    render(
      <MemoryRouter>
        <Overview />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('Total Nodes')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });

  it('displays critical count', async () => {
    render(
      <MemoryRouter>
        <Overview />
      </MemoryRouter>
    );
    await waitFor(() => {
      const criticalElements = screen.getAllByText('Critical');
      expect(criticalElements.length).toBeGreaterThan(0);
    });
  });
});
