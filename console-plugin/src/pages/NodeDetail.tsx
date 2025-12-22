import * as React from 'react';
import { useEffect, useState, useMemo } from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
  Page,
  PageSection,
  Title,
  Spinner,
  Alert,
  Breadcrumb,
  BreadcrumbItem,
  Tabs,
  Tab,
  TabTitleText,
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
  Card,
  CardBody,
} from '@patternfly/react-core';
import { Node, FirmwareComponent, HealthEvent } from '../types';
import { getNodes, getNodeFirmware, getNodeEvents } from '../services/api';
import { HealthStatusIcon } from '../components/HealthStatusIcon';
import { HealthTab } from './tabs/HealthTab';
import { ThermalTab } from './tabs/ThermalTab';
import { PowerTab } from './tabs/PowerTab';
import { FirmwareTab } from './tabs/FirmwareTab';
import { EventsTab } from './tabs/EventsTab';

export const NodeDetail: React.FC = () => {
  const location = useLocation();
  // Extract node name from URL path: /redfish-insights/nodes/:name
  const name = useMemo(() => {
    const match = location.pathname.match(/\/redfish-insights\/nodes\/([^/]+)/);
    return match ? decodeURIComponent(match[1]) : undefined;
  }, [location.pathname]);
  const [node, setNode] = useState<Node | null>(null);
  const [firmware, setFirmware] = useState<FirmwareComponent[]>([]);
  const [events, setEvents] = useState<HealthEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      if (!name) {
        setError('No node name provided');
        setLoading(false);
        return;
      }
      try {
        const [nodesData, firmwareData, eventsData] = await Promise.all([
          getNodes(),
          getNodeFirmware(name),
          getNodeEvents(name),
        ]);
        const foundNode = nodesData.find((n) => n.name === name);
        if (!foundNode) {
          setError(`Node ${name} not found`);
        } else {
          setNode(foundNode);
          setFirmware(firmwareData);
          setEvents(eventsData);
        }
      } catch (err) {
        console.error('NodeDetail fetch error:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch node data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [name]);

  if (loading) {
    return (
      <Page>
        <PageSection><Spinner aria-label="Loading" /></PageSection>
      </Page>
    );
  }

  if (error || !node) {
    return (
      <Page>
        <PageSection>
          <Alert variant="danger" title="Error">{error || 'Node not found'}</Alert>
        </PageSection>
      </Page>
    );
  }

  return (
    <Page>
      <PageSection variant="light">
        <Breadcrumb>
          <BreadcrumbItem><Link to="/redfish-insights">Overview</Link></BreadcrumbItem>
          <BreadcrumbItem><Link to="/redfish-insights/nodes">Nodes</Link></BreadcrumbItem>
          <BreadcrumbItem isActive>{node.name}</BreadcrumbItem>
        </Breadcrumb>
        <Title headingLevel="h1" style={{ marginTop: '1rem' }}>{node.name}</Title>
        <Card style={{ marginTop: '1rem' }}>
          <CardBody>
            <DescriptionList isHorizontal>
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
                <DescriptionListTerm>Health</DescriptionListTerm>
                <DescriptionListDescription><HealthStatusIcon status={node.health} showLabel /></DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Last Scanned</DescriptionListTerm>
                <DescriptionListDescription>{new Date(node.lastScanned).toLocaleString()}</DescriptionListDescription>
              </DescriptionListGroup>
            </DescriptionList>
          </CardBody>
        </Card>
      </PageSection>
      <PageSection>
        <Tabs activeKey={activeTab} onSelect={(_, key) => setActiveTab(key as number)}>
          <Tab eventKey={0} title={<TabTitleText>Health</TabTitleText>}>
            <div style={{ marginTop: '1rem' }}><HealthTab healthRollup={node.healthRollup} /></div>
          </Tab>
          <Tab eventKey={1} title={<TabTitleText>Thermal</TabTitleText>}>
            <div style={{ marginTop: '1rem' }}><ThermalTab thermal={node.thermalSummary} /></div>
          </Tab>
          <Tab eventKey={2} title={<TabTitleText>Power</TabTitleText>}>
            <div style={{ marginTop: '1rem' }}><PowerTab power={node.powerSummary} /></div>
          </Tab>
          <Tab eventKey={3} title={<TabTitleText>Firmware ({firmware.length})</TabTitleText>}>
            <div style={{ marginTop: '1rem' }}><FirmwareTab firmware={firmware} /></div>
          </Tab>
          <Tab eventKey={4} title={<TabTitleText>Events ({events.length})</TabTitleText>}>
            <div style={{ marginTop: '1rem' }}><EventsTab events={events} /></div>
          </Tab>
        </Tabs>
      </PageSection>
    </Page>
  );
};

export default NodeDetail;
