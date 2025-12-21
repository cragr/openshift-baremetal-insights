# Phase 3: Console Plugin Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an OpenShift Console Plugin with PatternFly 6 to display firmware inventory and update status.

**Architecture:** TypeScript/React frontend using OpenShift Dynamic Plugin SDK. Three pages under Compute nav: Overview (dashboard), Nodes (table), Updates (grouped). API calls proxied through console.

**Tech Stack:** TypeScript, React 18, PatternFly 6, OpenShift Console Plugin SDK, webpack, nginx

---

## Task 1: Initialize Console Plugin Project

**Files:**
- Create: `console-plugin/package.json`
- Create: `console-plugin/tsconfig.json`
- Create: `console-plugin/.eslintrc.js`

**Step 1: Create package.json**

Create `console-plugin/package.json`:
```json
{
  "name": "redfish-insights-plugin",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "build": "webpack --mode=production",
    "dev": "webpack serve --mode=development",
    "lint": "eslint src --ext .ts,.tsx",
    "test": "jest",
    "test:watch": "jest --watch"
  },
  "devDependencies": {
    "@openshift-console/dynamic-plugin-sdk": "^1.0.0",
    "@openshift-console/dynamic-plugin-sdk-webpack": "^1.0.0",
    "@patternfly/react-charts": "^8.0.0",
    "@patternfly/react-core": "^6.0.0",
    "@patternfly/react-table": "^6.0.0",
    "@testing-library/jest-dom": "^6.4.0",
    "@testing-library/react": "^14.2.0",
    "@types/jest": "^29.5.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@typescript-eslint/eslint-plugin": "^7.0.0",
    "@typescript-eslint/parser": "^7.0.0",
    "css-loader": "^6.10.0",
    "eslint": "^8.57.0",
    "eslint-plugin-react": "^7.34.0",
    "eslint-plugin-react-hooks": "^4.6.0",
    "jest": "^29.7.0",
    "jest-environment-jsdom": "^29.7.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.22.0",
    "style-loader": "^3.3.0",
    "ts-jest": "^29.1.0",
    "ts-loader": "^9.5.0",
    "typescript": "^5.3.0",
    "webpack": "^5.90.0",
    "webpack-cli": "^5.1.0",
    "webpack-dev-server": "^5.0.0"
  }
}
```

**Step 2: Create tsconfig.json**

Create `console-plugin/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "baseUrl": "src",
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 3: Create ESLint config**

Create `console-plugin/.eslintrc.js`:
```javascript
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  settings: {
    react: { version: 'detect' },
  },
  plugins: ['@typescript-eslint', 'react', 'react-hooks'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
  ],
  rules: {
    'react/react-in-jsx-scope': 'off',
  },
  env: {
    browser: true,
    es2020: true,
    node: true,
  },
};
```

**Step 4: Verify directory created**

Run:
```bash
ls -la console-plugin/
```

Expected: package.json, tsconfig.json, .eslintrc.js present

**Step 5: Commit**

```bash
git add console-plugin/
git commit -m "feat(console-plugin): initialize project with package.json and configs"
```

---

## Task 2: Webpack and Plugin Configuration

**Files:**
- Create: `console-plugin/webpack.config.ts`
- Create: `console-plugin/plugin-manifest.json`
- Create: `console-plugin/console-extensions.json`

**Step 1: Create webpack config**

Create `console-plugin/webpack.config.ts`:
```typescript
import * as path from 'path';
import { Configuration } from 'webpack';
import { ConsoleRemotePlugin } from '@openshift-console/dynamic-plugin-sdk-webpack';

const config: Configuration = {
  mode: 'development',
  entry: {},
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name]-bundle.js',
    chunkFilename: '[name]-chunk.js',
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        exclude: /node_modules/,
        use: 'ts-loader',
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  plugins: [new ConsoleRemotePlugin()],
  devServer: {
    port: 9001,
    static: path.join(__dirname, 'dist'),
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },
};

