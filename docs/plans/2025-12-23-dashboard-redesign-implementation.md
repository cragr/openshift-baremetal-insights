# Dashboard Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Simplify the Dashboard to a 2x2 grid of clickable cards with donut charts for health and power status.

**Architecture:** Replace the current expandable card sections with four large cards in a grid layout. Add PatternFly ChartDonut components for visual status display. Enable click navigation with query parameter filters to pre-filter destination pages.

**Tech Stack:** React, PatternFly v5, @patternfly/react-charts (ChartDonut), react-router-dom

---

## Task 1: Update Nodes Page to Support URL Query Parameters

The Nodes page already has `healthFilter` and `powerStateFilter` state but doesn't read from URL. Update it to initialize from query params for dashboard click-through filtering.

**Files:**
- Modify: `console-plugin/src/pages/Nodes.tsx`
- Modify: `console-plugin/src/pages/Nodes.test.tsx`

**Step 1: Write failing test for query param filtering**

Add to `console-plugin/src/pages/Nodes.test.tsx`:

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Nodes } from './Nodes';
import { getNodes, getNamespaces } from '../services/api';

jest.mock('../services/api');

describe('Nodes', () => {
  beforeEach(() => {
    (getNamespaces as jest.Mock).mockResolvedValue(['ns-a']);
    (getNodes as jest.Mock).mockResolvedValue([
      { name: 'node-1', namespace: 'ns-a', health: 'OK', powerState: 'On', serviceTag: 'ABC', model: 'R640', lastScanned: new Date().toISOString() },
      { name: 'node-2', namespace: 'ns-a', health: 'Critical', powerState: 'Off', serviceTag: 'DEF', model: 'R640', lastScanned: new Date().toISOString() },
    ]);
  });

  it('applies health filter from URL query param', async () => {
    render(
      <MemoryRouter initialEntries={['/baremetal-insights/nodes?health=Critical']}>
        <Nodes />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('node-2')).toBeInTheDocument();
    });
    expect(screen.queryByText('node-1')).not.toBeInTheDocument();
  });

  it('applies power filter from URL query param', async () => {
    render(
      <MemoryRouter initialEntries={['/baremetal-insights/nodes?power=Off']}>
        <Nodes />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('node-2')).toBeInTheDocument();
    });
    expect(screen.queryByText('node-1')).not.toBeInTheDocument();
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd console-plugin && npm test -- --testPathPattern=Nodes.test.tsx`
Expected: FAIL - filters not applied from URL

**Step 3: Update Nodes.tsx to read query params**

In `console-plugin/src/pages/Nodes.tsx`, add `useLocation` and initialize filters from URL:

```typescript
import { useHistory, useLocation } from 'react-router-dom';

// Inside component, after hooks:
const location = useLocation();

// Replace existing state initialization:
const queryParams = new URLSearchParams(location.search);
const initialHealth = queryParams.get('health') as HealthStatus | null;
const initialPower = queryParams.get('power') as PowerState | null;

const [healthFilter, setHealthFilter] = useState<HealthStatus | 'All'>(
  initialHealth && ['OK', 'Warning', 'Critical'].includes(initialHealth) ? initialHealth : 'All'
);
const [powerStateFilter, setPowerStateFilter] = useState<PowerState | 'All'>(
  initialPower && ['On', 'Off'].includes(initialPower) ? initialPower : 'All'
);
```

**Step 4: Run tests to verify they pass**

Run: `cd console-plugin && npm test -- --testPathPattern=Nodes.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add console-plugin/src/pages/Nodes.tsx console-plugin/src/pages/Nodes.test.tsx
git commit -m "feat(nodes): support URL query params for health and power filters"
```

---

## Task 2: Update Dashboard Tests for New Layout

Update tests to match the simplified Dashboard design before implementing changes.

**Files:**
- Modify: `console-plugin/src/pages/Dashboard.test.tsx`

**Step 1: Write tests for new Dashboard behavior**

Replace `console-plugin/src/pages/Dashboard.test.tsx`:

```typescript
import * as React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Dashboard } from './Dashboard';
import { getDashboard, getNamespaces } from '../services/api';

jest.mock('../services/api');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useHistory: () => ({
    push: jest.fn(),
  }),
}));

