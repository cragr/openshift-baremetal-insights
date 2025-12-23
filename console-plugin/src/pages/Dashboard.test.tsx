import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Dashboard } from './Dashboard';
import { getDashboard, getNodes, getTasks, getNamespaces } from '../services/api';

jest.mock('../services/api');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useHistory: () => ({
    push: jest.fn(),
  }),
}));

const mockDashboardData = {
  totalNodes: 24,
  healthSummary: { healthy: 18, warning: 4, critical: 2 },
  powerSummary: { on: 22, off: 2 },
  updatesSummary: { total: 12, critical: 3, recommended: 5, optional: 4, nodesWithUpdates: 5 },
  jobsSummary: { pending: 0, inProgress: 0, completed: 0 },
  lastRefresh: new Date().toISOString(),
  nextRefresh: new Date(Date.now() + 60000).toISOString(),
};

const mockNodesData = [
  { name: 'node-1', namespace: 'ns-a', model: 'PowerEdge R640', health: 'OK', powerState: 'On', serviceTag: 'ABC', lastScanned: new Date().toISOString() },
  { name: 'node-2', namespace: 'ns-a', model: 'PowerEdge R640', health: 'OK', powerState: 'On', serviceTag: 'DEF', lastScanned: new Date().toISOString() },
  { name: 'node-3', namespace: 'ns-a', model: 'PowerEdge R740', health: 'Warning', powerState: 'On', serviceTag: 'GHI', lastScanned: new Date().toISOString() },
];

describe('Dashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getNamespaces as jest.Mock).mockResolvedValue(['ns-a']);
    (getDashboard as jest.Mock).mockResolvedValue(mockDashboardData);
    (getNodes as jest.Mock).mockResolvedValue(mockNodesData);
    (getTasks as jest.Mock).mockResolvedValue([]);
  });

  it('renders dashboard title', async () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    });
  });

  it('displays total nodes count', async () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('24')).toBeInTheDocument();
    });
  });

  it('displays servers needing updates count', async () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument();
    });
  });

  it('does not render refresh countdown', async () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    });
    expect(screen.queryByText(/Refreshing in/i)).not.toBeInTheDocument();
  });

  it('does not render expandable card sections', async () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    });
    // Old expandable section titles that should not exist
    expect(screen.queryByText('Health Overview')).not.toBeInTheDocument();
    expect(screen.queryByText('Redfish Jobs')).not.toBeInTheDocument();
    expect(screen.queryByText('Firmware Updates')).not.toBeInTheDocument();

    // New card titles that should exist
    expect(screen.getByText('System Health')).toBeInTheDocument();
    expect(screen.getByText('Power Status')).toBeInTheDocument();
    expect(screen.getByText('Servers Needing Updates')).toBeInTheDocument();
    expect(screen.getByText('Server Models')).toBeInTheDocument();
  });

  it('displays server models with counts', async () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('PowerEdge R640')).toBeInTheDocument();
    });
    expect(screen.getByText('PowerEdge R740')).toBeInTheDocument();
  });
});
