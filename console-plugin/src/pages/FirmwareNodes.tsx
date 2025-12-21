import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
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
  EmptyState,
  EmptyStateBody,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { SyncIcon } from '@patternfly/react-icons';
import { getNodes } from '../services/api';
import { Node } from '../types';
import { FirmwareStatusIcon } from '../components/FirmwareStatusIcon';
import { UpdateBadge } from '../components/UpdateBadge';

const formatDate = (dateStr: string): string => {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    return date.toLocaleString();
  } catch {
    return 'Invalid date';
  }
};

export const FirmwareNodes: React.FC = () => {
  const navigate = useNavigate();
  const [nodes, setNodes] = useState<Node[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await getNodes();
      setNodes(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch nodes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredNodes = useMemo(() => {
    if (!searchValue) return nodes;
    return nodes.filter((n) =>
      n.name.toLowerCase().includes(searchValue.toLowerCase())
    );
  }, [searchValue, nodes]);

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
            {filteredNodes.length === 0 ? (
              <Tr>
                <Td colSpan={6}>
                  <EmptyState>
                    <EmptyStateBody>
                      {searchValue ? 'No nodes match your search' : 'No nodes found'}
                    </EmptyStateBody>
                  </EmptyState>
                </Td>
              </Tr>
            ) : (
              filteredNodes.map((node) => (
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
              ))
            )}
          </Tbody>
        </Table>
      </PageSection>
    </Page>
  );
};

export default FirmwareNodes;
