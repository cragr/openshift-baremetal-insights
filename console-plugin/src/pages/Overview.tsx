import * as React from 'react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Page,
  PageSection,
  Title,
  Card,
  CardTitle,
  CardBody,
  Gallery,
  GalleryItem,
  Spinner,
  Alert,
  Split,
  SplitItem,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { Node, HealthEvent } from '../types';
import { getNodes, getEvents } from '../services/api';
import { HealthStatusIcon } from '../components/HealthStatusIcon';

export const Overview: React.FC = () => {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [events, setEvents] = useState<HealthEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [nodesData, eventsData] = await Promise.all([
          getNodes(),
          getEvents(10),
        ]);
        setNodes(nodesData);
        setEvents(eventsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

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

  const healthyCnt = nodes.filter((n) => n.health === 'OK').length;
  const warningCnt = nodes.filter((n) => n.health === 'Warning').length;
  const criticalCnt = nodes.filter((n) => n.health === 'Critical').length;
  const firmwareUpdatesCnt = nodes.filter((n) => n.updatesAvailable > 0).length;

  const nodesNeedingAttention = nodes.filter((n) => n.health !== 'OK');

  return (
    <Page>
      <PageSection variant="light">
        <Title headingLevel="h1">Overview</Title>
      </PageSection>
      <PageSection>
        <Gallery hasGutter minWidths={{ default: '150px' }}>
          <GalleryItem>
            <Card isCompact>
              <CardTitle>Total Nodes</CardTitle>
              <CardBody>
                <span style={{ fontSize: '2rem', fontWeight: 'bold' }}>{nodes.length}</span>
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
                  {healthyCnt}
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
                  {warningCnt}
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
                  {criticalCnt}
                </span>
              </CardBody>
            </Card>
          </GalleryItem>
          <GalleryItem>
            <Card isCompact>
              <CardTitle>Firmware Updates</CardTitle>
              <CardBody>
                <span style={{ fontSize: '2rem', fontWeight: 'bold' }}>{firmwareUpdatesCnt} nodes</span>
              </CardBody>
            </Card>
          </GalleryItem>
        </Gallery>
      </PageSection>
      <PageSection>
        <Split hasGutter>
          <SplitItem isFilled>
            <Card>
              <CardTitle>Recent Health Events</CardTitle>
              <CardBody>
                {events.length === 0 ? (
                  <p>No recent events</p>
                ) : (
                  <Stack hasGutter>
                    {events.slice(0, 5).map((event) => (
                      <StackItem key={event.id}>
                        <Split>
                          <SplitItem>
                            <HealthStatusIcon status={event.severity} />
                          </SplitItem>
                          <SplitItem isFilled>
                            <Link to={`/baremetal-insights/nodes/${event.nodeName}`}>{event.nodeName}</Link>
                            : {event.message}
                          </SplitItem>
                          <SplitItem>
                            <small>{new Date(event.timestamp).toLocaleString()}</small>
                          </SplitItem>
                        </Split>
                      </StackItem>
                    ))}
                  </Stack>
                )}
                <p style={{ marginTop: '1rem' }}>
                  <Link to="/baremetal-insights/events">View All Events</Link>
                </p>
              </CardBody>
            </Card>
          </SplitItem>
          <SplitItem style={{ minWidth: '300px' }}>
            <Card>
              <CardTitle>Nodes Needing Attention</CardTitle>
              <CardBody>
                {nodesNeedingAttention.length === 0 ? (
                  <p>All nodes healthy</p>
                ) : (
                  <Stack hasGutter>
                    {nodesNeedingAttention.slice(0, 5).map((node) => (
                      <StackItem key={node.name}>
                        <Split>
                          <SplitItem isFilled>
                            <Link to={`/baremetal-insights/nodes/${node.name}`}>{node.name}</Link>
                          </SplitItem>
                          <SplitItem>
                            <HealthStatusIcon status={node.health} showLabel />
                          </SplitItem>
                        </Split>
                      </StackItem>
                    ))}
                  </Stack>
                )}
                <p style={{ marginTop: '1rem' }}>
                  <Link to="/baremetal-insights/nodes">View All Nodes</Link>
                </p>
              </CardBody>
            </Card>
          </SplitItem>
        </Split>
      </PageSection>
    </Page>
  );
};

export default Overview;
