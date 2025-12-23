# Firmware Page Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign Firmware page with dual server/component views, slide-out drawer for details, and OnReboot update scheduling.

**Architecture:** Tab-based layout with shared toolbar. ServersTab aggregates firmware by node, ComponentsTab shows individual firmware entries. Both share selection state for scheduling updates. FirmwareDetailDrawer shows per-node firmware breakdown.

**Tech Stack:** React 17, PatternFly 5 (Tabs, Drawer, Modal, Table with selection), TypeScript

---

## Task 1: Add scheduleUpdates API Function

**Files:**
- Modify: `src/services/api.ts`
- Modify: `src/types.ts`

**Step 1: Add types for schedule updates**

In `src/types.ts`, add at the end:

```typescript
export interface ScheduleUpdateRequest {
  nodes: string[];
  components?: string[];
  mode: 'OnReboot';
}

export interface ScheduleUpdateResponse {
  taskIds: string[];
  message: string;
}
```

**Step 2: Add API function**

In `src/services/api.ts`, add import for new types and add function:

```typescript
import {
  // ... existing imports ...
  ScheduleUpdateRequest,
  ScheduleUpdateResponse,
} from '../types';

// Add at end of file:
export const scheduleUpdates = async (request: ScheduleUpdateRequest): Promise<ScheduleUpdateResponse> => {
  return consoleFetchJSON(`${API_BASE}/api/v1/updates/schedule`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
};
```

**Step 3: Commit**

```bash
git add src/types.ts src/services/api.ts
git commit -m "feat(api): add scheduleUpdates function for firmware updates"
```

---

## Task 2: Create FirmwareDetailDrawer Component

**Files:**
- Create: `src/components/FirmwareDetailDrawer.tsx`
- Create: `src/components/FirmwareDetailDrawer.test.tsx`

**Step 1: Write the test file**

Create `src/components/FirmwareDetailDrawer.test.tsx`:

```typescript
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
    expect(screen.getByText('BIOS')).toBeInTheDocument();
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
```

**Step 2: Run test to verify it fails**

```bash
npm test -- --testPathPattern="FirmwareDetailDrawer" --watchAll=false
```

Expected: FAIL - module not found

**Step 3: Write the component**

Create `src/components/FirmwareDetailDrawer.tsx`:

```typescript
import * as React from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerContentBody,
  DrawerPanelContent,
  DrawerHead,
  DrawerActions,
  DrawerCloseButton,
  DrawerPanelBody,
  Title,
  Text,
  TextContent,
  Label,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { Node } from '../types';

interface FirmwareDetailDrawerProps {
  isOpen: boolean;
  node: Node | null;
  onClose: () => void;
  children?: React.ReactNode;
}

export const FirmwareDetailDrawer: React.FC<FirmwareDetailDrawerProps> = ({
  isOpen,
  node,
  onClose,
  children,
}) => {
  const severityColor = (severity?: string) => {
    switch (severity) {
      case 'Critical':
        return 'red';
      case 'Recommended':
        return 'orange';
      case 'Optional':
        return 'blue';
      default:
        return 'grey';
    }
  };

  const panelContent = node ? (
    <DrawerPanelContent widths={{ default: 'width_50' }}>
      <DrawerHead>
        <Title headingLevel="h2">{node.name}</Title>
        <TextContent>
          <Text component="small">
            {node.model} | {node.manufacturer}
          </Text>
        </TextContent>
        <DrawerActions>
          <DrawerCloseButton onClick={onClose} />
        </DrawerActions>
      </DrawerHead>
      <DrawerPanelBody>
        <Table aria-label="Firmware details" variant="compact">
          <Thead>
            <Tr>
              <Th>Component</Th>
              <Th>Type</Th>
              <Th>Installed</Th>
              <Th>Available</Th>
              <Th>Severity</Th>
            </Tr>
          </Thead>
          <Tbody>
            {node.firmware?.map((fw) => (
              <Tr
                key={fw.id}
                style={{
                  backgroundColor: fw.availableVersion
                    ? 'var(--pf-v5-global--warning-color--200)'
                    : undefined,
                }}
              >
                <Td dataLabel="Component">{fw.name}</Td>
                <Td dataLabel="Type">{fw.componentType}</Td>
                <Td dataLabel="Installed">{fw.currentVersion}</Td>
                <Td dataLabel="Available">{fw.availableVersion || '-'}</Td>
                <Td dataLabel="Severity">
                  {fw.severity ? (
                    <Label color={severityColor(fw.severity)}>{fw.severity}</Label>
                  ) : (
                    '-'
                  )}
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </DrawerPanelBody>
    </DrawerPanelContent>
  ) : null;

  return (
    <Drawer isExpanded={isOpen} onExpand={onClose}>
      <DrawerContent panelContent={panelContent}>
        <DrawerContentBody>{children}</DrawerContentBody>
      </DrawerContent>
    </Drawer>
  );
};
```