const mockDashboardData = {
  totalNodes: 24,
  healthSummary: { healthy: 18, warning: 4, critical: 2 },
  powerSummary: { on: 22, off: 2 },
  updatesSummary: { total: 12, critical: 3, recommended: 5, optional: 4, nodesWithUpdates: 5 },
  jobsSummary: { pending: 0, inProgress: 0, completed: 0 },
  lastRefresh: new Date().toISOString(),
  nextRefresh: new Date(Date.now() + 60000).toISOString(),
};

describe('Dashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getNamespaces as jest.Mock).mockResolvedValue(['ns-a']);
    (getDashboard as jest.Mock).mockResolvedValue(mockDashboardData);
  });

  it('renders dashboard title', async () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    });
  });

  it('displays total nodes count', async () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('24')).toBeInTheDocument();
    });
  });

  it('displays updates available count', async () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('12')).toBeInTheDocument();
    });
  });

  it('does not render refresh countdown', async () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    });
    expect(screen.queryByText(/Refreshing in/i)).not.toBeInTheDocument();
  });

  it('does not render expandable card sections', async () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    });
    expect(screen.queryByText('Health Overview')).not.toBeInTheDocument();
    expect(screen.queryByText('Power Status')).not.toBeInTheDocument();
    expect(screen.queryByText('Redfish Jobs')).not.toBeInTheDocument();
    expect(screen.queryByText('Firmware Updates')).not.toBeInTheDocument();
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd console-plugin && npm test -- --testPathPattern=Dashboard.test.tsx`
Expected: FAIL - old Dashboard still has expandable sections

**Step 3: Keep test file ready for implementation**

Tests will pass after Task 3 implementation.

**Step 4: Commit test changes**

```bash
git add console-plugin/src/pages/Dashboard.test.tsx
git commit -m "test(dashboard): update tests for simplified layout"
```

---

## Task 3: Rewrite Dashboard Component

Replace the current Dashboard with simplified 2x2 card grid layout.

**Files:**
- Modify: `console-plugin/src/pages/Dashboard.tsx`

**Step 1: Rewrite Dashboard.tsx**

Replace entire file with:

```typescript
import * as React from 'react';
import { useEffect, useState, useCallback } from 'react';
import { useHistory } from 'react-router-dom';
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
  Grid,
  GridItem,
} from '@patternfly/react-core';
import { ChartDonut } from '@patternfly/react-charts';
import { DashboardStats } from '../types';
import { getDashboard } from '../services/api';
import { NamespaceDropdown } from '../components/NamespaceDropdown';

import './Dashboard.css';

