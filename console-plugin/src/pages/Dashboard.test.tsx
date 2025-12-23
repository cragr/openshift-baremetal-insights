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

describe('Dashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getNamespaces as jest.Mock).mockResolvedValue(['ns-a']);
    (getDashboard as jest.Mock).mockResolvedValue(mockDashboardData);
    (getNodes as jest.Mock).mockResolvedValue([]);
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

  it('displays updates available count', async () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('12')).toBeInTheDocument();
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
    expect(screen.queryByText('Health Overview')).not.toBeInTheDocument();
    expect(screen.queryByText('Power Status')).not.toBeInTheDocument();
    expect(screen.queryByText('Redfish Jobs')).not.toBeInTheDocument();
    expect(screen.queryByText('Firmware Updates')).not.toBeInTheDocument();
  });
});
