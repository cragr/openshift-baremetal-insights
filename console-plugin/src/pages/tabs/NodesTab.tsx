import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import {
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  ToolbarGroup,
  SearchInput,
  Button,
  Spinner,
  Alert,
  EmptyState,
  EmptyStateBody,
  Select,
  SelectOption,
  SelectList,
  MenuToggle,
  MenuToggleElement,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { SyncIcon } from '@patternfly/react-icons';
import { getNodes } from '../../services/api';
import { Node } from '../../types';
import { FirmwareStatusIcon } from '../../components/FirmwareStatusIcon';
import { UpdateBadge } from '../../components/UpdateBadge';

const ALL_NAMESPACES = 'All namespaces';

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

export const NodesTab: React.FC = () => {
  const history = useHistory();
  const [nodes, setNodes] = useState<Node[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState('');
  const [selectedNamespace, setSelectedNamespace] = useState<string>(ALL_NAMESPACES);
  const [isNamespaceOpen, setIsNamespaceOpen] = useState(false);

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

  // Get unique namespaces from nodes
  const namespaces = useMemo(() => {
    const nsSet = new Set(nodes.map((n) => n.namespace).filter(Boolean));
    return [ALL_NAMESPACES, ...Array.from(nsSet).sort()];
  }, [nodes]);

  const filteredNodes = useMemo(() => {
    let filtered = nodes;

    // Filter by namespace
    if (selectedNamespace !== ALL_NAMESPACES) {
      filtered = filtered.filter((n) => n.namespace === selectedNamespace);
    }

    // Filter by search
    if (searchValue) {
      filtered = filtered.filter((n) =>
        n.name.toLowerCase().includes(searchValue.toLowerCase())
      );
    }

    return filtered;
  }, [searchValue, selectedNamespace, nodes]);

  const onNamespaceToggle = () => {
    setIsNamespaceOpen(!isNamespaceOpen);
  };

  const onNamespaceSelect = (_event: React.MouseEvent<Element, MouseEvent> | undefined, value: string | number | undefined) => {
    setSelectedNamespace(value as string);
    setIsNamespaceOpen(false);
  };

  if (loading) {
    return <Spinner aria-label="Loading" />;
  }

  if (error) {
    return (
      <Alert variant="danger" title="Error loading data">
        {error}
      </Alert>
    );
  }

  return (
    <>
      <Toolbar>
        <ToolbarContent>
          <ToolbarGroup variant="filter-group">
            <ToolbarItem>
              <Select
                id="namespace-select"
                isOpen={isNamespaceOpen}
                selected={selectedNamespace}
                onSelect={onNamespaceSelect}
                onOpenChange={(isOpen) => setIsNamespaceOpen(isOpen)}
                toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                  <MenuToggle
                    ref={toggleRef}
                    onClick={onNamespaceToggle}
                    isExpanded={isNamespaceOpen}
                    style={{ minWidth: '200px' }}
                  >
                    {selectedNamespace}
                  </MenuToggle>
                )}
                shouldFocusToggleOnSelect
              >
                <SelectList>
                  {namespaces.map((ns) => (
                    <SelectOption key={ns} value={ns}>
                      {ns}
                    </SelectOption>
                  ))}
                </SelectList>
              </Select>
            </ToolbarItem>
            <ToolbarItem>
              <SearchInput
                placeholder="Search by name"
                value={searchValue}
                onChange={(_event, value) => setSearchValue(value)}
                onClear={() => setSearchValue('')}
              />
            </ToolbarItem>
          </ToolbarGroup>
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
            <Th>Namespace</Th>
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
              <Td colSpan={7}>
                <EmptyState>
                  <EmptyStateBody>
                    {searchValue || selectedNamespace !== ALL_NAMESPACES
                      ? 'No nodes match your filters'
                      : 'No nodes found'}
                  </EmptyStateBody>
                </EmptyState>
              </Td>
            </Tr>
          ) : (
            filteredNodes.map((node) => (
              <Tr
                key={`${node.namespace}/${node.name}`}
                isClickable
                onRowClick={() => history.push(`/redfish-insights/firmware/nodes/${node.name}`)}
              >
                <Td dataLabel="Name">{node.name}</Td>
                <Td dataLabel="Namespace">{node.namespace}</Td>
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
    </>
  );
};

export default NodesTab;
