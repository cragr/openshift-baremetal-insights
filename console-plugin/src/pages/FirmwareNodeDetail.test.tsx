import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Switch } from 'react-router-dom';
import { FirmwareNodeDetail } from './FirmwareNodeDetail';
import * as api from '../services/api';

jest.mock('../services/api');

const mockNode = {
  name: 'worker-0',
  namespace: 'openshift-machine-api',
  bmcAddress: '10.0.0.1',
  model: 'PowerEdge R640',
  manufacturer: 'Dell Inc.',
  serviceTag: 'ABC1234',
  lastScanned: '2025-12-21T00:00:00Z',
  status: 'needs-update',
  firmwareCount: 5,
  updatesAvailable: 1,
};

const mockFirmware = [
  {
    id: 'bios',
    name: 'BIOS',
    componentType: 'BIOS',
    currentVersion: '2.18.1',
    availableVersion: '2.19.1',
    updateable: true,
  },
];

describe('FirmwareNodeDetail', () => {
  beforeEach(() => {
    (api.getNodes as jest.Mock).mockResolvedValue([mockNode]);
    (api.getNodeFirmware as jest.Mock).mockResolvedValue(mockFirmware);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders node name', async () => {
    render(
      <MemoryRouter initialEntries={['/redfish-insights/firmware/nodes/worker-0']}>
        <Switch>
          <Route path="/redfish-insights/firmware/nodes/:name" component={FirmwareNodeDetail} />
        </Switch>
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'worker-0' })).toBeInTheDocument();
    });
  });

  it('displays firmware component', async () => {
    render(
      <MemoryRouter initialEntries={['/redfish-insights/firmware/nodes/worker-0']}>
        <Switch>
          <Route path="/redfish-insights/firmware/nodes/:name" component={FirmwareNodeDetail} />
        </Switch>
      </MemoryRouter>
    );
    await waitFor(() => {
      const biosElements = screen.getAllByText('BIOS');
      expect(biosElements.length).toBeGreaterThan(0);
      expect(screen.getByText('2.18.1')).toBeInTheDocument();
    });
  });

  it('displays loading spinner initially', () => {
    (api.getNodes as jest.Mock).mockImplementation(() => new Promise(() => {}));
    render(
      <MemoryRouter initialEntries={['/redfish-insights/firmware/nodes/worker-0']}>
        <Switch>
          <Route path="/redfish-insights/firmware/nodes/:name" component={FirmwareNodeDetail} />
        </Switch>
      </MemoryRouter>
    );
    expect(screen.getByLabelText('Loading')).toBeInTheDocument();
  });

  it('displays error message on API failure', async () => {
    (api.getNodes as jest.Mock).mockRejectedValue(new Error('Network error'));
    render(
      <MemoryRouter initialEntries={['/redfish-insights/firmware/nodes/worker-0']}>
        <Switch>
          <Route path="/redfish-insights/firmware/nodes/:name" component={FirmwareNodeDetail} />
        </Switch>
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('displays node not found error', async () => {
    (api.getNodes as jest.Mock).mockResolvedValue([]);
    render(
      <MemoryRouter initialEntries={['/redfish-insights/firmware/nodes/nonexistent']}>
        <Switch>
          <Route path="/redfish-insights/firmware/nodes/:name" component={FirmwareNodeDetail} />
        </Switch>
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('Node not found')).toBeInTheDocument();
    });
  });
});
