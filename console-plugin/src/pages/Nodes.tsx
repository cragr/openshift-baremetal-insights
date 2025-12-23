import * as React from 'react';
import { useEffect, useState, useMemo } from 'react';
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
  Button,
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
import { Node, HealthStatus, PowerState } from '../types';
import { getNodes } from '../services/api';
import { HealthStatusIcon } from '../components/HealthStatusIcon';
import { NamespaceDropdown } from '../components/NamespaceDropdown';

export const Nodes: React.FC = () => {
  const history = useHistory();
  const [nodes, setNodes] = useState<Node[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [namespace, setNamespace] = useState<string>('');
  const [healthFilter, setHealthFilter] = useState<HealthStatus | 'All'>('All');
  const [powerStateFilter, setPowerStateFilter] = useState<PowerState | 'All'>('All');
  const [isHealthFilterOpen, setIsHealthFilterOpen] = useState(false);
  const [isPowerStateFilterOpen, setIsPowerStateFilterOpen] = useState(false);
  const [activeSortIndex, setActiveSortIndex] = useState<number | null>(null);
  const [activeSortDirection, setActiveSortDirection] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await getNodes(namespace || undefined);
        setNodes(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch nodes');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [namespace]);

  const getSortableRowValues = (node: Node): (string | number)[] => [
    node.name,
    node.serviceTag,
    node.model,
    node.health,
    node.powerState,
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

  const filteredNodes = useMemo(() => {
    let result = nodes;
    if (healthFilter !== 'All') {
      result = result.filter((n) => n.health === healthFilter);
    }
    if (powerStateFilter !== 'All') {
      result = result.filter((n) => n.powerState === powerStateFilter);
    }

    if (activeSortIndex !== null) {
      result = [...result].sort((a, b) => {
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
    return result;
  }, [nodes, healthFilter, powerStateFilter, activeSortIndex, activeSortDirection]);

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
              <NamespaceDropdown selected={namespace} onSelect={setNamespace} />
            </ToolbarItem>
            <ToolbarItem>
              <Select
                isOpen={isHealthFilterOpen}
                selected={healthFilter}
                onSelect={(_e, value) => {
                  setHealthFilter(value as HealthStatus | 'All');
                  setIsHealthFilterOpen(false);
                }}
                onOpenChange={setIsHealthFilterOpen}
                toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                  <MenuToggle ref={toggleRef} onClick={() => setIsHealthFilterOpen(!isHealthFilterOpen)} isExpanded={isHealthFilterOpen}>
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
            <ToolbarItem>
              <Select
                isOpen={isPowerStateFilterOpen}
                selected={powerStateFilter}
                onSelect={(_e, value) => {
                  setPowerStateFilter(value as PowerState | 'All');
                  setIsPowerStateFilterOpen(false);
                }}
                onOpenChange={setIsPowerStateFilterOpen}
                toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                  <MenuToggle ref={toggleRef} onClick={() => setIsPowerStateFilterOpen(!isPowerStateFilterOpen)} isExpanded={isPowerStateFilterOpen}>
                    Power State: {powerStateFilter}
                  </MenuToggle>
                )}
              >
                <SelectList>
                  <SelectOption value="All">All</SelectOption>
                  <SelectOption value="On">On</SelectOption>
                  <SelectOption value="Off">Off</SelectOption>
                  <SelectOption value="Unknown">Unknown</SelectOption>
                </SelectList>
              </Select>
            </ToolbarItem>
          </ToolbarContent>
        </Toolbar>
        <Table aria-label="Nodes table">
          <Thead>
            <Tr>
              <Th sort={getSortParams(0)}>Name</Th>
              <Th sort={getSortParams(1)}>Service Tag</Th>
              <Th sort={getSortParams(2)}>Model</Th>
              <Th sort={getSortParams(3)}>Health</Th>
              <Th sort={getSortParams(4)}>Power State</Th>
              <Th sort={getSortParams(5)}>Last Scanned</Th>
            </Tr>
          </Thead>
          <Tbody>
            {filteredNodes.map((node) => (
              <Tr
                key={node.name}
                isClickable
                onRowClick={() => history.push(`/baremetal-insights/nodes/${node.name}`)}
              >
                <Td dataLabel="Name">
                  <Button
                    variant="link"
                    isInline
                    onClick={(e) => {
                      e.stopPropagation();
                      history.push(`/k8s/ns/${node.namespace}/metal3.io~v1alpha1~BareMetalHost/${node.name}`);
                    }}
                  >
                    {node.name}
                  </Button>
                </Td>
                <Td dataLabel="Service Tag">{node.serviceTag}</Td>
                <Td dataLabel="Model">{node.model}</Td>
                <Td dataLabel="Health">
                  <HealthStatusIcon status={node.health} showLabel />
                </Td>
                <Td dataLabel="Power State">{node.powerState}</Td>
                <Td dataLabel="Last Scanned">{new Date(node.lastScanned).toLocaleString()}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </PageSection>
    </Page>
  );
};

export default Nodes;
