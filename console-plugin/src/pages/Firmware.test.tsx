import * as React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Firmware } from './Firmware';
import * as api from '../services/api';

jest.mock('../services/api');

const mockFirmwareResponse = {
  summary: {
    total: 20,
    updatesAvailable: 5,
    critical: 1,
    recommended: 3,
    optional: 1,
  },
  firmware: [
    {
      node: 'worker-0',
      namespace: 'openshift-machine-api',
      firmware: {
        id: 'bios-1',
        name: 'BIOS',
        currentVersion: '2.10.0',
        availableVersion: '2.12.0',
        updateable: true,
        componentType: 'BIOS',
        severity: 'Recommended' as const,
      },
    },
  ],
};

const mockNodes = [
  {
    name: 'worker-0',
    namespace: 'openshift-machine-api',
    bmcAddress: 'idrac-10.0.0.1:443',
    model: 'PowerEdge R640',
    manufacturer: 'Dell Inc.',
    serviceTag: 'ABC123',
    powerState: 'On' as const,
    lastScanned: '2025-12-23T00:00:00Z',
    status: 'needs-update' as const,
    firmwareCount: 10,
    updatesAvailable: 3,
    health: 'OK' as const,
    firmware: mockFirmwareResponse.firmware.map((f) => f.firmware),
  },
];

describe('Firmware', () => {
  beforeEach(() => {
    (api.getFirmware as jest.Mock).mockResolvedValue(mockFirmwareResponse);
    (api.getNodes as jest.Mock).mockResolvedValue(mockNodes);
    (api.getNamespaces as jest.Mock).mockResolvedValue(['ns-a', 'ns-b']);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders title', async () => {
    render(
      <MemoryRouter>
        <Firmware />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Firmware' })).toBeInTheDocument();
    });
  });

  it('renders updates summary', async () => {
    render(
      <MemoryRouter>
        <Firmware />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText(/Total:/)).toBeInTheDocument();
      expect(screen.getByText('20')).toBeInTheDocument();
    });
  });

  it('renders Servers and Components tabs', async () => {
    render(
      <MemoryRouter>
        <Firmware />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Servers' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Components' })).toBeInTheDocument();
    });
  });

  it('shows Servers tab by default', async () => {
    render(
      <MemoryRouter>
        <Firmware />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Servers' })).toHaveAttribute(
        'aria-selected',
        'true'
      );
    });
  });

  it('switches to Components tab when clicked', async () => {
    render(
      <MemoryRouter>
        <Firmware />
      </MemoryRouter>
    );
    await waitFor(() => {
      fireEvent.click(screen.getByRole('tab', { name: 'Components' }));
    });
    expect(screen.getByRole('tab', { name: 'Components' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });

  it('renders Schedule Update button disabled initially', async () => {
    render(
      <MemoryRouter>
        <Firmware />
      </MemoryRouter>
    );
    await waitFor(() => {
      const button = screen.getByRole('button', { name: /Schedule Update/i });
      expect(button).toBeDisabled();
    });
  });

  it('renders search input', async () => {
    render(
      <MemoryRouter>
        <Firmware />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Search by node name or model/)).toBeInTheDocument();
    });
  });

  it('renders updates only toggle', async () => {
    render(
      <MemoryRouter>
        <Firmware />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByLabelText('Updates only')).toBeInTheDocument();
    });
  });
});
