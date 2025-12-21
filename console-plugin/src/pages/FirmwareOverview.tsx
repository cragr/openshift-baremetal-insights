import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
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

  const totalNodes = useMemo(() => nodes.length, [nodes]);
  const nodesNeedingUpdate = useMemo(
    () => nodes.filter((n) => n.status === 'needs-update').length,
    [nodes]
  );
  const nodesUpToDate = useMemo(
    () => nodes.filter((n) => n.status === 'up-to-date').length,
    [nodes]
  );
  const totalUpdates = useMemo(
    () => nodes.reduce((sum, n) => sum + n.updatesAvailable, 0),
    [nodes]
  );

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