**Step 4: Run test to verify it passes**

```bash
npm test -- --testPathPattern="FirmwareDetailDrawer" --watchAll=false
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/components/FirmwareDetailDrawer.tsx src/components/FirmwareDetailDrawer.test.tsx
git commit -m "feat(components): add FirmwareDetailDrawer for node firmware details"
```

---

## Task 3: Create ScheduleUpdateModal Component

**Files:**
- Create: `src/components/ScheduleUpdateModal.tsx`
- Create: `src/components/ScheduleUpdateModal.test.tsx`

**Step 1: Write the test file**

Create `src/components/ScheduleUpdateModal.test.tsx`:

```typescript
import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ScheduleUpdateModal } from './ScheduleUpdateModal';

describe('ScheduleUpdateModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onConfirm: jest.fn(),
    selectedNodes: ['worker-0', 'worker-1'],
    updateCount: 5,
    isLoading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when closed', () => {
    render(<ScheduleUpdateModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('Schedule Firmware Updates')).not.toBeInTheDocument();
  });

  it('renders title when open', () => {
    render(<ScheduleUpdateModal {...defaultProps} />);
    expect(screen.getByText('Schedule Firmware Updates')).toBeInTheDocument();
  });

  it('shows update count and node count', () => {
    render(<ScheduleUpdateModal {...defaultProps} />);
    expect(screen.getByText(/5 updates/)).toBeInTheDocument();
    expect(screen.getByText(/2 servers/)).toBeInTheDocument();
  });

  it('lists affected servers', () => {
    render(<ScheduleUpdateModal {...defaultProps} />);
    expect(screen.getByText('worker-0')).toBeInTheDocument();
    expect(screen.getByText('worker-1')).toBeInTheDocument();
  });

  it('shows OnReboot note', () => {
    render(<ScheduleUpdateModal {...defaultProps} />);
    expect(screen.getByText(/next server reboot/i)).toBeInTheDocument();
  });

  it('calls onClose when Cancel clicked', () => {
    render(<ScheduleUpdateModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('calls onConfirm when Confirm clicked', () => {
    render(<ScheduleUpdateModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Confirm'));
    expect(defaultProps.onConfirm).toHaveBeenCalled();
  });

  it('disables confirm button when loading', () => {
    render(<ScheduleUpdateModal {...defaultProps} isLoading={true} />);
    expect(screen.getByText('Scheduling...')).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- --testPathPattern="ScheduleUpdateModal" --watchAll=false
```

Expected: FAIL - module not found

**Step 3: Write the component**

Create `src/components/ScheduleUpdateModal.tsx`:

