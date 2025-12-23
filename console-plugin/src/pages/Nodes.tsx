import * as React from 'react';
import { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import {
  Page,
  PageSection,
  Title,
  Spinner,
  Alert,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  Select,
  SelectOption,
  SelectList,
  MenuToggle,
  MenuToggleElement,
} from '@patternfly/react-core';
import {
  Table,
  Thead,
  Tr,
  Th,
  Tbody,
  Td,
  ThProps,
} from '@patternfly/react-table';
import { Node, HealthStatus } from '../types';
import { getNodes } from '../services/api';
import { HealthStatusIcon } from '../components/HealthStatusIcon';

export const Nodes: React.FC = () => {
  const history = useHistory();
  const [nodes, setNodes] = useState<Node[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [healthFilter, setHealthFilter] = useState<HealthStatus | 'All'>('All');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeSortIndex, setActiveSortIndex] = useState<number | null>(null);
  const [activeSortDirection, setActiveSortDirection] = useState<'asc' | 'desc'>('asc');

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

  const getSortableRowValues = (node: Node): (string | number)[] => [
    node.name,
    node.model,
    node.health,
    node.thermalSummary?.inletTempC ?? 0,
    node.powerSummary?.currentWatts ?? 0,
    node.lastScanned,
  ];

  const getSortParams = (columnIndex: number): ThProps['sort'] => ({
    sortBy: {
      index: activeSortIndex ?? undefined,
      direction: activeSortDirection,
    },
    onSort: (_event, index, direction) => {
      setActiveSortIndex(index);
      setActiveSortDirection(direction);
    },
    columnIndex,
  });

  let filteredNodes = nodes;
  if (healthFilter !== 'All') {
    filteredNodes = nodes.filter((n) => n.health === healthFilter);
  }

  if (activeSortIndex !== null) {
    filteredNodes = [...filteredNodes].sort((a, b) => {
      const aValue = getSortableRowValues(a)[activeSortIndex];
      const bValue = getSortableRowValues(b)[activeSortIndex];
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return activeSortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }
      const aStr = String(aValue);
      const bStr = String(bValue);
      return activeSortDirection === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });
  }

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
          <Alert variant="danger" title="Error loading nodes">
            {error}
          </Alert>
        </PageSection>
      </Page>
    );
  }

  return (
    <Page>
      <PageSection variant="light">
        <Title headingLevel="h1">Nodes</Title>
      </PageSection>
      <PageSection>
        <Toolbar>
          <ToolbarContent>
            <ToolbarItem>
              <Select
                isOpen={isFilterOpen}
                selected={healthFilter}
                onSelect={(_e, value) => {
                  setHealthFilter(value as HealthStatus | 'All');
                  setIsFilterOpen(false);
                }}
                onOpenChange={setIsFilterOpen}
                toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                  <MenuToggle ref={toggleRef} onClick={() => setIsFilterOpen(!isFilterOpen)} isExpanded={isFilterOpen}>
                    Health: {healthFilter}
                  </MenuToggle>
                )}
              >
                <SelectList>
                  <SelectOption value="All">All</SelectOption>
                  <SelectOption value="OK">OK</SelectOption>
                  <SelectOption value="Warning">Warning</SelectOption>
                  <SelectOption value="Critical">Critical</SelectOption>
                </SelectList>
              </Select>
            </ToolbarItem>
          </ToolbarContent>
        </Toolbar>
        <Table aria-label="Nodes table">
          <Thead>
            <Tr>
              <Th sort={getSortParams(0)}>Name</Th>
              <Th sort={getSortParams(1)}>Model</Th>
              <Th sort={getSortParams(2)}>Health</Th>
              <Th sort={getSortParams(3)}>Temp (°C)</Th>
              <Th sort={getSortParams(4)}>Power (W)</Th>
              <Th sort={getSortParams(5)}>Last Seen</Th>
            </Tr>
          </Thead>
          <Tbody>
            {filteredNodes.map((node) => (
              <Tr
                key={node.name}
                isClickable
                onRowClick={() => history.push(`/baremetal-insights/nodes/${node.name}`)}
              >
                <Td dataLabel="Name">{node.name}</Td>
                <Td dataLabel="Model">{node.model}</Td>
                <Td dataLabel="Health">
                  <HealthStatusIcon status={node.health} showLabel />
                </Td>
                <Td dataLabel="Temp">{node.thermalSummary?.inletTempC ?? '-'}</Td>
                <Td dataLabel="Power">{node.powerSummary?.currentWatts ?? '-'}</Td>
                <Td dataLabel="Last Seen">{new Date(node.lastScanned).toLocaleString()}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </PageSection>
    </Page>
  );
};

export default Nodes;