export const Dashboard: React.FC = () => {
  const history = useHistory();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [namespace, setNamespace] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const dashboardData = await getDashboard(namespace || undefined);
      setStats(dashboardData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [namespace]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleTotalNodesClick = () => {
    history.push('/baremetal-insights/nodes');
  };

  const handleHealthClick = (status?: string) => {
    if (status) {
      history.push(`/baremetal-insights/nodes?health=${status}`);
    } else {
      history.push('/baremetal-insights/nodes');
    }
  };

  const handlePowerClick = (state?: string) => {
    if (state) {
      history.push(`/baremetal-insights/nodes?power=${state}`);
    } else {
      history.push('/baremetal-insights/nodes');
    }
  };

  const handleUpdatesClick = () => {
    history.push('/baremetal-insights/firmware');
  };

  if (loading && !stats) {
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

  const healthData = stats
    ? [
        { x: 'Healthy', y: stats.healthSummary.healthy },
        { x: 'Warning', y: stats.healthSummary.warning },
        { x: 'Critical', y: stats.healthSummary.critical },
      ]
    : [];

  const powerData = stats
    ? [
        { x: 'On', y: stats.powerSummary.on },
        { x: 'Off', y: stats.powerSummary.off },
      ]
    : [];

  const healthColorScale = ['#3E8635', '#F0AB00', '#C9190B'];
  const powerColorScale = ['#06C', '#6A6E73'];

  return (
    <Page>
      <PageSection variant="light">
        <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }} alignItems={{ default: 'alignItemsCenter' }}>
          <FlexItem>
            <Title headingLevel="h1">Dashboard</Title>
          </FlexItem>
          <FlexItem>
            <NamespaceDropdown selected={namespace} onSelect={setNamespace} />
          </FlexItem>
        </Flex>
      </PageSection>

      {stats && (
        <PageSection>
          <Grid hasGutter>
            {/* Total Nodes Card */}
            <GridItem span={6}>
              <Card
                isClickable
                isSelectable
                onClick={handleTotalNodesClick}
                className="dashboard-card dashboard-card--clickable"
              >
                <CardTitle>Total Nodes</CardTitle>
                <CardBody className="dashboard-card__body--centered">
                  <span className="dashboard-card__number">{stats.totalNodes}</span>
                </CardBody>
              </Card>
            </GridItem>

            {/* Health Status Card */}
            <GridItem span={6}>
              <Card
                isClickable
                isSelectable
                onClick={() => handleHealthClick()}
                className="dashboard-card dashboard-card--clickable"
              >
                <CardTitle>Health Status</CardTitle>
                <CardBody className="dashboard-card__body--chart">
                  <div className="dashboard-card__chart-container">
                    <ChartDonut
                      ariaDesc="Health status distribution"
                      ariaTitle="Health Status"
                      constrainToVisibleArea
                      data={healthData}
                      labels={({ datum }) => `${datum.x}: ${datum.y}`}
                      colorScale={healthColorScale}
                      innerRadius={50}
                      padding={{ bottom: 20, left: 20, right: 20, top: 20 }}
                      width={200}
                      height={200}
                      events={[
                        {
                          target: 'data',
                          eventHandlers: {
                            onClick: (_evt, { datum }) => {
                              const statusMap: Record<string, string> = {
                                Healthy: 'OK',
                                Warning: 'Warning',
                                Critical: 'Critical',
                              };
                              handleHealthClick(statusMap[datum.x]);
                              return [];
                            },
                          },
                        },
                      ]}
                    />
                  </div>
                  <div className="dashboard-card__legend">
                    <span className="dashboard-card__legend-item dashboard-card__legend-item--healthy">
                      {stats.healthSummary.healthy} Healthy
                    </span>
                    <span className="dashboard-card__legend-item dashboard-card__legend-item--warning">
                      {stats.healthSummary.warning} Warning
                    </span>
                    <span className="dashboard-card__legend-item dashboard-card__legend-item--critical">
                      {stats.healthSummary.critical} Critical
                    </span>
                  </div>
                </CardBody>
              </Card>
            </GridItem>

            {/* Power Status Card */}
            <GridItem span={6}>
              <Card
                isClickable
                isSelectable
                onClick={() => handlePowerClick()}
                className="dashboard-card dashboard-card--clickable"
              >
                <CardTitle>Power Status</CardTitle>
                <CardBody className="dashboard-card__body--chart">
                  <div className="dashboard-card__chart-container">
                    <ChartDonut
                      ariaDesc="Power status distribution"
                      ariaTitle="Power Status"
                      constrainToVisibleArea
                      data={powerData}
                      labels={({ datum }) => `${datum.x}: ${datum.y}`}
                      colorScale={powerColorScale}
                      innerRadius={50}
                      padding={{ bottom: 20, left: 20, right: 20, top: 20 }}
                      width={200}
                      height={200}
                      events={[
                        {
                          target: 'data',
                          eventHandlers: {
                            onClick: (_evt, { datum }) => {
                              handlePowerClick(datum.x);
                              return [];
                            },
                          },
                        },
                      ]}
                    />
                  </div>
                  <div className="dashboard-card__legend">
                    <span className="dashboard-card__legend-item dashboard-card__legend-item--on">
                      {stats.powerSummary.on} On
                    </span>
                    <span className="dashboard-card__legend-item dashboard-card__legend-item--off">
                      {stats.powerSummary.off} Off
                    </span>
                  </div>
                </CardBody>
              </Card>
            </GridItem>

            {/* Updates Available Card */}
            <GridItem span={6}>
              <Card
                isClickable
                isSelectable
                onClick={handleUpdatesClick}
                className="dashboard-card dashboard-card--clickable"
              >
                <CardTitle>Updates Available</CardTitle>
                <CardBody className="dashboard-card__body--centered">
                  <span className="dashboard-card__number">{stats.updatesSummary.total}</span>
                  {stats.updatesSummary.critical > 0 && (
                    <span className="dashboard-card__subtitle dashboard-card__subtitle--critical">
                      {stats.updatesSummary.critical} critical
                    </span>
                  )}
                </CardBody>
              </Card>
            </GridItem>
          </Grid>
        </PageSection>
      )}
    </Page>
  );
};

