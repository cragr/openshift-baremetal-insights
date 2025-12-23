import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Switch } from 'react-router-dom';
import { NodeDetail } from './NodeDetail';
import * as api from '../services/api';

jest.mock('../services/api');

const mockNode = {
  name: 'worker-0',
  namespace: 'default',
  bmcAddress: 'idrac-10.0.0.1:443',
  model: 'PowerEdge R640',
  manufacturer: 'Dell',
  serviceTag: 'ABC123',
  lastScanned: '2025-12-21T00:00:00Z',
  status: 'up-to-date' as const,
  firmwareCount: 5,
  updatesAvailable: 0,
  health: 'OK' as const,
  powerState: 'On',
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
    fansHealthy: 6,
  },
  powerSummary: {
    status: 'OK' as const,
    psuCount: 2,
    psusHealthy: 2,
    currentWatts: 150,
    redundancy: 'Fully Redundant',
  },
  networkAdapters: [
    {
      name: 'NIC.Integrated.1-1',
      model: 'Broadcom BCM5720',
      port: 'NIC.Integrated.1-1',
      linkStatus: 'Up' as const,
      linkSpeed: '10 Gbps',
      macAddress: 'AA:BB:CC:DD:EE:01',
    },
  ],
  storage: {
    controllers: [
      {
        name: 'RAID.Integrated.1-1',
        deviceDescription: 'PERC H740P',
        pcieSlot: 'Slot 1',
        firmwareVersion: '51.14.0-3900',
      },
    ],
    disks: [
      {
        name: 'Physical Disk 0:1:0',
        state: 'Online',
        slotNumber: '0',
        size: '1.8 TB',
        busProtocol: 'SAS',
        mediaType: 'HDD',
      },
    ],
  },
};

