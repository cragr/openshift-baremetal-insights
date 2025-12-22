import * as React from 'react';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { HealthEvent } from '../../types';
import { HealthStatusIcon } from '../../components/HealthStatusIcon';

interface EventsTabProps {
  events?: HealthEvent[];
}

export const EventsTab: React.FC<EventsTabProps> = ({ events }) => {
  if (!events || events.length === 0) {
    return <p>No events for this node</p>;
  }

  return (
    <Table aria-label="Events table">
      <Thead>
        <Tr>
          <Th>Severity</Th>
          <Th>Event</Th>
          <Th>Timestamp</Th>
        </Tr>
      </Thead>
      <Tbody>
        {events.map((event) => (
          <Tr key={event.id}>
            <Td><HealthStatusIcon status={event.severity} showLabel /></Td>
            <Td>{event.message}</Td>
            <Td>{new Date(event.timestamp).toLocaleString()}</Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
};