export default Dashboard;
```

**Step 2: Create Dashboard.css for card styling**

Create `console-plugin/src/pages/Dashboard.css`:

```css
.dashboard-card {
  min-height: 250px;
}

.dashboard-card--clickable {
  cursor: pointer;
  transition: box-shadow 0.2s ease-in-out;
}

.dashboard-card--clickable:hover {
  box-shadow: var(--pf-v5-global--BoxShadow--md);
}

.dashboard-card__body--centered {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 180px;
}

.dashboard-card__body--chart {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: var(--pf-v5-global--spacer--md);
}

.dashboard-card__chart-container {
  width: 200px;
  height: 200px;
}

.dashboard-card__number {
  font-size: 4rem;
  font-weight: bold;
  line-height: 1;
}

.dashboard-card__subtitle {
  margin-top: var(--pf-v5-global--spacer--sm);
  font-size: var(--pf-v5-global--FontSize--md);
}

.dashboard-card__subtitle--critical {
  color: var(--pf-v5-global--danger-color--100);
}

.dashboard-card__legend {
  display: flex;
  gap: var(--pf-v5-global--spacer--md);
  margin-top: var(--pf-v5-global--spacer--sm);
  flex-wrap: wrap;
  justify-content: center;
}

.dashboard-card__legend-item {
  font-size: var(--pf-v5-global--FontSize--sm);
}

.dashboard-card__legend-item--healthy {
  color: #3E8635;
}

.dashboard-card__legend-item--warning {
  color: #F0AB00;
}

.dashboard-card__legend-item--critical {
  color: #C9190B;
}

.dashboard-card__legend-item--on {
  color: #06C;
}

.dashboard-card__legend-item--off {
  color: #6A6E73;
}
```

**Step 3: Run all tests**

Run: `cd console-plugin && npm test`
Expected: All tests pass

**Step 4: Run build to verify no TypeScript errors**

Run: `cd console-plugin && npm run build`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add console-plugin/src/pages/Dashboard.tsx console-plugin/src/pages/Dashboard.css
git commit -m "feat(dashboard): redesign with 2x2 card grid and donut charts

- Remove refresh countdown and manual refresh button
- Remove expandable card sections (Health, Power, Jobs, Firmware)
- Add 2x2 grid layout with larger cards
- Add donut charts for health and power status
- Make all cards clickable with navigation
- Add filter query params when clicking chart segments"
```

---

## Task 4: Verify Backend PowerState Data

Verify the backend correctly fetches PowerState from Redfish. This is a verification task - only implement fixes if needed.

**Files:**
- Check: `internal/redfish/client.go`
- Check: `internal/store/store.go`

**Step 1: Check redfish client for PowerState**

Read `internal/redfish/client.go` and verify it fetches from `/redfish/v1/Systems/System.Embedded.1` and extracts `PowerState`.

**Step 2: Check store for PowerState storage**

Read `internal/store/store.go` and verify `powerState` is stored per node.

**Step 3: Check API handler for dashboard aggregation**

Read `internal/api/handlers.go` and verify the dashboard endpoint correctly counts on/off nodes.

**Step 4: Document findings**

If backend is correct, no changes needed.
If backend needs fixes, create a follow-up task with specific changes.

**Step 5: Run full test suite**

Run: `cd console-plugin && npm test`
Expected: All 55+ tests pass

---

## Task 5: Final Verification and Cleanup

**Step 1: Run linter**

Run: `cd console-plugin && npm run lint`
Expected: No errors

**Step 2: Run full build**

Run: `cd console-plugin && npm run build`
Expected: Build succeeds

**Step 3: Run all tests**

Run: `cd console-plugin && npm test`
Expected: All tests pass

**Step 4: Review git log**

Run: `git log --oneline -5`
Verify commits are clean and well-described.

---

## Summary

| Task | Description | Est. Steps |
|------|-------------|------------|
| 1 | Nodes page URL query param support | 5 |
| 2 | Update Dashboard tests | 4 |
| 3 | Rewrite Dashboard component | 5 |
| 4 | Verify backend PowerState | 5 |
| 5 | Final verification | 4 |

Total: 23 steps