describe('NodeDetail', () => {
  beforeEach(() => {
    (api.getNodes as jest.Mock).mockResolvedValue([mockNode]);
  });

  it('renders title', async () => {
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

  it('renders breadcrumb', async () => {
    render(
      <MemoryRouter initialEntries={['/baremetal-insights/nodes/worker-0']}>
        <Switch>
          <Route path="/baremetal-insights/nodes/:name" component={NodeDetail} />
        </Switch>
      </MemoryRouter>
    );
    await waitFor(() => {
      const overviewLinks = screen.getAllByText('Overview');
      expect(overviewLinks.length).toBeGreaterThan(0);
      expect(screen.getByText('Nodes')).toBeInTheDocument();
    });
  });

  it('renders loading state', () => {
    (api.getNodes as jest.Mock).mockImplementation(() => new Promise(() => {}));
    render(
      <MemoryRouter initialEntries={['/baremetal-insights/nodes/worker-0']}>
        <Switch>
          <Route path="/baremetal-insights/nodes/:name" component={NodeDetail} />
        </Switch>
      </MemoryRouter>
    );
    expect(screen.getByLabelText('Loading')).toBeInTheDocument();
  });

  it('renders error state when node not found', async () => {
    (api.getNodes as jest.Mock).mockResolvedValue([]);
    render(
      <MemoryRouter initialEntries={['/baremetal-insights/nodes/worker-0']}>
        <Switch>
          <Route path="/baremetal-insights/nodes/:name" component={NodeDetail} />
        </Switch>
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('Node worker-0 not found')).toBeInTheDocument();
    });
  });

  it('renders error state on API failure', async () => {
    (api.getNodes as jest.Mock).mockRejectedValue(new Error('API Error'));
    render(
      <MemoryRouter initialEntries={['/baremetal-insights/nodes/worker-0']}>
        <Switch>
          <Route path="/baremetal-insights/nodes/:name" component={NodeDetail} />
        </Switch>
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('API Error')).toBeInTheDocument();
    });
  });

  it('renders Overview section with System Health', async () => {
    render(
      <MemoryRouter initialEntries={['/baremetal-insights/nodes/worker-0']}>
        <Switch>
          <Route path="/baremetal-insights/nodes/:name" component={NodeDetail} />
        </Switch>
      </MemoryRouter>
    );
    await waitFor(() => {
      const overviewTexts = screen.getAllByText('Overview');
      expect(overviewTexts.length).toBeGreaterThan(0);
      expect(screen.getByText('Manufacturer')).toBeInTheDocument();
      expect(screen.getByText('Dell')).toBeInTheDocument();
      expect(screen.getByText('PowerEdge R640')).toBeInTheDocument();
      expect(screen.getByText('Service Tag')).toBeInTheDocument();
      expect(screen.getByText('ABC123')).toBeInTheDocument();
      expect(screen.getByText('System Health')).toBeInTheDocument();
      expect(screen.getByText('Power State')).toBeInTheDocument();
      expect(screen.getByText('On')).toBeInTheDocument();
    });
  });

  it('renders clickable Redfish IP link', async () => {
    render(
      <MemoryRouter initialEntries={['/baremetal-insights/nodes/worker-0']}>
        <Switch>
          <Route path="/baremetal-insights/nodes/:name" component={NodeDetail} />
        </Switch>
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('Redfish IP')).toBeInTheDocument();
      const link = screen.getByRole('link', { name: '10.0.0.1' });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', 'https://10.0.0.1');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  it('renders Health Status section', async () => {
    render(
      <MemoryRouter initialEntries={['/baremetal-insights/nodes/worker-0']}>
        <Switch>
          <Route path="/baremetal-insights/nodes/:name" component={NodeDetail} />
        </Switch>
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('Health Status')).toBeInTheDocument();
      expect(screen.getByText('Processors')).toBeInTheDocument();
      expect(screen.getByText('Memory')).toBeInTheDocument();
      expect(screen.getByText('Network')).toBeInTheDocument();
      expect(screen.getByText('Thermal Status')).toBeInTheDocument();
      expect(screen.getByText('Power Status')).toBeInTheDocument();
      expect(screen.getByText('Fans')).toBeInTheDocument();
      expect(screen.getByText('6 / 6 healthy')).toBeInTheDocument();
    });
  });

  it('renders Networking section with table', async () => {
    render(
      <MemoryRouter initialEntries={['/baremetal-insights/nodes/worker-0']}>
        <Switch>
          <Route path="/baremetal-insights/nodes/:name" component={NodeDetail} />
        </Switch>
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('Networking')).toBeInTheDocument();
      expect(screen.getByText('Broadcom BCM5720')).toBeInTheDocument();
      expect(screen.getByText('NIC.Integrated.1-1')).toBeInTheDocument();
      expect(screen.getByText('Up')).toBeInTheDocument();
      expect(screen.getByText('10 Gbps')).toBeInTheDocument();
      expect(screen.getByText('AA:BB:CC:DD:EE:01')).toBeInTheDocument();
    });
  });

  it('renders Storage section with controllers', async () => {
    render(
      <MemoryRouter initialEntries={['/baremetal-insights/nodes/worker-0']}>
        <Switch>
          <Route path="/baremetal-insights/nodes/:name" component={NodeDetail} />
        </Switch>
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('Storage')).toBeInTheDocument();
      expect(screen.getByText('Controllers')).toBeInTheDocument();
      expect(screen.getByText('RAID.Integrated.1-1')).toBeInTheDocument();
      expect(screen.getByText('PERC H740P')).toBeInTheDocument();
      expect(screen.getByText('Slot 1')).toBeInTheDocument();
      expect(screen.getByText('51.14.0-3900')).toBeInTheDocument();
    });
  });

  it('renders Storage section with disks', async () => {
    render(
      <MemoryRouter initialEntries={['/baremetal-insights/nodes/worker-0']}>
        <Switch>
          <Route path="/baremetal-insights/nodes/:name" component={NodeDetail} />
        </Switch>
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('Disks')).toBeInTheDocument();
      expect(screen.getByText('Physical Disk 0:1:0')).toBeInTheDocument();
      expect(screen.getByText('Online')).toBeInTheDocument();
      expect(screen.getByText('0')).toBeInTheDocument();
      expect(screen.getByText('1.8 TB')).toBeInTheDocument();
      expect(screen.getByText('SAS')).toBeInTheDocument();
      expect(screen.getByText('HDD')).toBeInTheDocument();
    });
  });

  it('renders Power section', async () => {
    render(
      <MemoryRouter initialEntries={['/baremetal-insights/nodes/worker-0']}>
        <Switch>
          <Route path="/baremetal-insights/nodes/:name" component={NodeDetail} />
        </Switch>
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('Power')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Current Power')).toBeInTheDocument();
      expect(screen.getByText('150 W')).toBeInTheDocument();
      expect(screen.getByText('Redundancy')).toBeInTheDocument();
      expect(screen.getByText('Fully Redundant')).toBeInTheDocument();
      expect(screen.getByText('PSU Health')).toBeInTheDocument();
      expect(screen.getByText('2 / 2 healthy')).toBeInTheDocument();
    });
  });
});