```typescript
import * as React from 'react';
import {
  Modal,
  ModalVariant,
  Button,
  TextContent,
  Text,
  List,
  ListItem,
  Alert,
} from '@patternfly/react-core';

interface ScheduleUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  selectedNodes: string[];
  updateCount: number;
  isLoading: boolean;
}

export const ScheduleUpdateModal: React.FC<ScheduleUpdateModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  selectedNodes,
  updateCount,
  isLoading,
}) => {
  if (!isOpen) return null;

  return (
    <Modal
      variant={ModalVariant.medium}
      title="Schedule Firmware Updates"
      isOpen={isOpen}
      onClose={onClose}
      actions={[
        <Button
          key="confirm"
          variant="primary"
          onClick={onConfirm}
          isLoading={isLoading}
          isDisabled={isLoading}
        >
          {isLoading ? 'Scheduling...' : 'Confirm'}
        </Button>,
        <Button key="cancel" variant="link" onClick={onClose} isDisabled={isLoading}>
          Cancel
        </Button>,
      ]}
    >
      <TextContent>
        <Text>
          <strong>{updateCount} updates</strong> on <strong>{selectedNodes.length} servers</strong>{' '}
          will be scheduled.
        </Text>
      </TextContent>

      <TextContent style={{ marginTop: '1rem' }}>
        <Text component="h4">Affected servers:</Text>
      </TextContent>
      <List>
        {selectedNodes.map((node) => (
          <ListItem key={node}>{node}</ListItem>
        ))}
      </List>

      <Alert
        variant="info"
        isInline
        title="OnReboot Mode"
        style={{ marginTop: '1rem' }}
      >
        Updates will be applied during the next server reboot.
      </Alert>
    </Modal>
  );
};
```

**Step 4: Run test to verify it passes**

```bash
npm test -- --testPathPattern="ScheduleUpdateModal" --watchAll=false
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/components/ScheduleUpdateModal.tsx src/components/ScheduleUpdateModal.test.tsx
git commit -m "feat(components): add ScheduleUpdateModal for update confirmation"
```

---

## Task 4: Create ServersTab Component

**Files:**
- Create: `src/components/ServersTab.tsx`
- Create: `src/components/ServersTab.test.tsx`

**Step 1: Write the test file**

Create `src/components/ServersTab.test.tsx`:

```typescript
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
```

**Step 2: Run test to verify it fails**

```bash
npm test -- --testPathPattern="ServersTab" --watchAll=false
```

Expected: FAIL - module not found

**Step 3: Write the component**

Create `src/components/ServersTab.tsx`:

