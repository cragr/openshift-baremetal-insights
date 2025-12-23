import * as React from 'react';
import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Page,
  PageSection,
  Title,
  Spinner,
  Alert,
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  CardExpandableContent,
  Flex,
  FlexItem,
  Split,
  SplitItem,
  Stack,
  StackItem,
  Label,
  Progress,
  ProgressSize,
  Gallery,
  GalleryItem,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { DashboardStats, Node, Task } from '../types';
import { getDashboard, getNodes, getTasks } from '../services/api';
import { HealthStatusIcon } from '../components/HealthStatusIcon';
import { NamespaceDropdown } from '../components/NamespaceDropdown';
import { RefreshCountdown } from '../components/RefreshCountdown';

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [namespace, setNamespace] = useState('');

  // Expandable card state: health=true (expanded by default), others=false
  const [healthExpanded, setHealthExpanded] = useState(true);
  const [powerExpanded, setPowerExpanded] = useState(false);
  const [jobsExpanded, setJobsExpanded] = useState(false);
  const [firmwareExpanded, setFirmwareExpanded] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [dashboardData, nodesData, tasksData] = await Promise.all([
        getDashboard(namespace || undefined),
        getNodes(namespace || undefined),
        getTasks(namespace || undefined),
      ]);
      setStats(dashboardData);
      setNodes(nodesData);
      setTasks(tasksData);
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

  // Filter nodes needing attention (health !== 'OK')
  const nodesNeedingAttention = nodes.filter((n) => n.health !== 'OK');

  // Filter powered off nodes (powerState === 'Off')
  const poweredOffNodes = nodes.filter((n) => n.powerState === 'Off');

  // Filter nodes with updates available
  const nodesWithUpdates = nodes.filter((n) => n.updatesAvailable > 0);

  // Filter active tasks (not completed)
  const activeTasks = tasks.filter((t) => t.taskState !== 'Completed');

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

  return (
    <Page>
      {/* Header with title, namespace dropdown, refresh countdown */}
      <PageSection variant="light">
        <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }} alignItems={{ default: 'alignItemsCenter' }}>
          <FlexItem>
            <Title headingLevel="h1">Dashboard</Title>
          </FlexItem>
          <FlexItem>
            <Split hasGutter>
              <SplitItem>
                <NamespaceDropdown selected={namespace} onSelect={setNamespace} />
              </SplitItem>
              {stats && (
                <SplitItem>
                  <RefreshCountdown nextRefresh={stats.nextRefresh} onRefresh={fetchData} />
                </SplitItem>
              )}
            </Split>
          </FlexItem>
        </Flex>
      </PageSection>

      {/* Summary strip */}
      {stats && (
        <PageSection>
          <Gallery hasGutter minWidths={{ default: '150px' }}>
            <GalleryItem>
              <Card isCompact>
                <CardTitle>Total Nodes</CardTitle>
                <CardBody>
                  <span style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.totalNodes}</span>
                </CardBody>
              </Card>
            </GalleryItem>
            <GalleryItem>
              <Card isCompact>
                <CardTitle>
                  <HealthStatusIcon status="OK" /> Healthy
                </CardTitle>
                <CardBody>
                  <span style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--pf-v5-global--success-color--100)' }}>
                    {stats.healthSummary.healthy}
                  </span>
                </CardBody>
              </Card>
            </GalleryItem>
            <GalleryItem>
              <Card isCompact>
                <CardTitle>
                  <HealthStatusIcon status="Warning" /> Warning
                </CardTitle>
                <CardBody>
                  <span style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--pf-v5-global--warning-color--100)' }}>
                    {stats.healthSummary.warning}
                  </span>
                </CardBody>
              </Card>
            </GalleryItem>
            <GalleryItem>
              <Card isCompact>
                <CardTitle>
                  <HealthStatusIcon status="Critical" /> Critical
                </CardTitle>
                <CardBody>
                  <span style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--pf-v5-global--danger-color--100)' }}>
                    {stats.healthSummary.critical}
                  </span>
                </CardBody>
              </Card>
            </GalleryItem>
            <GalleryItem>
              <Card isCompact>
                <CardTitle>Powered On</CardTitle>
                <CardBody>
                  <span style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--pf-v5-global--success-color--100)' }}>
                    {stats.powerSummary.on}
                  </span>
                </CardBody>
              </Card>
            </GalleryItem>
            <GalleryItem>
              <Card isCompact>
                <CardTitle>Powered Off</CardTitle>
                <CardBody>
                  <span style={{ fontSize: '2rem', fontWeight: 'bold' }}>
                    {stats.powerSummary.off}
                  </span>
                </CardBody>
              </Card>
            </GalleryItem>
            <GalleryItem>
              <Card isCompact>
                <CardTitle>Updates Available</CardTitle>
                <CardBody>
                  <span style={{ fontSize: '2rem', fontWeight: 'bold' }}>
                    {stats.updatesSummary.nodesWithUpdates}
                  </span>
                </CardBody>
              </Card>
            </GalleryItem>
          </Gallery>
        </PageSection>
      )}

      {/* Expandable cards for Health, Power, Jobs, Firmware */}
      <PageSection>
        <Stack hasGutter>
          {/* Health Overview Card */}
          <StackItem>
            <Card isExpanded={healthExpanded}>
              <CardHeader
                onExpand={() => setHealthExpanded(!healthExpanded)}
                toggleButtonProps={{
                  id: 'health-toggle',
                  'aria-label': 'Health Overview',
                  'aria-labelledby': 'health-title health-toggle',
                  'aria-expanded': healthExpanded,
                }}
              >
                <CardTitle id="health-title">Health Overview</CardTitle>
              </CardHeader>
              <CardExpandableContent>
                <CardBody>
                  {nodesNeedingAttention.length === 0 ? (
                    <p>All nodes are healthy</p>
                  ) : (
                    <Table variant="compact">
                      <Thead>
                        <Tr>
                          <Th>Node</Th>
                          <Th>Namespace</Th>
                          <Th>Health Status</Th>
                          <Th>Model</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {nodesNeedingAttention.map((node) => (
                          <Tr key={node.name}>
                            <Td>
                              <Link to={`/baremetal-insights/nodes/${node.name}`}>{node.name}</Link>
                            </Td>
                            <Td>{node.namespace}</Td>
                            <Td>
                              <HealthStatusIcon status={node.health} showLabel />
                            </Td>
                            <Td>{node.model}</Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  )}
                  <p style={{ marginTop: '1rem' }}>
                    <Link to="/baremetal-insights/nodes">View All Nodes</Link>
                  </p>
                </CardBody>
              </CardExpandableContent>
            </Card>
          </StackItem>

          {/* Power Status Card */}
          <StackItem>
            <Card isExpanded={powerExpanded}>
              <CardHeader
                onExpand={() => setPowerExpanded(!powerExpanded)}
                toggleButtonProps={{
                  id: 'power-toggle',
                  'aria-label': 'Power Status',
                  'aria-labelledby': 'power-title power-toggle',
                  'aria-expanded': powerExpanded,
                }}
              >
                <CardTitle id="power-title">Power Status</CardTitle>
              </CardHeader>
              <CardExpandableContent>
                <CardBody>
                  {poweredOffNodes.length === 0 ? (
                    <p>All nodes are powered on</p>
                  ) : (
                    <Table variant="compact">
                      <Thead>
                        <Tr>
                          <Th>Node</Th>
                          <Th>Namespace</Th>
                          <Th>Power State</Th>
                          <Th>Model</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {poweredOffNodes.map((node) => (
                          <Tr key={node.name}>
                            <Td>
                              <Link to={`/baremetal-insights/nodes/${node.name}`}>{node.name}</Link>
                            </Td>
                            <Td>{node.namespace}</Td>
                            <Td>
                              <Label color="grey">{node.powerState}</Label>
                            </Td>
                            <Td>{node.model}</Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  )}
                  <p style={{ marginTop: '1rem' }}>
                    <Link to="/baremetal-insights/nodes">View All Nodes</Link>
                  </p>
                </CardBody>
              </CardExpandableContent>
            </Card>
          </StackItem>

          {/* Redfish Jobs Card */}
          <StackItem>
            <Card isExpanded={jobsExpanded}>
              <CardHeader
                onExpand={() => setJobsExpanded(!jobsExpanded)}
                toggleButtonProps={{
                  id: 'jobs-toggle',
                  'aria-label': 'Redfish Jobs',
                  'aria-labelledby': 'jobs-title jobs-toggle',
                  'aria-expanded': jobsExpanded,
                }}
              >
                <CardTitle id="jobs-title">Redfish Jobs</CardTitle>
              </CardHeader>
              <CardExpandableContent>
                <CardBody>
                  {activeTasks.length === 0 ? (
                    <p>No active jobs</p>
                  ) : (
                    <Table variant="compact">
                      <Thead>
                        <Tr>
                          <Th>Node</Th>
                          <Th>Namespace</Th>
                          <Th>Task Type</Th>
                          <Th>Status</Th>
                          <Th>Progress</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {activeTasks.map((task) => (
                          <Tr key={task.taskId}>
                            <Td>
                              <Link to={`/baremetal-insights/nodes/${task.node}`}>{task.node}</Link>
                            </Td>
                            <Td>{task.namespace}</Td>
                            <Td>{task.taskType}</Td>
                            <Td>
                              <Label color={task.taskState === 'Running' ? 'blue' : 'grey'}>
                                {task.taskState}
                              </Label>
                            </Td>
                            <Td>
                              <Progress
                                value={task.percentComplete}
                                title={task.message}
                                size={ProgressSize.sm}
                              />
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  )}
                </CardBody>
              </CardExpandableContent>
            </Card>
          </StackItem>

          {/* Firmware Updates Card */}
          <StackItem>
            <Card isExpanded={firmwareExpanded}>
              <CardHeader
                onExpand={() => setFirmwareExpanded(!firmwareExpanded)}
                toggleButtonProps={{
                  id: 'firmware-toggle',
                  'aria-label': 'Firmware Updates',
                  'aria-labelledby': 'firmware-title firmware-toggle',
                  'aria-expanded': firmwareExpanded,
                }}
              >
                <CardTitle id="firmware-title">Firmware Updates</CardTitle>
              </CardHeader>
              <CardExpandableContent>
                <CardBody>
                  {stats && stats.updatesSummary.nodesWithUpdates === 0 ? (
                    <p>All nodes are up to date</p>
                  ) : (
                    <>
                      {stats && (
                        <Split hasGutter style={{ marginBottom: '1rem' }}>
                          <SplitItem>
                            <Label color="red">Critical: {stats.updatesSummary.critical}</Label>
                          </SplitItem>
                          <SplitItem>
                            <Label color="orange">Recommended: {stats.updatesSummary.recommended}</Label>
                          </SplitItem>
                          <SplitItem>
                            <Label color="blue">Optional: {stats.updatesSummary.optional}</Label>
                          </SplitItem>
                        </Split>
                      )}
                      <Table variant="compact">
                        <Thead>
                          <Tr>
                            <Th>Node</Th>
                            <Th>Namespace</Th>
                            <Th>Updates Available</Th>
                            <Th>Model</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {nodesWithUpdates.map((node) => (
                            <Tr key={node.name}>
                              <Td>
                                <Link to={`/baremetal-insights/nodes/${node.name}`}>{node.name}</Link>
                              </Td>
                              <Td>{node.namespace}</Td>
                              <Td>
                                <Label color="orange">{node.updatesAvailable}</Label>
                              </Td>
                              <Td>{node.model}</Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    </>
                  )}
                  <p style={{ marginTop: '1rem' }}>
                    <Link to="/baremetal-insights/firmware">View All Firmware</Link>
                  </p>
                </CardBody>
              </CardExpandableContent>
            </Card>
          </StackItem>
        </Stack>
      </PageSection>
    </Page>
  );
};

export default Dashboard;
