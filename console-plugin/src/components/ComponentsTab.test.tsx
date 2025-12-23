import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ComponentsTab } from './ComponentsTab';
import { FirmwareEntry } from '../types';

const mockFirmware: FirmwareEntry[] = [
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
      severity: 'Recommended',
    },
  },
  {
    node: 'worker-0',
    namespace: 'openshift-machine-api',
    firmware: {
      id: 'idrac-1',
      name: 'iDRAC',
      currentVersion: '5.0.0',
      updateable: true,
      componentType: 'BMC',
    },
  },
  {
    node: 'worker-1',
    namespace: 'openshift-machine-api',
    firmware: {
      id: 'bios-2',
      name: 'BIOS',
      currentVersion: '2.12.0',
      updateable: true,
      componentType: 'BIOS',
    },
  },
];

const mockNodeModels: Record<string, string> = {
  'worker-0': 'PowerEdge R640',
  'worker-1': 'PowerEdge R740',
};

describe('ComponentsTab', () => {
  const defaultProps = {
    firmware: mockFirmware,
    nodeModels: mockNodeModels,
    searchValue: '',
    updatesOnly: false,
    selectedComponents: [] as string[],
    onSelectionChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders table with firmware data', () => {
    render(
      <MemoryRouter>
        <ComponentsTab {...defaultProps} />
      </MemoryRouter>
    );
    expect(screen.getAllByText('worker-0').length).toBeGreaterThan(0);
    expect(screen.getAllByText('BIOS').length).toBeGreaterThan(0);
  });

  it('displays model column', () => {
    render(
      <MemoryRouter>
        <ComponentsTab {...defaultProps} />
      </MemoryRouter>
    );
    expect(screen.getAllByText('PowerEdge R640').length).toBeGreaterThan(0);
    expect(screen.getByText('PowerEdge R740')).toBeInTheDocument();
  });

  it('filters by search value including model', () => {
    render(
      <MemoryRouter>
        <ComponentsTab {...defaultProps} searchValue="R740" />
      </MemoryRouter>
    );
    expect(screen.queryByText('worker-0')).not.toBeInTheDocument();
    expect(screen.getByText('worker-1')).toBeInTheDocument();
  });

  it('filters to updates only', () => {
    render(
      <MemoryRouter>
        <ComponentsTab {...defaultProps} updatesOnly={true} />
      </MemoryRouter>
    );
    // Only bios-1 has an available update
    expect(screen.getByText('2.12.0')).toBeInTheDocument();
    expect(screen.queryByText('5.0.0')).not.toBeInTheDocument();
  });

  it('calls onSelectionChange when checkbox clicked', () => {
    render(
      <MemoryRouter>
        <ComponentsTab {...defaultProps} />
      </MemoryRouter>
    );
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]); // First data row checkbox
    expect(defaultProps.onSelectionChange).toHaveBeenCalled();
  });
});