```typescript
import * as React from 'react';
import { useMemo } from 'react';
import { Label } from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { Node, Severity } from '../types';

interface ServersTabProps {
  nodes: Node[];
  searchValue: string;
  updatesOnly: boolean;
  selectedNodes: string[];
  onSelectionChange: (selected: string[]) => void;
  onNodeClick: (node: Node) => void;
}

export const ServersTab: React.FC<ServersTabProps> = ({
  nodes,
  searchValue,
  updatesOnly,
  selectedNodes,
  onSelectionChange,
  onNodeClick,
}) => {
  const filteredNodes = useMemo(() => {
    let result = nodes;

    if (searchValue) {
      const search = searchValue.toLowerCase();
      result = result.filter(
        (n) =>
          n.name.toLowerCase().includes(search) ||
          n.model.toLowerCase().includes(search)
      );
    }

    if (updatesOnly) {
      result = result.filter((n) => n.updatesAvailable > 0);
    }

    return result;
  }, [nodes, searchValue, updatesOnly]);

  const selectableNodes = filteredNodes.filter((n) => n.updatesAvailable > 0);
  const allSelected =
    selectableNodes.length > 0 &&
    selectableNodes.every((n) => selectedNodes.includes(n.name));

  const handleSelectAll = () => {
    if (allSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(selectableNodes.map((n) => n.name));
    }
  };

  const handleSelectNode = (nodeName: string) => {
    if (selectedNodes.includes(nodeName)) {
      onSelectionChange(selectedNodes.filter((n) => n !== nodeName));
    } else {
      onSelectionChange([...selectedNodes, nodeName]);
    }
  };

  const getHighestSeverity = (node: Node): Severity | null => {
    if (!node.firmware) return null;
    const severities = node.firmware
      .filter((f) => f.availableVersion && f.severity)
      .map((f) => f.severity);
    if (severities.includes('Critical')) return 'Critical';
    if (severities.includes('Recommended')) return 'Recommended';
    if (severities.includes('Optional')) return 'Optional';
    return null;
  };

  const severityColor = (severity: Severity | null) => {
    switch (severity) {
      case 'Critical':
        return 'red';
      case 'Recommended':
        return 'orange';
      case 'Optional':
        return 'blue';
      default:
        return 'grey';
    }
  };

  return (
    <Table aria-label="Servers with firmware" variant="compact">
      <Thead>
        <Tr>
          <Th
            select={{
              onSelect: handleSelectAll,
              isSelected: allSelected,
            }}
          />
          <Th>Node Name</Th>
          <Th>Namespace</Th>
          <Th>Model</Th>
          <Th>Manufacturer</Th>
          <Th>Updates</Th>
          <Th>Severity</Th>
          <Th>Last Scanned</Th>
        </Tr>
      </Thead>
      <Tbody>
        {filteredNodes.length === 0 ? (
          <Tr>
            <Td colSpan={8}>
              <p style={{ textAlign: 'center', padding: '2rem' }}>No servers found</p>
            </Td>
          </Tr>
        ) : (
          filteredNodes.map((node) => {
            const hasUpdates = node.updatesAvailable > 0;
            const severity = getHighestSeverity(node);
            return (
              <Tr
                key={node.name}
                style={{
                  backgroundColor: hasUpdates
                    ? 'var(--pf-v5-global--warning-color--200)'
                    : undefined,
                }}
              >
                <Td
                  select={{
                    rowIndex: 0,
                    onSelect: () => handleSelectNode(node.name),
                    isSelected: selectedNodes.includes(node.name),
                    isDisabled: !hasUpdates,
                  }}
                />
                <Td dataLabel="Node Name">
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      onNodeClick(node);
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    {node.name}
                  </a>
                </Td>
                <Td dataLabel="Namespace">{node.namespace}</Td>
                <Td dataLabel="Model">{node.model}</Td>
                <Td dataLabel="Manufacturer">{node.manufacturer}</Td>
                <Td dataLabel="Updates">
                  {hasUpdates ? `${node.updatesAvailable} updates` : '-'}
                </Td>
                <Td dataLabel="Severity">
                  {severity ? (
                    <Label color={severityColor(severity)}>{severity}</Label>
                  ) : (
                    '-'
                  )}
                </Td>
                <Td dataLabel="Last Scanned">
                  {new Date(node.lastScanned).toLocaleString()}
                </Td>
              </Tr>
            );
          })
        )}
      </Tbody>
    </Table>
  );
};
```

**Step 4: Run test to verify it passes**

```bash
npm test -- --testPathPattern="ServersTab" --watchAll=false
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/components/ServersTab.tsx src/components/ServersTab.test.tsx
git commit -m "feat(components): add ServersTab for server-centric firmware view"
```

---

## Task 5: Create ComponentsTab Component

**Files:**
- Create: `src/components/ComponentsTab.tsx`
- Create: `src/components/ComponentsTab.test.tsx`

**Step 1: Write the test file**

Create `src/components/ComponentsTab.test.tsx`:

```typescript
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
    expect(screen.getByText('worker-0')).toBeInTheDocument();
    expect(screen.getAllByText('BIOS').length).toBeGreaterThan(0);
  });

  it('displays model column', () => {
    render(
      <MemoryRouter>
        <ComponentsTab {...defaultProps} />
      </MemoryRouter>
    );
    expect(screen.getByText('PowerEdge R640')).toBeInTheDocument();
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
```

**Step 2: Run test to verify it fails**

```bash
npm test -- --testPathPattern="ComponentsTab" --watchAll=false
```

Expected: FAIL - module not found

**Step 3: Write the component**

Create `src/components/ComponentsTab.tsx`:

