import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Firmware } from './Firmware';
import { getFirmware, getNamespaces } from '../services/api';

jest.mock('../services/api');

describe('Firmware', () => {
  beforeEach(() => {
    (getNamespaces as jest.Mock).mockResolvedValue(['ns-a', 'ns-b']);
    (getFirmware as jest.Mock).mockResolvedValue({
      summary: {
        total: 10,
        updatesAvailable: 3,
        critical: 1,
        recommended: 1,
        optional: 1,
      },
      firmware: [
        {
          node: 'node1',
          namespace: 'ns-a',
          firmware: {
            id: 'fw1',
            name: 'BIOS',
            currentVersion: '1.0.0',
            availableVersion: '2.0.0',
            updateable: true,
            componentType: 'BIOS',
            severity: 'Critical',
          },
        },
        {
          node: 'node2',
          namespace: 'ns-b',
          firmware: {
            id: 'fw2',
            name: 'NIC Firmware',
            currentVersion: '3.0.0',
            availableVersion: '3.1.0',
            updateable: true,
            componentType: 'NetworkInterface',
            severity: 'Recommended',
          },
        },
        {
          node: 'node1',
          namespace: 'ns-a',
          firmware: {
            id: 'fw3',
            name: 'BMC',
            currentVersion: '5.0.0',
            updateable: false,
            componentType: 'BMC',
          },
        },
      ],
    });
  });

  it('renders firmware page title', async () => {
    render(
      <MemoryRouter>
        <Firmware />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Firmware' })).toBeInTheDocument();
    });
  });

  it('displays updates summary', async () => {
    render(
      <MemoryRouter>
        <Firmware />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('Updates Summary')).toBeInTheDocument();
      expect(screen.getByText(/Total:/)).toBeInTheDocument();
      expect(screen.getByText(/Updates Available:/)).toBeInTheDocument();
    });
  });

  it('renders firmware entries in table', async () => {
    render(
      <MemoryRouter>
        <Firmware />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getAllByText('node1').length).toBeGreaterThan(0);
      expect(screen.getByText('node2')).toBeInTheDocument();
      expect(screen.getAllByText('BIOS').length).toBeGreaterThan(0);
      expect(screen.getByText('NIC Firmware')).toBeInTheDocument();
    });
  });
});