export default config;
```

**Step 2: Create plugin manifest**

Create `console-plugin/plugin-manifest.json`:
```json
{
  "name": "redfish-insights-plugin",
  "version": "0.1.0",
  "displayName": "Firmware Insights",
  "description": "View firmware inventory and update status for bare metal nodes",
  "exposedModules": {
    "FirmwareOverview": "./pages/FirmwareOverview",
    "FirmwareNodes": "./pages/FirmwareNodes",
    "FirmwareNodeDetail": "./pages/FirmwareNodeDetail",
    "FirmwareUpdates": "./pages/FirmwareUpdates"
  },
  "dependencies": {
    "@console/pluginAPI": "*"
  }
}
```

**Step 3: Create console extensions**

Create `console-plugin/console-extensions.json`:
```json
[
  {
    "type": "console.navigation/href",
    "properties": {
      "id": "firmware-overview",
      "perspective": "admin",
      "section": "compute",
      "name": "Firmware Overview",
      "href": "/firmware"
    }
  },
  {
    "type": "console.navigation/href",
    "properties": {
      "id": "firmware-nodes",
      "perspective": "admin",
      "section": "compute",
      "name": "Firmware Nodes",
      "href": "/firmware/nodes"
    }
  },
  {
    "type": "console.navigation/href",
    "properties": {
      "id": "firmware-updates",
      "perspective": "admin",
      "section": "compute",
      "name": "Firmware Updates",
      "href": "/firmware/updates"
    }
  },
  {
    "type": "console.page/route",
    "properties": {
      "exact": true,
      "path": "/firmware",
      "component": {
        "$codeRef": "FirmwareOverview"
      }
    }
  },
  {
    "type": "console.page/route",
    "properties": {
      "exact": true,
      "path": "/firmware/nodes",
      "component": {
        "$codeRef": "FirmwareNodes"
      }
    }
  },
  {
    "type": "console.page/route",
    "properties": {
      "exact": false,
      "path": "/firmware/nodes/:name",
      "component": {
        "$codeRef": "FirmwareNodeDetail"
      }
    }
  },
  {
    "type": "console.page/route",
    "properties": {
      "exact": true,
      "path": "/firmware/updates",
      "component": {
        "$codeRef": "FirmwareUpdates"
      }
    }
  }
]
```

**Step 4: Commit**

```bash
git add console-plugin/
git commit -m "feat(console-plugin): add webpack config and plugin manifests"
```

---

## Task 3: Jest Test Configuration

**Files:**
- Create: `console-plugin/jest.config.js`
- Create: `console-plugin/src/setupTests.ts`

**Step 1: Create Jest config**

Create `console-plugin/jest.config.js`:
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss)$': 'identity-obj-proxy',
  },
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/setupTests.ts',
  ],
};
```

**Step 2: Create test setup**

Create `console-plugin/src/setupTests.ts`:
```typescript
import '@testing-library/jest-dom';

// Mock consoleFetchJSON for tests
jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  consoleFetchJSON: jest.fn(),
  useActivePerspective: () => ['admin', jest.fn()],
}));
```

**Step 3: Commit**

```bash
git add console-plugin/
git commit -m "feat(console-plugin): add Jest test configuration"
```

---

## Task 4: API Types and Service

**Files:**
- Create: `console-plugin/src/types.ts`
- Create: `console-plugin/src/services/api.ts`
- Create: `console-plugin/src/services/api.test.ts`

**Step 1: Create types**

Create `console-plugin/src/types.ts`:
```typescript
export type NodeStatus = 'up-to-date' | 'needs-update' | 'unknown' | 'auth-failed';

export interface FirmwareComponent {
  id: string;
  name: string;
  currentVersion: string;
  availableVersion?: string;
  updateable: boolean;
  componentType: string;
}

export interface Node {
  name: string;
  bmcAddress: string;
  model: string;
  manufacturer: string;
  serviceTag: string;
  lastScanned: string;
  status: NodeStatus;
  firmwareCount: number;
  updatesAvailable: number;
  firmware?: FirmwareComponent[];
}

export interface UpdateSummary {
  componentType: string;
  availableVersion: string;
  affectedNodes: string[];
  nodeCount: number;
}

export interface NodesResponse {
  nodes: Node[];
}

export interface UpdatesResponse {
  updates: UpdateSummary[];
}
```

**Step 2: Write API service test**

Create `console-plugin/src/services/api.test.ts`:
```typescript
import { consoleFetchJSON } from '@openshift-console/dynamic-plugin-sdk';
import { getNodes, getNodeFirmware, getUpdates } from './api';

jest.mock('@openshift-console/dynamic-plugin-sdk');

const mockFetch = consoleFetchJSON as jest.MockedFunction<typeof consoleFetchJSON>;

describe('API Service', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('getNodes calls correct endpoint', async () => {
    mockFetch.mockResolvedValue({ nodes: [] });
    await getNodes();
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/nodes')
    );
  });

  it('getNodeFirmware calls correct endpoint with name', async () => {
    mockFetch.mockResolvedValue({ firmware: [] });
    await getNodeFirmware('worker-0');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/nodes/worker-0/firmware')
    );
  });

  it('getUpdates calls correct endpoint', async () => {
    mockFetch.mockResolvedValue({ updates: [] });
    await getUpdates();
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/updates')
    );
  });
});
```

**Step 3: Run test to verify it fails**

Run:
```bash
cd console-plugin && npm install && npm test
```

Expected: FAIL - api module not found

**Step 4: Create API service**

Create `console-plugin/src/services/api.ts`:
```typescript
import { consoleFetchJSON } from '@openshift-console/dynamic-plugin-sdk';
import { Node, NodesResponse, UpdatesResponse, FirmwareComponent } from '../types';

const API_BASE = '/api/proxy/plugin/redfish-insights-plugin/redfish-insights';

export const getNodes = async (): Promise<Node[]> => {
  const response = await consoleFetchJSON<NodesResponse>(`${API_BASE}/api/v1/nodes`);
  return response.nodes || [];
};

export const getNodeFirmware = async (name: string): Promise<FirmwareComponent[]> => {
  const response = await consoleFetchJSON<{ firmware: FirmwareComponent[] }>(
    `${API_BASE}/api/v1/nodes/${encodeURIComponent(name)}/firmware`
  );
  return response.firmware || [];
};

export const getUpdates = async (): Promise<UpdatesResponse> => {
  return consoleFetchJSON<UpdatesResponse>(`${API_BASE}/api/v1/updates`);
};
```

