import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { FirmwareDetailDrawer } from './FirmwareDetailDrawer';
import { Node, FirmwareComponent } from '../types';

const mockFirmware: FirmwareComponent[] = [
  {
    id: 'bios-1',
    name: 'BIOS',
    currentVersion: '2.10.0',
    availableVersion: '2.12.0',
    updateable: true,
    componentType: 'BIOS',
    severity: 'Recommended',
  },
  {
    id: 'idrac-1',
    name: 'iDRAC',
    currentVersion: '5.0.0',
    updateable: true,
    componentType: 'BMC',
  },
];

const mockNode: Node = {
  name: 'worker-0',
  namespace: 'openshift-machine-api',
  bmcAddress: 'idrac-10.0.0.1:443',
  model: 'PowerEdge R640',
  manufacturer: 'Dell Inc.',
  serviceTag: 'ABC123',
  powerState: 'On',
  lastScanned: '2025-12-23T00:00:00Z',
  status: 'needs-update',
  firmwareCount: 2,
  updatesAvailable: 1,
  health: 'OK',
  firmware: mockFirmware,
};

describe('FirmwareDetailDrawer', () => {
  it('renders nothing when closed', () => {
    render(
      <FirmwareDetailDrawer
        isOpen={false}
        node={null}
        onClose={jest.fn()}
      />
    );
    expect(screen.queryByText('worker-0')).not.toBeInTheDocument();
  });

  it('renders node name as title when open', () => {
    render(
      <FirmwareDetailDrawer
        isOpen={true}
        node={mockNode}
        onClose={jest.fn()}
      />
    );
    expect(screen.getByText('worker-0')).toBeInTheDocument();
  });

  it('renders model and manufacturer', () => {
    render(
      <FirmwareDetailDrawer
        isOpen={true}
        node={mockNode}
        onClose={jest.fn()}
      />
    );
    expect(screen.getByText(/PowerEdge R640/)).toBeInTheDocument();
    expect(screen.getByText(/Dell Inc/)).toBeInTheDocument();
  });

  it('renders firmware table with components', () => {
    render(
      <FirmwareDetailDrawer
        isOpen={true}
        node={mockNode}
        onClose={jest.fn()}
      />
    );
    expect(screen.getAllByText('BIOS').length).toBeGreaterThan(0);
    expect(screen.getByText('iDRAC')).toBeInTheDocument();
    expect(screen.getByText('2.10.0')).toBeInTheDocument();
    expect(screen.getByText('2.12.0')).toBeInTheDocument();
  });

  it('shows dash for components without available version', () => {
    render(
      <FirmwareDetailDrawer
        isOpen={true}
        node={mockNode}
        onClose={jest.fn()}
      />
    );
    const cells = screen.getAllByText('-');
    expect(cells.length).toBeGreaterThan(0);
  });
});
