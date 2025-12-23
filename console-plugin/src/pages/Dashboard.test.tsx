import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Dashboard } from './Dashboard';
import { getDashboard, getNodes, getTasks, getNamespaces } from '../services/api';

jest.mock('../services/api');

describe('Dashboard', () => {
  beforeEach(() => {
    (getNamespaces as jest.Mock).mockResolvedValue(['ns-a']);
    (getDashboard as jest.Mock).mockResolvedValue({
      totalNodes: 2,
      healthSummary: { healthy: 1, warning: 1, critical: 0 },
      powerSummary: { on: 2, off: 0 },
      updatesSummary: { total: 0, critical: 0, recommended: 0, optional: 0, nodesWithUpdates: 0 },
      jobsSummary: { pending: 0, inProgress: 0, completed: 0 },
      lastRefresh: new Date().toISOString(),
      nextRefresh: new Date(Date.now() + 60000).toISOString(),
    });
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
});