**Step 5: Run test to verify it passes**

Run:
```bash
cd console-plugin && npm test
```

Expected: PASS

**Step 6: Commit**

```bash
git add console-plugin/
git commit -m "feat(console-plugin): add API types and service with tests"
```

---

## Task 5: Status Components

**Files:**
- Create: `console-plugin/src/components/FirmwareStatusIcon.tsx`
- Create: `console-plugin/src/components/FirmwareStatusIcon.test.tsx`
- Create: `console-plugin/src/components/UpdateBadge.tsx`

**Step 1: Write StatusIcon test**

Create `console-plugin/src/components/FirmwareStatusIcon.test.tsx`:
```typescript
import { render, screen } from '@testing-library/react';
import { FirmwareStatusIcon } from './FirmwareStatusIcon';

describe('FirmwareStatusIcon', () => {
  it('renders success icon for up-to-date', () => {
    render(<FirmwareStatusIcon status="up-to-date" />);
    expect(screen.getByText('Up to date')).toBeInTheDocument();
  });

  it('renders warning icon for needs-update', () => {
    render(<FirmwareStatusIcon status="needs-update" />);
    expect(screen.getByText('Updates available')).toBeInTheDocument();
  });

  it('renders unknown icon for unknown status', () => {
    render(<FirmwareStatusIcon status="unknown" />);
    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run:
```bash
cd console-plugin && npm test -- --testPathPattern=FirmwareStatusIcon
```

Expected: FAIL - module not found

**Step 3: Create FirmwareStatusIcon component**

Create `console-plugin/src/components/FirmwareStatusIcon.tsx`:
```typescript
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  QuestionCircleIcon,
  ExclamationCircleIcon,
} from '@patternfly/react-icons';
import { Label } from '@patternfly/react-core';
import { NodeStatus } from '../types';

interface FirmwareStatusIconProps {
  status: NodeStatus;
}

const statusConfig: Record<NodeStatus, { icon: React.ComponentType; color: 'green' | 'orange' | 'grey' | 'red'; text: string }> = {
  'up-to-date': { icon: CheckCircleIcon, color: 'green', text: 'Up to date' },
  'needs-update': { icon: ExclamationTriangleIcon, color: 'orange', text: 'Updates available' },
  'unknown': { icon: QuestionCircleIcon, color: 'grey', text: 'Unknown' },
  'auth-failed': { icon: ExclamationCircleIcon, color: 'red', text: 'Auth failed' },
};

export const FirmwareStatusIcon: React.FC<FirmwareStatusIconProps> = ({ status }) => {
  const config = statusConfig[status] || statusConfig.unknown;
  const Icon = config.icon;

  return (
    <Label color={config.color} icon={<Icon />}>
      {config.text}
    </Label>
  );
};
```

**Step 4: Run test to verify it passes**

Run:
```bash
cd console-plugin && npm test -- --testPathPattern=FirmwareStatusIcon
```

Expected: PASS

**Step 5: Create UpdateBadge component**

Create `console-plugin/src/components/UpdateBadge.tsx`:
```typescript
import { Label } from '@patternfly/react-core';

interface UpdateBadgeProps {
  count: number;
}

export const UpdateBadge: React.FC<UpdateBadgeProps> = ({ count }) => {
  if (count === 0) {
    return <Label color="green">0</Label>;
  }
  return <Label color="orange">{count}</Label>;
};
```

**Step 6: Commit**

```bash
git add console-plugin/
git commit -m "feat(console-plugin): add status icon and badge components"
```

---

## Task 6: Firmware Overview Page (Dashboard)

**Files:**
- Create: `console-plugin/src/pages/FirmwareOverview.tsx`
- Create: `console-plugin/src/pages/FirmwareOverview.test.tsx`

**Step 1: Write Overview page test**

Create `console-plugin/src/pages/FirmwareOverview.test.tsx`:
```typescript
import { render, screen, waitFor } from '@testing-library/react';
import { FirmwareOverview } from './FirmwareOverview';
import * as api from '../services/api';

jest.mock('../services/api');

const mockNodes = [
  { name: 'worker-0', status: 'up-to-date', updatesAvailable: 0 },
  { name: 'worker-1', status: 'needs-update', updatesAvailable: 3 },
  { name: 'worker-2', status: 'needs-update', updatesAvailable: 1 },
];

