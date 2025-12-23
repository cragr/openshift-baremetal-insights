import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Nodes } from './Nodes';
import * as api from '../services/api';
import { Node } from '../types';

jest.mock('../services/api');
jest.mock('../components/NamespaceDropdown', () => ({
  NamespaceDropdown: ({ selected, onSelect }: { selected: string; onSelect: (ns: string) => void }) => (
    <select
      data-testid="namespace-dropdown"
      value={selected}
      onChange={(e) => onSelect(e.target.value)}
    >
      <option value="">All Namespaces</option>
      <option value="default">default</option>
      <option value="openshift">openshift</option>
    </select>
  ),
}));

const mockNodes: Node[] = [
  {
    name: 'worker-0',
    namespace: 'default',
    bmcAddress: '10.0.0.1',
    model: 'PowerEdge R640',
    manufacturer: 'Dell',
    serviceTag: 'ABC123',
    powerState: 'On',
    lastScanned: '2025-12-21T00:00:00Z',
    status: 'up-to-date',
    firmwareCount: 5,
    updatesAvailable: 0,
    health: 'OK',
    thermalSummary: { inletTempC: 22, maxTempC: 45, fanCount: 8, fansHealthy: 8, status: 'OK' },
    powerSummary: { currentWatts: 250, psuCount: 2, psusHealthy: 2, redundancy: 'Full', status: 'OK' },
  },
  {
    name: 'worker-1',
    namespace: 'openshift',
    bmcAddress: '10.0.0.2',
    model: 'PowerEdge R740',
    manufacturer: 'Dell',
    serviceTag: 'XYZ789',
    powerState: 'Off',
    lastScanned: '2025-12-21T00:00:00Z',
    status: 'up-to-date',
    firmwareCount: 5,
    updatesAvailable: 0,
    health: 'Warning',
    thermalSummary: { inletTempC: 25, maxTempC: 50, fanCount: 8, fansHealthy: 8, status: 'OK' },
    powerSummary: { currentWatts: 300, psuCount: 2, psusHealthy: 2, redundancy: 'Full', status: 'OK' },
  },
];

describe('Nodes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (api.getNodes as jest.Mock).mockResolvedValue(mockNodes);
    (api.getNamespaces as jest.Mock).mockResolvedValue(['default', 'openshift']);
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

  it('displays service tag column', async () => {
    render(
      <MemoryRouter>
        <Nodes />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('Service Tag')).toBeInTheDocument();
      expect(screen.getByText('ABC123')).toBeInTheDocument();
      expect(screen.getByText('XYZ789')).toBeInTheDocument();
    });
  });

  it('displays power state column', async () => {
    render(
      <MemoryRouter>
        <Nodes />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('Power State')).toBeInTheDocument();
      expect(screen.getByText('On')).toBeInTheDocument();
      expect(screen.getByText('Off')).toBeInTheDocument();
    });
  });

  it('does not display Temp column', async () => {
    render(
      <MemoryRouter>
        <Nodes />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.queryByText('Temp (°C)')).not.toBeInTheDocument();
    });
  });

  it('does not display Power column', async () => {
    render(
      <MemoryRouter>
        <Nodes />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.queryByText('Power (W)')).not.toBeInTheDocument();
    });
  });

  it('renders namespace dropdown', async () => {
    render(
      <MemoryRouter>
        <Nodes />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByTestId('namespace-dropdown')).toBeInTheDocument();
    });
  });

  it('filters nodes by namespace', async () => {
    render(
      <MemoryRouter>
        <Nodes />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('worker-0')).toBeInTheDocument();
      expect(screen.getByText('worker-1')).toBeInTheDocument();
    });

    // Select 'default' namespace
    const dropdown = screen.getByTestId('namespace-dropdown');
    fireEvent.change(dropdown, { target: { value: 'default' } });

    await waitFor(() => {
      expect(api.getNodes).toHaveBeenCalledWith('default');
    });
  });

  it('renders power state filter dropdown', async () => {
    render(
      <MemoryRouter>
        <Nodes />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText(/Power State:/)).toBeInTheDocument();
    });
  });

  it('renders health filter dropdown', async () => {
    render(
      <MemoryRouter>
        <Nodes />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText(/Health:/)).toBeInTheDocument();
    });
  });

  it('displays all expected columns', async () => {
    render(
      <MemoryRouter>
        <Nodes />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Service Tag')).toBeInTheDocument();
      expect(screen.getByText('Model')).toBeInTheDocument();
      expect(screen.getByText('Health')).toBeInTheDocument();
      expect(screen.getByText('Power State')).toBeInTheDocument();
      expect(screen.getByText('Last Scanned')).toBeInTheDocument();
    });
  });

  it('applies health filter from URL query param', async () => {
    const nodesWithCritical = [
      ...mockNodes,
      {
        name: 'worker-2',
        namespace: 'default',
        bmcAddress: '10.0.0.3',
        model: 'PowerEdge R640',
        manufacturer: 'Dell',
        serviceTag: 'DEF456',
        powerState: 'On',
        lastScanned: '2025-12-21T00:00:00Z',
        status: 'up-to-date',
        firmwareCount: 5,
        updatesAvailable: 0,
        health: 'Critical',
        thermalSummary: { inletTempC: 22, maxTempC: 45, fanCount: 8, fansHealthy: 8, status: 'OK' },
        powerSummary: { currentWatts: 250, psuCount: 2, psusHealthy: 2, redundancy: 'Full', status: 'OK' },
      },
    ];
    (api.getNodes as jest.Mock).mockResolvedValue(nodesWithCritical);

    render(
      <MemoryRouter initialEntries={['/baremetal-insights/nodes?health=Critical']}>
        <Nodes />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('worker-2')).toBeInTheDocument();
    });
    expect(screen.queryByText('worker-0')).not.toBeInTheDocument();
    expect(screen.queryByText('worker-1')).not.toBeInTheDocument();
  });

  it('applies power filter from URL query param', async () => {
    render(
      <MemoryRouter initialEntries={['/baremetal-insights/nodes?power=Off']}>
        <Nodes />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('worker-1')).toBeInTheDocument();
    });
    expect(screen.queryByText('worker-0')).not.toBeInTheDocument();
  });
});
