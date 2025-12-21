import * as React from 'react';
import { useState, useEffect } from 'react';
import { useParams, useHistory } from 'react-router-dom';
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

const needsUpdate = (fw: FirmwareComponent): boolean =>
  Boolean(fw.availableVersion && fw.availableVersion !== fw.currentVersion);

export const FirmwareNodeDetail: React.FC = () => {
  const { name } = useParams<{ name: string }>();
  const history = useHistory();
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
          <Alert variant="danger" title="Error">
            {error}
          </Alert>
        </PageSection>
      </Page>
    );
  }

  if (!node) {
    return (
      <Page>
        <PageSection>
          <Alert variant="danger" title="Error">
            Node not found
          </Alert>
        </PageSection>
      </Page>
    );
  }

  return (
    <Page>
      <PageSection>
        <Breadcrumb>
          <BreadcrumbItem onClick={() => history.push('/firmware/nodes')}>
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