```typescript
import * as React from 'react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Label } from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { FirmwareEntry } from '../types';

interface ComponentsTabProps {
  firmware: FirmwareEntry[];
  nodeModels: Record<string, string>;
  searchValue: string;
  updatesOnly: boolean;
  selectedComponents: string[];
  onSelectionChange: (selected: string[]) => void;
}

export const ComponentsTab: React.FC<ComponentsTabProps> = ({
  firmware,
  nodeModels,
  searchValue,
  updatesOnly,
  selectedComponents,
  onSelectionChange,
}) => {
  const filteredFirmware = useMemo(() => {
    let result = firmware;

    if (searchValue) {
      const search = searchValue.toLowerCase();
      result = result.filter(
        (entry) =>
          entry.node.toLowerCase().includes(search) ||
          (nodeModels[entry.node] || '').toLowerCase().includes(search) ||
          entry.firmware.name.toLowerCase().includes(search) ||
          entry.firmware.componentType.toLowerCase().includes(search)
      );
    }

    if (updatesOnly) {
      result = result.filter((entry) => entry.firmware.availableVersion);
    }

    return result;
  }, [firmware, nodeModels, searchValue, updatesOnly]);

  const selectableComponents = filteredFirmware.filter(
    (entry) => entry.firmware.availableVersion
  );
  const allSelected =
    selectableComponents.length > 0 &&
    selectableComponents.every((entry) =>
      selectedComponents.includes(`${entry.node}:${entry.firmware.id}`)
    );

  const handleSelectAll = () => {
    if (allSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(
        selectableComponents.map((entry) => `${entry.node}:${entry.firmware.id}`)
      );
    }
  };

  const handleSelectComponent = (key: string) => {
    if (selectedComponents.includes(key)) {
      onSelectionChange(selectedComponents.filter((k) => k !== key));
    } else {
      onSelectionChange([...selectedComponents, key]);
    }
  };

  const severityColor = (severity?: string) => {
    switch (severity) {
      case 'Critical':
        return 'red';
      case 'Recommended':
        return 'orange';
      case 'Optional':
        return 'blue';
      default:
        return 'grey';
    }
  };

  return (
    <Table aria-label="Firmware components" variant="compact">
      <Thead>
        <Tr>
          <Th
            select={{
              onSelect: handleSelectAll,
              isSelected: allSelected,
            }}
          />
          <Th>Node Name</Th>
          <Th>Model</Th>
          <Th>Component</Th>
          <Th>Installed Version</Th>
          <Th>Available Version</Th>
          <Th>Severity</Th>
        </Tr>
      </Thead>
      <Tbody>
        {filteredFirmware.length === 0 ? (
          <Tr>
            <Td colSpan={7}>
              <p style={{ textAlign: 'center', padding: '2rem' }}>
                No firmware components found
              </p>
            </Td>
          </Tr>
        ) : (
          filteredFirmware.map((entry, index) => {
            const key = `${entry.node}:${entry.firmware.id}`;
            const hasUpdate = !!entry.firmware.availableVersion;
            return (
              <Tr
                key={`${key}-${index}`}
                style={{
                  backgroundColor: hasUpdate
                    ? 'var(--pf-v5-global--warning-color--200)'
                    : undefined,
                }}
              >
                <Td
                  select={{
                    rowIndex: index,
                    onSelect: () => handleSelectComponent(key),
                    isSelected: selectedComponents.includes(key),
                    isDisabled: !hasUpdate,
                  }}
                />
                <Td dataLabel="Node Name">
                  <Link to={`/baremetal-insights/nodes/${entry.node}`}>
                    {entry.node}
                  </Link>
                </Td>
                <Td dataLabel="Model">{nodeModels[entry.node] || '-'}</Td>
                <Td dataLabel="Component">
                  {entry.firmware.name}
                  <br />
                  <small style={{ color: 'var(--pf-v5-global--Color--200)' }}>
                    {entry.firmware.componentType}
                  </small>
                </Td>
                <Td dataLabel="Installed Version">{entry.firmware.currentVersion}</Td>
                <Td dataLabel="Available Version">
                  {entry.firmware.availableVersion || '-'}
                </Td>
                <Td dataLabel="Severity">
                  {entry.firmware.severity ? (
                    <Label color={severityColor(entry.firmware.severity)}>
                      {entry.firmware.severity}
                    </Label>
                  ) : (
                    '-'
                  )}
                </Td>
              </Tr>
            );
          })
        )}
      </Tbody>
    </Table>
  );
};
```

