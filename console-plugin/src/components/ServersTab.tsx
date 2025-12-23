import * as React from 'react';
import { useMemo } from 'react';
import { Label } from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { Node, Severity } from '../types';

interface ServersTabProps {
  nodes: Node[];
  searchValue: string;
  updatesOnly: boolean;
  selectedNodes: string[];
  onSelectionChange: (selected: string[]) => void;
  onNodeClick: (node: Node) => void;
}

export const ServersTab: React.FC<ServersTabProps> = ({
  nodes,
  searchValue,
  updatesOnly,
  selectedNodes,
  onSelectionChange,
  onNodeClick,
}) => {
  const filteredNodes = useMemo(() => {
    let result = nodes;

    if (searchValue) {
      const search = searchValue.toLowerCase();
      result = result.filter(
        (n) =>
          n.name.toLowerCase().includes(search) ||
          n.model.toLowerCase().includes(search)
      );
    }

    if (updatesOnly) {
      result = result.filter((n) => n.updatesAvailable > 0);
    }

    return result;
  }, [nodes, searchValue, updatesOnly]);

  const selectableNodes = filteredNodes.filter((n) => n.updatesAvailable > 0);
  const allSelected =
    selectableNodes.length > 0 &&
    selectableNodes.every((n) => selectedNodes.includes(n.name));

  const handleSelectAll = () => {
    const visibleNodeNames = selectableNodes.map((n) => n.name);
    if (allSelected) {
      // Only remove visible nodes from selection
      onSelectionChange(selectedNodes.filter(name => !visibleNodeNames.includes(name)));
    } else {
      // Add visible nodes to selection (keeping any existing selections)
      onSelectionChange([...new Set([...selectedNodes, ...visibleNodeNames])]);
    }
  };

  const handleSelectNode = (nodeName: string) => {
    if (selectedNodes.includes(nodeName)) {
      onSelectionChange(selectedNodes.filter((n) => n !== nodeName));
    } else {
      onSelectionChange([...selectedNodes, nodeName]);
    }
  };

  const getHighestSeverity = (node: Node): Severity | null => {
    if (!node.firmware) return null;
    const severities = node.firmware
      .filter((f) => f.availableVersion && f.severity)
      .map((f) => f.severity);
    if (severities.includes('Critical')) return 'Critical';
    if (severities.includes('Recommended')) return 'Recommended';
    if (severities.includes('Optional')) return 'Optional';
    return null;
  };

  const severityColor = (severity: Severity | null) => {
    switch (severity) {
      case 'Critical':
        return 'red';
      case 'Recommended':
        return 'orange';
      case 'Optional':
        return 'blue';
      default:
        return 'grey';
    }
  };

  return (
    <Table aria-label="Servers with firmware" variant="compact">
      <Thead>
        <Tr>
          <Th
            select={{
              onSelect: handleSelectAll,
              isSelected: allSelected,
            }}
          />
          <Th>Node Name</Th>
          <Th>Namespace</Th>
          <Th>Model</Th>
          <Th>Manufacturer</Th>
          <Th>Updates</Th>
          <Th>Severity</Th>
          <Th>Last Scanned</Th>
        </Tr>
      </Thead>
      <Tbody>
        {filteredNodes.length === 0 ? (
          <Tr>
            <Td colSpan={8}>
              <p style={{ textAlign: 'center', padding: '2rem' }}>No servers found</p>
            </Td>
          </Tr>
        ) : (
          filteredNodes.map((node, rowIndex) => {
            const hasUpdates = node.updatesAvailable > 0;
            const severity = getHighestSeverity(node);
            return (
              <Tr
                key={node.name}
                style={{
                  backgroundColor: hasUpdates
                    ? 'var(--pf-v5-global--warning-color--200)'
                    : undefined,
                }}
              >
                <Td
                  select={{
                    rowIndex: rowIndex,
                    onSelect: () => handleSelectNode(node.name),
                    isSelected: selectedNodes.includes(node.name),
                    isDisabled: !hasUpdates,
                  }}
                />
                <Td dataLabel="Node Name">
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      onNodeClick(node);
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    {node.name}
                  </a>
                </Td>
                <Td dataLabel="Namespace">{node.namespace}</Td>
                <Td dataLabel="Model">{node.model}</Td>
                <Td dataLabel="Manufacturer">{node.manufacturer}</Td>
                <Td dataLabel="Updates">
                  {hasUpdates ? `${node.updatesAvailable} updates` : '-'}
                </Td>
                <Td dataLabel="Severity">
                  {severity ? (
                    <Label color={severityColor(severity)}>{severity}</Label>
                  ) : (
                    '-'
                  )}
                </Td>
                <Td dataLabel="Last Scanned">
                  {new Date(node.lastScanned).toLocaleString()}
                </Td>
              </Tr>
            );
          })
        )}
      </Tbody>
    </Table>
  );
};