describe('FirmwareOverview', () => {
  beforeEach(() => {
    (api.getNodes as jest.Mock).mockResolvedValue(mockNodes);
  });

  it('renders title', async () => {
    render(<FirmwareOverview />);
    expect(screen.getByText('Firmware Overview')).toBeInTheDocument();
  });

  it('displays node count', async () => {
    render(<FirmwareOverview />);
    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  it('displays nodes needing updates count', async () => {
    render(<FirmwareOverview />);
    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run:
```bash
cd console-plugin && npm test -- --testPathPattern=FirmwareOverview
```

Expected: FAIL - module not found

**Step 3: Create FirmwareOverview page**

Create `console-plugin/src/pages/FirmwareOverview.tsx`:
```typescript
import { useState, useEffect } from 'react';
import {
  Page,
  PageSection,
  Title,
  Card,
  CardTitle,
  CardBody,
  Grid,
  GridItem,
  Spinner,
  Alert,
} from '@patternfly/react-core';
import { ChartDonut } from '@patternfly/react-charts';
import { getNodes } from '../services/api';
import { Node } from '../types';

export const FirmwareOverview: React.FC = () => {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getNodes();
        setNodes(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch nodes');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const totalNodes = nodes.length;
  const nodesNeedingUpdate = nodes.filter((n) => n.status === 'needs-update').length;
  const nodesUpToDate = nodes.filter((n) => n.status === 'up-to-date').length;
  const totalUpdates = nodes.reduce((sum, n) => sum + n.updatesAvailable, 0);

  if (loading) {
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

  return (
    <Page>
      <PageSection>
        <Title headingLevel="h1">Firmware Overview</Title>
      </PageSection>
      <PageSection>
        <Grid hasGutter>
          <GridItem span={3}>
            <Card>
              <CardTitle>Total Nodes</CardTitle>
              <CardBody>
                <span style={{ fontSize: '2rem', fontWeight: 'bold' }}>{totalNodes}</span>
              </CardBody>
            </Card>
          </GridItem>
          <GridItem span={3}>
            <Card>
              <CardTitle>Nodes Needing Updates</CardTitle>
              <CardBody>
                <span style={{ fontSize: '2rem', fontWeight: 'bold', color: nodesNeedingUpdate > 0 ? '#f0ab00' : '#3e8635' }}>
                  {nodesNeedingUpdate}
                </span>
              </CardBody>
            </Card>
          </GridItem>
          <GridItem span={3}>
            <Card>
              <CardTitle>Total Updates Available</CardTitle>
              <CardBody>
                <span style={{ fontSize: '2rem', fontWeight: 'bold' }}>{totalUpdates}</span>
              </CardBody>
            </Card>
          </GridItem>
          <GridItem span={3}>
            <Card>
              <CardTitle>Nodes Up to Date</CardTitle>
              <CardBody>
                <span style={{ fontSize: '2rem', fontWeight: 'bold', color: '#3e8635' }}>{nodesUpToDate}</span>
              </CardBody>
            </Card>
          </GridItem>
          <GridItem span={6}>
            <Card>
              <CardTitle>Node Status Distribution</CardTitle>
              <CardBody>
                <ChartDonut
                  constrainToVisibleArea
                  data={[
                    { x: 'Up to date', y: nodesUpToDate },
                    { x: 'Needs update', y: nodesNeedingUpdate },
                    { x: 'Unknown', y: totalNodes - nodesUpToDate - nodesNeedingUpdate },
                  ]}
                  labels={({ datum }) => `${datum.x}: ${datum.y}`}
                  title={`${totalNodes}`}
                  subTitle="Nodes"
                  colorScale={['#3e8635', '#f0ab00', '#8a8d90']}
                  width={350}
                  height={200}
                />
              </CardBody>
            </Card>
          </GridItem>
        </Grid>
      </PageSection>
    </Page>
  );
};

export default FirmwareOverview;
```

**Step 4: Run test to verify it passes**

Run:
```bash
cd console-plugin && npm test -- --testPathPattern=FirmwareOverview
```

Expected: PASS

**Step 5: Commit**

```bash
git add console-plugin/
git commit -m "feat(console-plugin): add Firmware Overview dashboard page"
```

---

## Task 7: Firmware Nodes Page (Table)

**Files:**
- Create: `console-plugin/src/pages/FirmwareNodes.tsx`
- Create: `console-plugin/src/pages/FirmwareNodes.test.tsx`

**Step 1: Write Nodes page test**

Create `console-plugin/src/pages/FirmwareNodes.test.tsx`:
```typescript
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { FirmwareNodes } from './FirmwareNodes';
import * as api from '../services/api';

jest.mock('../services/api');

const mockNodes = [
  {
    name: 'worker-0',
    model: 'PowerEdge R640',
    status: 'needs-update',
    firmwareCount: 15,
    updatesAvailable: 3,
    lastScanned: '2024-01-15T10:30:00Z',
  },
];

describe('FirmwareNodes', () => {
  beforeEach(() => {
    (api.getNodes as jest.Mock).mockResolvedValue(mockNodes);
  });

  it('renders title', async () => {
    render(
      <MemoryRouter>
        <FirmwareNodes />
      </MemoryRouter>
    );
    expect(screen.getByText('Firmware Nodes')).toBeInTheDocument();
  });

  it('displays node in table', async () => {
    render(
      <MemoryRouter>
        <FirmwareNodes />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('worker-0')).toBeInTheDocument();
      expect(screen.getByText('PowerEdge R640')).toBeInTheDocument();
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run:
```bash
cd console-plugin && npm test -- --testPathPattern=FirmwareNodes
```

Expected: FAIL - module not found

**Step 3: Create FirmwareNodes page**

Create `console-plugin/src/pages/FirmwareNodes.tsx`:
```typescript
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Page,
  PageSection,
  Title,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  SearchInput,
  Button,
  Spinner,
  Alert,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { SyncIcon } from '@patternfly/react-icons';
import { getNodes } from '../services/api';
import { Node } from '../types';
import { FirmwareStatusIcon } from '../components/FirmwareStatusIcon';
import { UpdateBadge } from '../components/UpdateBadge';

export const FirmwareNodes: React.FC = () => {
  const navigate = useNavigate();
  const [nodes, setNodes] = useState<Node[]>([]);
  const [filteredNodes, setFilteredNodes] = useState<Node[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await getNodes();
      setNodes(data);
      setFilteredNodes(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch nodes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (searchValue) {
      setFilteredNodes(
        nodes.filter((n) =>
          n.name.toLowerCase().includes(searchValue.toLowerCase())
        )
      );
    } else {
      setFilteredNodes(nodes);
    }
  }, [searchValue, nodes]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  if (loading) {
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

  return (
    <Page>
      <PageSection>
        <Title headingLevel="h1">Firmware Nodes</Title>
      </PageSection>
      <PageSection>
        <Toolbar>
          <ToolbarContent>
            <ToolbarItem>
              <SearchInput
                placeholder="Search by name"
                value={searchValue}
                onChange={(_event, value) => setSearchValue(value)}
                onClear={() => setSearchValue('')}
              />
            </ToolbarItem>
            <ToolbarItem>
              <Button variant="plain" onClick={fetchData} aria-label="Refresh">
                <SyncIcon />
              </Button>
            </ToolbarItem>
          </ToolbarContent>
        </Toolbar>
        <Table aria-label="Firmware nodes table">
          <Thead>
            <Tr>
              <Th>Name</Th>
              <Th>Model</Th>
              <Th>Status</Th>
              <Th>Firmware Count</Th>
              <Th>Updates Available</Th>
              <Th>Last Scanned</Th>
            </Tr>
          </Thead>
          <Tbody>
            {filteredNodes.map((node) => (
              <Tr
                key={node.name}
                isClickable
                onRowClick={() => navigate(`/firmware/nodes/${node.name}`)}
              >
                <Td dataLabel="Name">{node.name}</Td>
                <Td dataLabel="Model">{node.model}</Td>
                <Td dataLabel="Status">
                  <FirmwareStatusIcon status={node.status} />
                </Td>
                <Td dataLabel="Firmware Count">{node.firmwareCount}</Td>
                <Td dataLabel="Updates Available">
                  <UpdateBadge count={node.updatesAvailable} />
                </Td>
                <Td dataLabel="Last Scanned">{formatDate(node.lastScanned)}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </PageSection>
    </Page>
  );
};

export default FirmwareNodes;
```

**Step 4: Run test to verify it passes**

Run:
```bash
cd console-plugin && npm test -- --testPathPattern=FirmwareNodes
```

Expected: PASS

**Step 5: Commit**

```bash
git add console-plugin/
git commit -m "feat(console-plugin): add Firmware Nodes table page"
```

---

## Task 8: Firmware Node Detail Page

**Files:**
- Create: `console-plugin/src/pages/FirmwareNodeDetail.tsx`
- Create: `console-plugin/src/pages/FirmwareNodeDetail.test.tsx`

**Step 1: Write Node Detail test**

Create `console-plugin/src/pages/FirmwareNodeDetail.test.tsx`:
```typescript
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { FirmwareNodeDetail } from './FirmwareNodeDetail';
import * as api from '../services/api';

jest.mock('../services/api');

const mockNode = {
  name: 'worker-0',
  model: 'PowerEdge R640',
  manufacturer: 'Dell Inc.',
  serviceTag: 'ABC1234',
  status: 'needs-update',
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

  it('renders node name', async () => {
    render(
      <MemoryRouter initialEntries={['/firmware/nodes/worker-0']}>
        <Routes>
          <Route path="/firmware/nodes/:name" element={<FirmwareNodeDetail />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('worker-0')).toBeInTheDocument();
    });
  });

  it('displays firmware component', async () => {
    render(
      <MemoryRouter initialEntries={['/firmware/nodes/worker-0']}>
        <Routes>
          <Route path="/firmware/nodes/:name" element={<FirmwareNodeDetail />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('BIOS')).toBeInTheDocument();
      expect(screen.getByText('2.18.1')).toBeInTheDocument();
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run:
```bash
cd console-plugin && npm test -- --testPathPattern=FirmwareNodeDetail
```

Expected: FAIL - module not found

**Step 3: Create FirmwareNodeDetail page**

Create `console-plugin/src/pages/FirmwareNodeDetail.tsx`:
```typescript
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Page,
  PageSection,
  Title,
  Breadcrumb,
  BreadcrumbItem,
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
  Card,
  CardTitle,
  CardBody,
  Spinner,
  Alert,
  Label,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { ExclamationTriangleIcon } from '@patternfly/react-icons';
import { getNodes, getNodeFirmware } from '../services/api';
import { Node, FirmwareComponent } from '../types';
import { FirmwareStatusIcon } from '../components/FirmwareStatusIcon';

export const FirmwareNodeDetail: React.FC = () => {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const [node, setNode] = useState<Node | null>(null);
  const [firmware, setFirmware] = useState<FirmwareComponent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!name) return;
      try {
        const [nodes, fw] = await Promise.all([
          getNodes(),
          getNodeFirmware(name),
        ]);
        const foundNode = nodes.find((n) => n.name === name);
        setNode(foundNode || null);
        setFirmware(fw);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [name]);

  const needsUpdate = (fw: FirmwareComponent) =>
    fw.availableVersion && fw.availableVersion !== fw.currentVersion;

  if (loading) {
    return (
      <Page>
        <PageSection>
          <Spinner aria-label="Loading" />
        </PageSection>
      </Page>
    );
  }

  if (error || !node) {
    return (
      <Page>
        <PageSection>
          <Alert variant="danger" title="Error">
            {error || 'Node not found'}
          </Alert>
        </PageSection>
      </Page>
    );
  }

  return (
    <Page>
      <PageSection>
        <Breadcrumb>
          <BreadcrumbItem onClick={() => navigate('/firmware/nodes')}>
            Firmware Nodes
          </BreadcrumbItem>
          <BreadcrumbItem isActive>{name}</BreadcrumbItem>
        </Breadcrumb>
      </PageSection>
      <PageSection>
        <Title headingLevel="h1">{name}</Title>
      </PageSection>
      <PageSection>
        <Card>
          <CardTitle>Node Information</CardTitle>
          <CardBody>
            <DescriptionList columnModifier={{ default: '2Col' }}>
              <DescriptionListGroup>
                <DescriptionListTerm>Model</DescriptionListTerm>
                <DescriptionListDescription>{node.model}</DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Manufacturer</DescriptionListTerm>
                <DescriptionListDescription>{node.manufacturer}</DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Service Tag</DescriptionListTerm>
                <DescriptionListDescription>{node.serviceTag}</DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Status</DescriptionListTerm>
                <DescriptionListDescription>
                  <FirmwareStatusIcon status={node.status} />
                </DescriptionListDescription>
              </DescriptionListGroup>
            </DescriptionList>
          </CardBody>
        </Card>
      </PageSection>
      <PageSection>
        <Card>
          <CardTitle>Firmware Components</CardTitle>
          <CardBody>
            <Table aria-label="Firmware components table">
              <Thead>
                <Tr>
                  <Th>Component</Th>
                  <Th>Type</Th>
                  <Th>Current Version</Th>
                  <Th>Available Version</Th>
                  <Th>Status</Th>
                </Tr>
              </Thead>
              <Tbody>
                {firmware.map((fw) => (
                  <Tr key={fw.id}>
                    <Td dataLabel="Component">{fw.name}</Td>
                    <Td dataLabel="Type">{fw.componentType}</Td>
                    <Td dataLabel="Current Version">{fw.currentVersion}</Td>
                    <Td dataLabel="Available Version">
                      {fw.availableVersion || '-'}
                    </Td>
                    <Td dataLabel="Status">
                      {needsUpdate(fw) ? (
                        <Label color="orange" icon={<ExclamationTriangleIcon />}>
                          Update available
                        </Label>
                      ) : (
                        <Label color="green">Current</Label>
                      )}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </CardBody>
        </Card>
      </PageSection>
    </Page>
  );
};

export default FirmwareNodeDetail;
```

**Step 4: Run test to verify it passes**

Run:
```bash
cd console-plugin && npm test -- --testPathPattern=FirmwareNodeDetail
```

Expected: PASS

**Step 5: Commit**

```bash
git add console-plugin/
git commit -m "feat(console-plugin): add Firmware Node Detail page"
```

---

## Task 9: Firmware Updates Page (Grouped)

**Files:**
- Create: `console-plugin/src/pages/FirmwareUpdates.tsx`
- Create: `console-plugin/src/pages/FirmwareUpdates.test.tsx`

**Step 1: Write Updates page test**

Create `console-plugin/src/pages/FirmwareUpdates.test.tsx`:
```typescript
import { render, screen, waitFor } from '@testing-library/react';
import { FirmwareUpdates } from './FirmwareUpdates';
import * as api from '../services/api';

jest.mock('../services/api');

const mockUpdates = {
  updates: [
    {
      componentType: 'BIOS',
      availableVersion: '2.19.1',
      affectedNodes: ['worker-0', 'worker-1'],
      nodeCount: 2,
    },
  ],
};

describe('FirmwareUpdates', () => {
  beforeEach(() => {
    (api.getUpdates as jest.Mock).mockResolvedValue(mockUpdates);
  });

  it('renders title', async () => {
    render(<FirmwareUpdates />);
    expect(screen.getByText('Firmware Updates')).toBeInTheDocument();
  });

  it('displays update in table', async () => {
    render(<FirmwareUpdates />);
    await waitFor(() => {
      expect(screen.getByText('BIOS')).toBeInTheDocument();
      expect(screen.getByText('2.19.1')).toBeInTheDocument();
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run:
```bash
cd console-plugin && npm test -- --testPathPattern=FirmwareUpdates
```

Expected: FAIL - module not found

**Step 3: Create FirmwareUpdates page**

Create `console-plugin/src/pages/FirmwareUpdates.tsx`:
```typescript
import { useState, useEffect } from 'react';
import {
  Page,
  PageSection,
  Title,
  Spinner,
  Alert,
  ExpandableSection,
  Label,
  LabelGroup,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { getUpdates } from '../services/api';
import { UpdateSummary } from '../types';

export const FirmwareUpdates: React.FC = () => {
  const [updates, setUpdates] = useState<UpdateSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getUpdates();
        setUpdates(data.updates || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch updates');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const toggleRow = (key: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedRows(newExpanded);
  };

  if (loading) {
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

  return (
    <Page>
      <PageSection>
        <Title headingLevel="h1">Firmware Updates</Title>
      </PageSection>
      <PageSection>
        {updates.length === 0 ? (
          <Alert variant="success" title="All firmware is up to date">
            No updates available for any nodes.
          </Alert>
        ) : (
          <Table aria-label="Firmware updates table">
            <Thead>
              <Tr>
                <Th>Component Type</Th>
                <Th>Available Version</Th>
                <Th>Affected Nodes</Th>
                <Th>Node Names</Th>
              </Tr>
            </Thead>
            <Tbody>
              {updates.map((update) => {
                const key = `${update.componentType}-${update.availableVersion}`;
                const isExpanded = expandedRows.has(key);
                return (
                  <Tr key={key}>
                    <Td dataLabel="Component Type">{update.componentType}</Td>
                    <Td dataLabel="Available Version">{update.availableVersion}</Td>
                    <Td dataLabel="Affected Nodes">
                      <Label color="orange">{update.nodeCount}</Label>
                    </Td>
                    <Td dataLabel="Node Names">
                      <ExpandableSection
                        toggleText={isExpanded ? 'Hide nodes' : 'Show nodes'}
                        isExpanded={isExpanded}
                        onToggle={() => toggleRow(key)}
                      >
                        <LabelGroup>
                          {update.affectedNodes.map((node) => (
                            <Label key={node}>{node}</Label>
                          ))}
                        </LabelGroup>
                      </ExpandableSection>
                    </Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        )}
      </PageSection>
    </Page>
  );
};

export default FirmwareUpdates;
```

**Step 4: Run test to verify it passes**

Run:
```bash
cd console-plugin && npm test -- --testPathPattern=FirmwareUpdates
```

Expected: PASS

**Step 5: Commit**

```bash
git add console-plugin/
git commit -m "feat(console-plugin): add Firmware Updates grouped page"
```

---

## Task 10: Plugin Entry Point and Index

**Files:**
- Create: `console-plugin/src/index.ts`
- Create: `console-plugin/src/components/index.ts`
- Create: `console-plugin/src/pages/index.ts`

**Step 1: Create component exports**

Create `console-plugin/src/components/index.ts`:
```typescript
export { FirmwareStatusIcon } from './FirmwareStatusIcon';
export { UpdateBadge } from './UpdateBadge';
```

**Step 2: Create page exports**

Create `console-plugin/src/pages/index.ts`:
```typescript
export { default as FirmwareOverview } from './FirmwareOverview';
export { default as FirmwareNodes } from './FirmwareNodes';
export { default as FirmwareNodeDetail } from './FirmwareNodeDetail';
export { default as FirmwareUpdates } from './FirmwareUpdates';
```

**Step 3: Create main index**

Create `console-plugin/src/index.ts`:
```typescript
export * from './pages';
export * from './components';
export * from './types';
```

**Step 4: Commit**

```bash
git add console-plugin/
git commit -m "feat(console-plugin): add module exports and entry points"
```

---

## Task 11: Dockerfile for Plugin

**Files:**
- Create: `console-plugin/Dockerfile`
- Create: `console-plugin/nginx.conf`

**Step 1: Create nginx config**

Create `console-plugin/nginx.conf`:
```nginx
server {
    listen 9443 ssl;
    ssl_certificate /var/cert/tls.crt;
    ssl_certificate_key /var/cert/tls.key;

    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache";
    }

    location /plugin-manifest.json {
        add_header Cache-Control "no-cache";
    }
}
```

**Step 2: Create Dockerfile**

Create `console-plugin/Dockerfile`:
```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 9443

CMD ["nginx", "-g", "daemon off;"]
```

**Step 3: Commit**

```bash
git add console-plugin/
git commit -m "feat(console-plugin): add Dockerfile and nginx config"
```

---

## Task 12: Kubernetes Manifests

**Files:**
- Create: `console-plugin/deploy/deployment.yaml`
- Create: `console-plugin/deploy/service.yaml`
- Create: `console-plugin/deploy/consoleplugin.yaml`

**Step 1: Create deployment**

Create `console-plugin/deploy/deployment.yaml`:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redfish-insights-plugin
  namespace: openshift-redfish-insights
  labels:
    app: redfish-insights-plugin
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redfish-insights-plugin
  template:
    metadata:
      labels:
        app: redfish-insights-plugin
    spec:
      containers:
        - name: plugin
          image: redfish-insights-plugin:latest
          ports:
            - containerPort: 9443
              protocol: TCP
          volumeMounts:
            - name: serving-cert
              mountPath: /var/cert
              readOnly: true
          resources:
            requests:
              cpu: 10m
              memory: 50Mi
            limits:
              cpu: 100m
              memory: 100Mi
      volumes:
        - name: serving-cert
          secret:
            secretName: redfish-insights-plugin-cert
```

**Step 2: Create service**

Create `console-plugin/deploy/service.yaml`:
```yaml
apiVersion: v1
kind: Service
metadata:
  name: redfish-insights-plugin
  namespace: openshift-redfish-insights
  labels:
    app: redfish-insights-plugin
  annotations:
    service.beta.openshift.io/serving-cert-secret-name: redfish-insights-plugin-cert
spec:
  type: ClusterIP
  ports:
    - port: 9443
      targetPort: 9443
      protocol: TCP
  selector:
    app: redfish-insights-plugin
```

**Step 3: Create ConsolePlugin CR**

Create `console-plugin/deploy/consoleplugin.yaml`:
```yaml
apiVersion: console.openshift.io/v1
kind: ConsolePlugin
metadata:
  name: redfish-insights-plugin
spec:
  displayName: "Firmware Insights"
  backend:
    type: Service
    service:
      name: redfish-insights-plugin
      namespace: openshift-redfish-insights
      port: 9443
      basePath: "/"
  proxy:
    - alias: redfish-insights
      authorize: true
      endpoint:
        type: Service
        service:
          name: openshift-redfish-insights
          namespace: openshift-redfish-insights
          port: 8080
```

**Step 4: Commit**

```bash
git add console-plugin/
git commit -m "feat(console-plugin): add Kubernetes deployment manifests"
```

---

## Task 13: Update Root .gitignore and Add Plugin to Makefile

**Files:**
- Modify: `.gitignore`
- Modify: `Makefile`

**Step 1: Update .gitignore**

Add to `.gitignore`:
```
# Console plugin
console-plugin/node_modules/
console-plugin/dist/
```

**Step 2: Update Makefile**

Add to `Makefile`:
```makefile
.PHONY: build test lint plugin-build plugin-test

build:
	go build -o bin/server ./cmd/server

test:
	go test ./...

lint:
	golangci-lint run

plugin-build:
	cd console-plugin && npm ci && npm run build

plugin-test:
	cd console-plugin && npm test

plugin-image:
	podman build -t redfish-insights-plugin:latest console-plugin/

all: build plugin-build
```

**Step 3: Commit**

```bash
git add .gitignore Makefile
git commit -m "chore: update gitignore and Makefile for console plugin"
```

---

## Task 14: Final Verification

**Step 1: Install plugin dependencies**

Run:
```bash
cd console-plugin && npm install
```

Expected: Dependencies installed

**Step 2: Run all plugin tests**

Run:
```bash
cd console-plugin && npm test
```

Expected: All tests pass

**Step 3: Build plugin**

Run:
```bash
cd console-plugin && npm run build
```

Expected: Build succeeds, dist/ created

**Step 4: Build plugin container**

Run:
```bash
podman build -t redfish-insights-plugin:latest console-plugin/
```

Expected: Image builds successfully

**Step 5: Run backend tests**

Run:
```bash
go test ./...
```

Expected: All backend tests pass

**Step 6: Verify git status**

Run:
```bash
git status
git log --oneline -15
```

Expected: Clean working tree, series of commits for Phase 3

---

## Summary

Phase 3 implementation creates:
- Console plugin project with TypeScript/React/PatternFly 6
- API service using console proxy
- Four pages: Overview (dashboard), Nodes (table), Node Detail, Updates (grouped)
- Status components with PatternFly styling
- Webpack build configuration
- Kubernetes deployment manifests
- Container build with nginx

**Enable plugin after deployment:**
```bash
oc patch console.operator cluster --type=merge \
  -p '{"spec":{"plugins":["redfish-insights-plugin"]}}'
```
