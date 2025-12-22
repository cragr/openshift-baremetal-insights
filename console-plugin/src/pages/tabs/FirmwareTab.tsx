import * as React from 'react';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { FirmwareComponent } from '../../types';

interface FirmwareTabProps {
  firmware?: FirmwareComponent[];
}

export const FirmwareTab: React.FC<FirmwareTabProps> = ({ firmware }) => {
  if (!firmware || firmware.length === 0) {
    return <p>No firmware data available</p>;
  }

  return (
    <Table aria-label="Firmware table">
      <Thead>
        <Tr>
          <Th>Component</Th>
          <Th>Type</Th>
          <Th>Current Version</Th>
          <Th>Available Version</Th>
        </Tr>
      </Thead>
      <Tbody>
        {firmware.map((fw) => (
          <Tr key={fw.id}>
            <Td>{fw.name}</Td>
            <Td>{fw.componentType}</Td>
            <Td>{fw.currentVersion}</Td>
            <Td>{fw.availableVersion || '-'}</Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
};
