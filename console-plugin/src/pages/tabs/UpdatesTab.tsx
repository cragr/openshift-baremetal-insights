import * as React from 'react';
import { useState, useEffect } from 'react';
import {
  Spinner,
  Alert,
  ExpandableSection,
  Label,
  LabelGroup,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { getUpdates } from '../../services/api';
import { UpdateSummary } from '../../types';

export const UpdatesTab: React.FC = () => {
  const [updates, setUpdates] = useState<UpdateSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getUpdates();
        setUpdates(data.updates || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch updates');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const toggleRow = (key: string) => {
    setExpandedRows((prev) => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(key)) {
        newExpanded.delete(key);
      } else {
        newExpanded.add(key);
      }
      return newExpanded;
    });
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

  if (updates.length === 0) {
    return (
      <Alert variant="success" title="All firmware is up to date">
        No updates available for any nodes.
      </Alert>
    );
  }

  return (
    <Table aria-label="Firmware updates table">
      <Thead>
        <Tr>
          <Th>Component Type</Th>
          <Th>Available Version</Th>
          <Th>Affected Nodes</Th>
          <Th>Node Names</Th>
        </Tr>
      </Thead>
      <Tbody>
        {updates.map((update) => {
          const key = `${update.componentType}-${update.availableVersion}`;
          const isExpanded = expandedRows.has(key);
          return (
            <Tr key={key}>
              <Td dataLabel="Component Type">{update.componentType}</Td>
              <Td dataLabel="Available Version">{update.availableVersion}</Td>
              <Td dataLabel="Affected Nodes">
                <Label color="orange">{update.nodeCount}</Label>
              </Td>
              <Td dataLabel="Node Names">
                <ExpandableSection
                  toggleText={isExpanded ? 'Hide nodes' : 'Show nodes'}
                  isExpanded={isExpanded}
                  onToggle={() => toggleRow(key)}
                >
                  <LabelGroup>
                    {update.affectedNodes.map((node) => (
                      <Label key={node}>{node}</Label>
                    ))}
                  </LabelGroup>
                </ExpandableSection>
              </Td>
            </Tr>
          );
        })}
      </Tbody>
    </Table>
  );
};

export default UpdatesTab;
