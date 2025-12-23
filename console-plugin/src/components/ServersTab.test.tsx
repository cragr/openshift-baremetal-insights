import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ServersTab } from './ServersTab';
import { Node } from '../types';

const mockNodes: Node[] = [
  {
    name: 'worker-0',
    namespace: 'openshift-machine-api',
    bmcAddress: 'idrac-10.0.0.1:443',
    model: 'PowerEdge R640',
    manufacturer: 'Dell Inc.',
    serviceTag: 'ABC123',
    powerState: 'On',
    lastScanned: '2025-12-23T00:00:00Z',
    status: 'needs-update',
    firmwareCount: 10,
    updatesAvailable: 3,
    health: 'OK',
    firmware: [
      {
        id: 'bios-1',
        name: 'BIOS',
        currentVersion: '2.10.0',
        availableVersion: '2.12.0',
        updateable: true,
        componentType: 'BIOS',
        severity: 'Recommended',
      },
    ],
  },
  {
    name: 'worker-1',
    namespace: 'openshift-machine-api',
    bmcAddress: 'idrac-10.0.0.2:443',
    model: 'PowerEdge R640',
    manufacturer: 'Dell Inc.',
    serviceTag: 'DEF456',
    powerState: 'On',
    lastScanned: '2025-12-23T00:00:00Z',
    status: 'up-to-date',
    firmwareCount: 10,
    updatesAvailable: 0,
    health: 'OK',
  },
];

describe('ServersTab', () => {
  const defaultProps = {
    nodes: mockNodes,
    searchValue: '',
    updatesOnly: false,
    selectedNodes: [] as string[],
    onSelectionChange: jest.fn(),
    onNodeClick: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders table with node data', () => {
    render(
      <MemoryRouter>
        <ServersTab {...defaultProps} />
      </MemoryRouter>
    );
    expect(screen.getByText('worker-0')).toBeInTheDocument();
    expect(screen.getByText('worker-1')).toBeInTheDocument();
  });

  it('displays model and manufacturer', () => {
    render(
      <MemoryRouter>
        <ServersTab {...defaultProps} />
      </MemoryRouter>
    );
    expect(screen.getAllByText('PowerEdge R640').length).toBe(2);
    expect(screen.getAllByText('Dell Inc.').length).toBe(2);
  });

  it('displays updates count', () => {
    render(
      <MemoryRouter>
        <ServersTab {...defaultProps} />
      </MemoryRouter>
    );
    expect(screen.getByText('3 updates')).toBeInTheDocument();
  });

  it('filters by search value', () => {
    render(
      <MemoryRouter>
        <ServersTab {...defaultProps} searchValue="worker-0" />
      </MemoryRouter>
    );
    expect(screen.getByText('worker-0')).toBeInTheDocument();
    expect(screen.queryByText('worker-1')).not.toBeInTheDocument();
  });

  it('filters to updates only', () => {
    render(
      <MemoryRouter>
        <ServersTab {...defaultProps} updatesOnly={true} />
      </MemoryRouter>
    );
    expect(screen.getByText('worker-0')).toBeInTheDocument();
    expect(screen.queryByText('worker-1')).not.toBeInTheDocument();
  });

  it('calls onNodeClick when node name clicked', () => {
    render(
      <MemoryRouter>
        <ServersTab {...defaultProps} />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByText('worker-0'));
    expect(defaultProps.onNodeClick).toHaveBeenCalledWith(mockNodes[0]);
  });

  it('disables checkbox for nodes without updates', () => {
    render(
      <MemoryRouter>
        <ServersTab {...defaultProps} />
      </MemoryRouter>
    );
    const checkboxes = screen.getAllByRole('checkbox');
    // First is header, second is worker-0 (enabled), third is worker-1 (disabled)
    expect(checkboxes[2]).toBeDisabled();
  });
});