**Step 4: Run test to verify it passes**

```bash
npm test -- --testPathPattern="ComponentsTab" --watchAll=false
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/components/ComponentsTab.tsx src/components/ComponentsTab.test.tsx
git commit -m "feat(components): add ComponentsTab for component-level firmware view"
```

---

## Task 6: Refactor Firmware Page with Tabs

**Files:**
- Modify: `src/pages/Firmware.tsx`
- Modify: `src/pages/Firmware.test.tsx` (if exists, otherwise create)

**Step 1: Rewrite Firmware.tsx**

Replace entire `src/pages/Firmware.tsx` with:

```typescript
import * as React from 'react';
import { useEffect, useState, useMemo } from 'react';
import {
  Page,
  PageSection,
  Title,
  Spinner,
  Alert,
  Card,
  CardTitle,
  CardBody,
  Flex,
  FlexItem,
  Split,
  SplitItem,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  SearchInput,
  Label,
  Button,
  Tabs,
  Tab,
  TabTitleText,
  Switch,
  AlertGroup,
  AlertVariant,
  AlertActionCloseButton,
} from '@patternfly/react-core';
import { FirmwareResponse, Node } from '../types';
import { getFirmware, getNodes, scheduleUpdates } from '../services/api';
import { NamespaceDropdown } from '../components/NamespaceDropdown';
import { ServersTab } from '../components/ServersTab';
import { ComponentsTab } from '../components/ComponentsTab';
import { FirmwareDetailDrawer } from '../components/FirmwareDetailDrawer';
import { ScheduleUpdateModal } from '../components/ScheduleUpdateModal';

export const Firmware: React.FC = () => {
  const [firmwareData, setFirmwareData] = useState<FirmwareResponse | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [namespace, setNamespace] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [activeTab, setActiveTab] = useState<string | number>('servers');
  const [updatesOnly, setUpdatesOnly] = useState(false);

  // Selection state
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [selectedComponents, setSelectedComponents] = useState<string[]>([]);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [scheduling, setScheduling] = useState(false);

  // Alerts
  const [alerts, setAlerts] = useState<{ key: number; title: string; variant: AlertVariant }[]>([]);
  const [alertKey, setAlertKey] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [firmware, nodeData] = await Promise.all([
          getFirmware(namespace || undefined),
          getNodes(namespace || undefined),
        ]);
        setFirmwareData(firmware);
        setNodes(nodeData);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [namespace]);

  // Build node models map for ComponentsTab
  const nodeModels = useMemo(() => {
    const map: Record<string, string> = {};
    nodes.forEach((n) => {
      map[n.name] = n.model;
    });
    return map;
  }, [nodes]);

  // Calculate update counts for modal
  const getUpdateCount = () => {
    if (activeTab === 'servers') {
      return nodes
        .filter((n) => selectedNodes.includes(n.name))
        .reduce((sum, n) => sum + n.updatesAvailable, 0);
    } else {
      return selectedComponents.length;
    }
  };

  const getSelectedNodeNames = () => {
    if (activeTab === 'servers') {
      return selectedNodes;
    } else {
      const nodeSet = new Set(selectedComponents.map((c) => c.split(':')[0]));
      return Array.from(nodeSet);
    }
  };

  const handleNodeClick = (node: Node) => {
    setSelectedNode(node);
    setDrawerOpen(true);
  };

  const handleScheduleClick = () => {
    setModalOpen(true);
  };

  const handleConfirmSchedule = async () => {
    setScheduling(true);
    try {
      const nodeNames = getSelectedNodeNames();
      const components =
        activeTab === 'components'
          ? selectedComponents.map((c) => c.split(':')[1])
          : undefined;

      await scheduleUpdates({
        nodes: nodeNames,
        components,
        mode: 'OnReboot',
      });

      setAlerts((prev) => [
        ...prev,
        {
          key: alertKey,
          title: `Successfully scheduled ${getUpdateCount()} updates on ${nodeNames.length} servers`,
          variant: AlertVariant.success,
        },
      ]);
      setAlertKey((k) => k + 1);

      // Clear selections
      setSelectedNodes([]);
      setSelectedComponents([]);
      setModalOpen(false);

      // Refresh data
      const [firmware, nodeData] = await Promise.all([
        getFirmware(namespace || undefined),
        getNodes(namespace || undefined),
      ]);
      setFirmwareData(firmware);
      setNodes(nodeData);
    } catch (err) {
      setAlerts((prev) => [
        ...prev,
        {
          key: alertKey,
          title: `Failed to schedule updates: ${err instanceof Error ? err.message : 'Unknown error'}`,
          variant: AlertVariant.danger,
        },
      ]);
      setAlertKey((k) => k + 1);
    } finally {
      setScheduling(false);
    }
  };

  const removeAlert = (key: number) => {
    setAlerts((prev) => prev.filter((a) => a.key !== key));
  };

  const selectionCount = activeTab === 'servers' ? selectedNodes.length : selectedComponents.length;

  if (loading && !firmwareData) {
    return (
      <Page>
        <PageSection>
          <Spinner aria-label="Loading" />
        </PageSection>
      </Page>
    );
  }

  if (error) {
    return (
      <Page>
        <PageSection>
          <Alert variant="danger" title="Error loading data">
            {error}
          </Alert>
        </PageSection>
      </Page>
    );
  }

  const mainContent = (
    <Page>
      {/* Alerts */}
      <AlertGroup isToast isLiveRegion>
        {alerts.map((alert) => (
          <Alert
            key={alert.key}
            variant={alert.variant}
            title={alert.title}
            actionClose={<AlertActionCloseButton onClose={() => removeAlert(alert.key)} />}
          />
        ))}
      </AlertGroup>

      {/* Header */}
      <PageSection variant="light">
        <Flex
          justifyContent={{ default: 'justifyContentSpaceBetween' }}
          alignItems={{ default: 'alignItemsCenter' }}
        >
          <FlexItem>
            <Title headingLevel="h1">Firmware</Title>
          </FlexItem>
          <FlexItem>
            <NamespaceDropdown selected={namespace} onSelect={setNamespace} />
          </FlexItem>
        </Flex>
      </PageSection>

      {/* Updates Summary Card */}
      {firmwareData && (
        <PageSection>
          <Card>
            <CardTitle>Updates Summary</CardTitle>
            <CardBody>
              <Split hasGutter>
                <SplitItem>
                  <strong>Total:</strong> {firmwareData.summary.total}
                </SplitItem>
                <SplitItem>
                  <strong>Updates Available:</strong> {firmwareData.summary.updatesAvailable}
                </SplitItem>
                <SplitItem>
                  <Label color="red">Critical: {firmwareData.summary.critical}</Label>
                </SplitItem>
                <SplitItem>
                  <Label color="orange">Recommended: {firmwareData.summary.recommended}</Label>
                </SplitItem>
                <SplitItem>
                  <Label color="blue">Optional: {firmwareData.summary.optional}</Label>
                </SplitItem>
              </Split>
            </CardBody>
          </Card>
        </PageSection>
      )}

      {/* Tabs and Content */}
      <PageSection>
        <Card>
          <CardBody>
            {/* Toolbar */}
            <Toolbar>
              <ToolbarContent>
                <ToolbarItem>
                  <SearchInput
                    placeholder="Search by node name or model..."
                    value={searchValue}
                    onChange={(_e, value) => setSearchValue(value)}
                    onClear={() => setSearchValue('')}
                    style={{ width: '300px' }}
                  />
                </ToolbarItem>
                <ToolbarItem>
                  <Switch
                    id="updates-only-switch"
                    label="Updates only"
                    isChecked={updatesOnly}
                    onChange={(_e, checked) => setUpdatesOnly(checked)}
                  />
                </ToolbarItem>
                <ToolbarItem align={{ default: 'alignRight' }}>
                  <Button
                    variant="primary"
                    isDisabled={selectionCount === 0}
                    onClick={handleScheduleClick}
                  >
                    Schedule Update{selectionCount > 0 ? ` (${selectionCount})` : ''}
                  </Button>
                </ToolbarItem>
              </ToolbarContent>
            </Toolbar>

            {/* Tabs */}
            <Tabs
              activeKey={activeTab}
              onSelect={(_e, key) => {
                setActiveTab(key);
                setSelectedNodes([]);
                setSelectedComponents([]);
              }}
              style={{ marginTop: '1rem' }}
            >
              <Tab eventKey="servers" title={<TabTitleText>Servers</TabTitleText>}>
                <div style={{ marginTop: '1rem' }}>
                  <ServersTab
                    nodes={nodes}
                    searchValue={searchValue}
                    updatesOnly={updatesOnly}
                    selectedNodes={selectedNodes}
                    onSelectionChange={setSelectedNodes}
                    onNodeClick={handleNodeClick}
                  />
                </div>
              </Tab>
              <Tab eventKey="components" title={<TabTitleText>Components</TabTitleText>}>
                <div style={{ marginTop: '1rem' }}>
                  <ComponentsTab
                    firmware={firmwareData?.firmware || []}
                    nodeModels={nodeModels}
                    searchValue={searchValue}
                    updatesOnly={updatesOnly}
                    selectedComponents={selectedComponents}
                    onSelectionChange={setSelectedComponents}
                  />
                </div>
              </Tab>
            </Tabs>
          </CardBody>
        </Card>
      </PageSection>

      {/* Schedule Update Modal */}
      <ScheduleUpdateModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleConfirmSchedule}
        selectedNodes={getSelectedNodeNames()}
        updateCount={getUpdateCount()}
        isLoading={scheduling}
      />
    </Page>
  );

  return (
    <FirmwareDetailDrawer
      isOpen={drawerOpen}
      node={selectedNode}
      onClose={() => setDrawerOpen(false)}
    >
      {mainContent}
    </FirmwareDetailDrawer>
  );
};

export default Firmware;
```

**Step 2: Run all tests**

```bash
npm test -- --watchAll=false
```

Expected: All tests pass

**Step 3: Commit**

```bash
git add src/pages/Firmware.tsx
git commit -m "feat(Firmware): redesign with tabs, drawer, and update scheduling"
```

---

## Task 7: Add Firmware Page Tests

**Files:**
- Create/Modify: `src/pages/Firmware.test.tsx`

**Step 1: Write comprehensive tests**

Create/replace `src/pages/Firmware.test.tsx`:

```typescript
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
```

**Step 2: Run tests**

```bash
npm test -- --testPathPattern="Firmware" --watchAll=false
```

Expected: PASS

**Step 3: Commit**

```bash
git add src/pages/Firmware.test.tsx
git commit -m "test(Firmware): add comprehensive tests for redesigned page"
```

---

## Summary

This plan creates:
1. **API function** for scheduling updates
2. **FirmwareDetailDrawer** - slide-out panel with firmware details
3. **ScheduleUpdateModal** - confirmation dialog for updates
4. **ServersTab** - server-centric view with selection
5. **ComponentsTab** - component-level view with selection
6. **Refactored Firmware page** - tabs, shared toolbar, integrated components

Each task follows TDD with failing test first, then implementation.
