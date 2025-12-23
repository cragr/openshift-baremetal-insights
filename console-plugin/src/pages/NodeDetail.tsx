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
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
  Card,
  CardBody,
  CardTitle,
  Grid,
  GridItem,
} from '@patternfly/react-core';
import { Table, Thead, Tbody, Tr, Th, Td } from '@patternfly/react-table';
import { Node } from '../types';
import { getNodes } from '../services/api';
import { HealthStatusIcon } from '../components/HealthStatusIcon';
import { EventsTab } from './tabs/EventsTab';

export const NodeDetail: React.FC = () => {
  const location = useLocation();
  // Extract node name from URL path: /baremetal-insights/nodes/:name
  const name = useMemo(() => {
    const match = location.pathname.match(/\/baremetal-insights\/nodes\/([^/]+)/);
    return match ? decodeURIComponent(match[1]) : undefined;
  }, [location.pathname]);
  const [node, setNode] = useState<Node | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!name) {
        setError('No node name provided');
        setLoading(false);
        return;
      }
      try {
        const nodesData = await getNodes();
        const foundNode = nodesData.find((n) => n.name === name);
        if (!foundNode) {
          setError(`Node ${name} not found`);
        } else {
          setNode(foundNode);
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

  // Extract Redfish IP from bmcAddress (format: "idrac-<ip>:443" or just the IP)
  const extractRedfishIP = (bmcAddress: string): string => {
    // Remove protocol if present
    const withoutProtocol = bmcAddress.replace(/^https?:\/\//, '');
    // Extract IP from "idrac-<ip>:port" format
    const match = withoutProtocol.match(/idrac-([^:]+)/);
    if (match) {
      return match[1];
    }
    // Otherwise, try to extract IP before port
    const ipMatch = withoutProtocol.match(/^([^:]+)/);
    return ipMatch ? ipMatch[1] : bmcAddress;
  };

  const redfishIP = extractRedfishIP(node.bmcAddress);

  return (
    <Page>
      <PageSection variant="light">
        <Breadcrumb>
          <BreadcrumbItem><Link to="/baremetal-insights">Overview</Link></BreadcrumbItem>
          <BreadcrumbItem><Link to="/baremetal-insights/nodes">Nodes</Link></BreadcrumbItem>
          <BreadcrumbItem isActive>{node.name}</BreadcrumbItem>
        </Breadcrumb>
        <Title headingLevel="h1" style={{ marginTop: '1rem' }}>{node.name}</Title>

        {/* Overview Card */}
        <Card style={{ marginTop: '1rem' }}>
          <CardTitle>Overview</CardTitle>
          <CardBody>
            <DescriptionList isHorizontal>
              <DescriptionListGroup>
                <DescriptionListTerm>Manufacturer</DescriptionListTerm>
                <DescriptionListDescription>{node.manufacturer}</DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Model</DescriptionListTerm>
                <DescriptionListDescription>{node.model}</DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Service Tag</DescriptionListTerm>
                <DescriptionListDescription>{node.serviceTag}</DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>System Health</DescriptionListTerm>
                <DescriptionListDescription><HealthStatusIcon status={node.health} showLabel /></DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Power State</DescriptionListTerm>
                <DescriptionListDescription>{node.powerState}</DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Redfish IP</DescriptionListTerm>
                <DescriptionListDescription>
                  <a href={`https://${redfishIP}`} target="_blank" rel="noopener noreferrer">{redfishIP}</a>
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Last Scanned</DescriptionListTerm>
                <DescriptionListDescription>{new Date(node.lastScanned).toLocaleString()}</DescriptionListDescription>
              </DescriptionListGroup>
            </DescriptionList>
          </CardBody>
        </Card>
      </PageSection>

      {/* Health Status Card */}
      <PageSection>
        <Card>
          <CardTitle>Health Status</CardTitle>
          <CardBody>
            {node.healthRollup ? (
              <Grid hasGutter>
                <GridItem span={4}>
                  <DescriptionList>
                    <DescriptionListGroup>
                      <DescriptionListTerm>Processors</DescriptionListTerm>
                      <DescriptionListDescription><HealthStatusIcon status={node.healthRollup.processors} showLabel /></DescriptionListDescription>
                    </DescriptionListGroup>
                  </DescriptionList>
                </GridItem>
                <GridItem span={4}>
                  <DescriptionList>
                    <DescriptionListGroup>
                      <DescriptionListTerm>Memory</DescriptionListTerm>
                      <DescriptionListDescription><HealthStatusIcon status={node.healthRollup.memory} showLabel /></DescriptionListDescription>
                    </DescriptionListGroup>
                  </DescriptionList>
                </GridItem>
                <GridItem span={4}>
                  <DescriptionList>
                    <DescriptionListGroup>
                      <DescriptionListTerm>Network</DescriptionListTerm>
                      <DescriptionListDescription><HealthStatusIcon status={node.healthRollup.network} showLabel /></DescriptionListDescription>
                    </DescriptionListGroup>
                  </DescriptionList>
                </GridItem>
                <GridItem span={4}>
                  <DescriptionList>
                    <DescriptionListGroup>
                      <DescriptionListTerm>Thermal Status</DescriptionListTerm>
                      <DescriptionListDescription>
                        {node.thermalSummary ? <HealthStatusIcon status={node.thermalSummary.status} showLabel /> : 'N/A'}
                      </DescriptionListDescription>
                    </DescriptionListGroup>
                  </DescriptionList>
                </GridItem>
                <GridItem span={4}>
                  <DescriptionList>
                    <DescriptionListGroup>
                      <DescriptionListTerm>Power Status</DescriptionListTerm>
                      <DescriptionListDescription>
                        {node.powerSummary ? <HealthStatusIcon status={node.powerSummary.status} showLabel /> : 'N/A'}
                      </DescriptionListDescription>
                    </DescriptionListGroup>
                  </DescriptionList>
                </GridItem>
                <GridItem span={4}>
                  <DescriptionList>
                    <DescriptionListGroup>
                      <DescriptionListTerm>Fans</DescriptionListTerm>
                      <DescriptionListDescription>
                        {node.thermalSummary ? `${node.thermalSummary.fansHealthy} / ${node.thermalSummary.fanCount} healthy` : 'N/A'}
                      </DescriptionListDescription>
                    </DescriptionListGroup>
                  </DescriptionList>
                </GridItem>
              </Grid>
            ) : (
              <p>No health rollup data available</p>
            )}
          </CardBody>
        </Card>
      </PageSection>

      {/* Networking Card */}
      <PageSection>
        <Card>
          <CardTitle>Networking</CardTitle>
          <CardBody>
            {node.networkAdapters && node.networkAdapters.length > 0 ? (
              <Table aria-label="Network Adapters" variant="compact">
                <Thead>
                  <Tr>
                    <Th>Model</Th>
                    <Th>Port</Th>
                    <Th>Link Status</Th>
                    <Th>Link Speed</Th>
                    <Th>MAC Address</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {node.networkAdapters.map((adapter, index) => (
                    <Tr key={index}>
                      <Td dataLabel="Model">{adapter.model}</Td>
                      <Td dataLabel="Port">{adapter.port}</Td>
                      <Td dataLabel="Link Status">{adapter.linkStatus}</Td>
                      <Td dataLabel="Link Speed">{adapter.linkSpeed}</Td>
                      <Td dataLabel="MAC Address">{adapter.macAddress}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            ) : (
              <p>No network adapter data available</p>
            )}
          </CardBody>
        </Card>
      </PageSection>

      {/* Storage Card */}
      <PageSection>
        <Card>
          <CardTitle>Storage</CardTitle>
          <CardBody>
            {node.storage ? (
              <>
                {/* Controllers sub-section */}
                <Title headingLevel="h3" size="md" style={{ marginBottom: '1rem' }}>Controllers</Title>
                {node.storage.controllers && node.storage.controllers.length > 0 ? (
                  <Table aria-label="Storage Controllers" variant="compact" style={{ marginBottom: '2rem' }}>
                    <Thead>
                      <Tr>
                        <Th>Name</Th>
                        <Th>Description</Th>
                        <Th>PCIe Slot</Th>
                        <Th>Firmware</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {node.storage.controllers.map((controller, index) => (
                        <Tr key={index}>
                          <Td dataLabel="Name">{controller.name}</Td>
                          <Td dataLabel="Description">{controller.deviceDescription}</Td>
                          <Td dataLabel="PCIe Slot">{controller.pcieSlot}</Td>
                          <Td dataLabel="Firmware">{controller.firmwareVersion}</Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                ) : (
                  <p style={{ marginBottom: '2rem' }}>No storage controller data available</p>
                )}

                {/* Disks sub-section */}
                <Title headingLevel="h3" size="md" style={{ marginBottom: '1rem' }}>Disks</Title>
                {node.storage.disks && node.storage.disks.length > 0 ? (
                  <Table aria-label="Disks" variant="compact">
                    <Thead>
                      <Tr>
                        <Th>Name</Th>
                        <Th>State</Th>
                        <Th>Slot</Th>
                        <Th>Size</Th>
                        <Th>Bus Protocol</Th>
                        <Th>Media Type</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {node.storage.disks.map((disk, index) => (
                        <Tr key={index}>
                          <Td dataLabel="Name">{disk.name}</Td>
                          <Td dataLabel="State">{disk.state}</Td>
                          <Td dataLabel="Slot">{disk.slotNumber}</Td>
                          <Td dataLabel="Size">{disk.size}</Td>
                          <Td dataLabel="Bus Protocol">{disk.busProtocol}</Td>
                          <Td dataLabel="Media Type">{disk.mediaType}</Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                ) : (
                  <p>No disk data available</p>
                )}
              </>
            ) : (
              <p>No storage data available</p>
            )}
          </CardBody>
        </Card>
      </PageSection>

      {/* Power Card */}
      <PageSection>
        <Card>
          <CardTitle>Power</CardTitle>
          <CardBody>
            {node.powerSummary ? (
              <DescriptionList isHorizontal>
                <DescriptionListGroup>
                  <DescriptionListTerm>Status</DescriptionListTerm>
                  <DescriptionListDescription><HealthStatusIcon status={node.powerSummary.status} showLabel /></DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Current Power</DescriptionListTerm>
                  <DescriptionListDescription>{node.powerSummary.currentWatts} W</DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Redundancy</DescriptionListTerm>
                  <DescriptionListDescription>{node.powerSummary.redundancy}</DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>PSU Health</DescriptionListTerm>
                  <DescriptionListDescription>{node.powerSummary.psusHealthy} / {node.powerSummary.psuCount} healthy</DescriptionListDescription>
                </DescriptionListGroup>
              </DescriptionList>
            ) : (
              <p>No power data available</p>
            )}
          </CardBody>
        </Card>
      </PageSection>
    </Page>
  );
};

export default NodeDetail;
