import * as React from 'react';
import { useEffect, useState, useCallback, useMemo } from 'react';
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
  List,
  ListItem,
} from '@patternfly/react-core';
import { ChartDonut } from '@patternfly/react-charts';
import { DashboardStats, Node } from '../types';
import { getDashboard, getNodes } from '../services/api';
import { NamespaceDropdown } from '../components/NamespaceDropdown';

import './Dashboard.css';

export const Dashboard: React.FC = () => {
  const history = useHistory();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [namespace, setNamespace] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [dashboardData, nodesData] = await Promise.all([
        getDashboard(namespace || undefined),
        getNodes(namespace || undefined),
      ]);
      setStats(dashboardData);
      setNodes(nodesData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [namespace]);

  const modelCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    nodes.forEach((node) => {
      const model = node.model || 'Unknown';
      counts[model] = (counts[model] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([model, count]) => ({ model, count }));
  }, [nodes]);

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
            {/* Row 1: Number Cards */}
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

            {/* Servers Needing Updates Card */}
            <GridItem span={6}>
              <Card
                isClickable
                isSelectable
                onClick={handleUpdatesClick}
                className="dashboard-card dashboard-card--clickable"
              >
                <CardTitle>Servers Needing Updates</CardTitle>
                <CardBody className="dashboard-card__body--centered">
                  <span className="dashboard-card__number">{stats.updatesSummary.nodesWithUpdates}</span>
                  {stats.updatesSummary.critical > 0 && (
                    <span className="dashboard-card__subtitle dashboard-card__subtitle--critical">
                      {stats.updatesSummary.critical} critical updates
                    </span>
                  )}
                </CardBody>
              </Card>
            </GridItem>

            {/* Row 2: Chart Cards */}
            {/* System Health Card */}
            <GridItem span={6}>
              <Card
                isClickable
                isSelectable
                onClick={() => handleHealthClick()}
                className="dashboard-card dashboard-card--clickable"
              >
                <CardTitle>System Health</CardTitle>
                <CardBody className="dashboard-card__body--chart">
                  <div className="dashboard-card__chart-container">
                    <ChartDonut
                      ariaDesc="System health distribution"
                      ariaTitle="System Health"
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

            {/* Row 3: Server Models Card (full width) */}
            <GridItem span={12}>
              <Card className="dashboard-card dashboard-card--models">
                <CardTitle>Server Models</CardTitle>
                <CardBody className="dashboard-card__body--list">
                  {modelCounts.length > 0 ? (
                    <List isPlain className="dashboard-card__model-list">
                      {modelCounts.map(({ model, count }) => (
                        <ListItem key={model} className="dashboard-card__model-item">
                          <span className="dashboard-card__model-name">{model}</span>
                          <span className="dashboard-card__model-count">{count}</span>
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <span className="dashboard-card__no-data">No server models available</span>
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
