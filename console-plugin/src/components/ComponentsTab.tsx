import * as React from 'react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Label } from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { FirmwareEntry } from '../types';

interface ComponentsTabProps {
  firmware: FirmwareEntry[];
  nodeModels: Record<string, string>;
  searchValue: string;
  updatesOnly: boolean;
  selectedComponents: string[];
  onSelectionChange: (selected: string[]) => void;
}

export const ComponentsTab: React.FC<ComponentsTabProps> = ({
  firmware,
  nodeModels,
  searchValue,
  updatesOnly,
  selectedComponents,
  onSelectionChange,
}) => {
  const filteredFirmware = useMemo(() => {
    let result = firmware;

    if (searchValue) {
      const search = searchValue.toLowerCase();
      result = result.filter(
        (entry) =>
          entry.node.toLowerCase().includes(search) ||
          (nodeModels[entry.node] || '').toLowerCase().includes(search) ||
          entry.firmware.name.toLowerCase().includes(search) ||
          entry.firmware.componentType.toLowerCase().includes(search)
      );
    }

    if (updatesOnly) {
      result = result.filter((entry) => entry.firmware.availableVersion);
    }

    return result;
  }, [firmware, nodeModels, searchValue, updatesOnly]);

  const selectableComponents = filteredFirmware.filter(
    (entry) => entry.firmware.availableVersion
  );
  const allSelected =
    selectableComponents.length > 0 &&
    selectableComponents.every((entry) =>
      selectedComponents.includes(`${entry.node}:${entry.firmware.id}`)
    );

  const handleSelectAll = () => {
    const visibleComponentKeys = selectableComponents.map(
      (entry) => `${entry.node}:${entry.firmware.id}`
    );
    if (allSelected) {
      onSelectionChange(
        selectedComponents.filter((key) => !visibleComponentKeys.includes(key))
      );
    } else {
      onSelectionChange([
        ...new Set([...selectedComponents, ...visibleComponentKeys]),
      ]);
    }
  };

  const handleSelectComponent = (key: string) => {
    if (selectedComponents.includes(key)) {
      onSelectionChange(selectedComponents.filter((k) => k !== key));
    } else {
      onSelectionChange([...selectedComponents, key]);
    }
  };

  const severityColor = (severity?: string) => {
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
    <Table aria-label="Firmware components" variant="compact">
      <Thead>
        <Tr>
          <Th
            select={{
              onSelect: handleSelectAll,
              isSelected: allSelected,
            }}
            screenReaderText="Select row"
          />
          <Th>Node Name</Th>
          <Th>Model</Th>
          <Th>Component</Th>
          <Th>Installed Version</Th>
          <Th>Available Version</Th>
          <Th>Severity</Th>
        </Tr>
      </Thead>
      <Tbody>
        {filteredFirmware.length === 0 ? (
          <Tr>
            <Td colSpan={7}>
              <p style={{ textAlign: 'center', padding: '2rem' }}>
                No firmware components found
              </p>
            </Td>
          </Tr>
        ) : (
          filteredFirmware.map((entry, index) => {
            const key = `${entry.node}:${entry.firmware.id}`;
            const hasUpdate = !!entry.firmware.availableVersion;
            return (
              <Tr
                key={key}
                style={{
                  backgroundColor: hasUpdate
                    ? 'var(--pf-v5-global--warning-color--200)'
                    : undefined,
                }}
              >
                <Td
                  select={{
                    rowIndex: index,
                    onSelect: () => handleSelectComponent(key),
                    isSelected: selectedComponents.includes(key),
                    isDisabled: !hasUpdate,
                  }}
                />
                <Td dataLabel="Node Name">
                  <Link to={`/baremetal-insights/nodes/${entry.node}`}>
                    {entry.node}
                  </Link>
                </Td>
                <Td dataLabel="Model">{nodeModels[entry.node] || '-'}</Td>
                <Td dataLabel="Component">
                  {entry.firmware.name}
                  <br />
                  <small style={{ color: 'var(--pf-v5-global--Color--200)' }}>
                    {entry.firmware.componentType}
                  </small>
                </Td>
                <Td dataLabel="Installed Version">{entry.firmware.currentVersion}</Td>
                <Td dataLabel="Available Version">
                  {entry.firmware.availableVersion || '-'}
                </Td>
                <Td dataLabel="Severity">
                  {entry.firmware.severity ? (
                    <Label color={severityColor(entry.firmware.severity)}>
                      {entry.firmware.severity}
                    </Label>
                  ) : (
                    '-'
                  )}
                </Td>
              </Tr>
            );
          })
        )}
      </Tbody>
    </Table>
  );
};
