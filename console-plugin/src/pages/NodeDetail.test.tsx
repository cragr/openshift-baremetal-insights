import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Switch } from 'react-router-dom';
import { NodeDetail } from './NodeDetail';
import * as api from '../services/api';

jest.mock('../services/api');

const mockNode = {
  name: 'worker-0',
  namespace: 'default',
  bmcAddress: '10.0.0.1',
  model: 'PowerEdge R640',
  manufacturer: 'Dell',
  serviceTag: 'ABC123',
  lastScanned: '2025-12-21T00:00:00Z',
  status: 'up-to-date' as const,
  firmwareCount: 5,
  updatesAvailable: 0,
  health: 'OK' as const,
  healthRollup: {
    systemHealth: 'OK' as const,
    processors: 'OK' as const,
    memory: 'OK' as const,
    storage: 'OK' as const,
    network: 'OK' as const,
    power: 'OK' as const,
  },
  thermalSummary: {
    status: 'OK' as const,
    temperatureCount: 10,
    fanCount: 6,
  },
  powerSummary: {
    status: 'OK' as const,
    powerSupplies: 2,
    powerConsumedWatts: 150,
  },
};

describe('NodeDetail', () => {
  beforeEach(() => {
    (api.getNodes as jest.Mock).mockResolvedValue([mockNode]);
    (api.getNodeEvents as jest.Mock).mockResolvedValue([]);
  });

  it('renders node name', async () => {
    render(
      <MemoryRouter initialEntries={['/baremetal-insights/nodes/worker-0']}>
        <Switch>
          <Route path="/baremetal-insights/nodes/:name" component={NodeDetail} />
        </Switch>
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'worker-0' })).toBeInTheDocument();
    });
  });

  it('renders tabs without Firmware tab', async () => {
    render(
      <MemoryRouter initialEntries={['/baremetal-insights/nodes/worker-0']}>
        <Switch>
          <Route path="/baremetal-insights/nodes/:name" component={NodeDetail} />
        </Switch>
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'worker-0' })).toBeInTheDocument();
    });

    // Get all tabs
    const tabs = screen.getAllByRole('tab');
    const tabTexts = tabs.map(tab => tab.textContent);

    // Verify expected tabs are present
    expect(tabTexts).toContain('Health');
    expect(tabTexts).toContain('Thermal');
    expect(tabTexts).toContain('Power');
    expect(tabTexts.some(text => text?.match(/^Events/))).toBe(true);

    // Verify Firmware tab is NOT present
    expect(tabTexts.some(text => text?.match(/Firmware/))).toBe(false);

    // Verify we have exactly 4 tabs (not 5)
    expect(tabs).toHaveLength(4);
  });
});
