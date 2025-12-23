import * as React from 'react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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
} from '@patternfly/react-table';
import { HealthEvent, HealthStatus } from '../types';
import { getEvents } from '../services/api';
import { HealthStatusIcon } from '../components/HealthStatusIcon';

export const HealthEvents: React.FC = () => {
  const [events, setEvents] = useState<HealthEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<HealthStatus | 'All'>('All');
  const [isSeverityOpen, setIsSeverityOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getEvents(100);
        setEvents(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch events');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  let filteredEvents = events;
  if (severityFilter !== 'All') {
    filteredEvents = events.filter((e) => e.severity === severityFilter);
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
          <Alert variant="danger" title="Error loading events">
            {error}
          </Alert>
        </PageSection>
      </Page>
    );
  }

  return (
    <Page>
      <PageSection variant="light">
        <Title headingLevel="h1">Health Events</Title>
      </PageSection>
      <PageSection>
        <Toolbar>
          <ToolbarContent>
            <ToolbarItem>
              <Select
                isOpen={isSeverityOpen}
                selected={severityFilter}
                onSelect={(_e, value) => {
                  setSeverityFilter(value as HealthStatus | 'All');
                  setIsSeverityOpen(false);
                }}
                onOpenChange={setIsSeverityOpen}
                toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                  <MenuToggle ref={toggleRef} onClick={() => setIsSeverityOpen(!isSeverityOpen)} isExpanded={isSeverityOpen}>
                    Severity: {severityFilter}
                  </MenuToggle>
                )}
              >
                <SelectList>
                  <SelectOption value="All">All</SelectOption>
                  <SelectOption value="Critical">Critical</SelectOption>
                  <SelectOption value="Warning">Warning</SelectOption>
                  <SelectOption value="OK">OK</SelectOption>
                </SelectList>
              </Select>
            </ToolbarItem>
          </ToolbarContent>
        </Toolbar>
        <Table aria-label="Health events table">
          <Thead>
            <Tr>
              <Th>Severity</Th>
              <Th>Node</Th>
              <Th>Event</Th>
              <Th>Timestamp</Th>
            </Tr>
          </Thead>
          <Tbody>
            {filteredEvents.length === 0 ? (
              <Tr>
                <Td colSpan={4}>No events found</Td>
              </Tr>
            ) : (
              filteredEvents.map((event) => (
                <Tr key={event.id}>
                  <Td dataLabel="Severity">
                    <HealthStatusIcon status={event.severity} showLabel />
                  </Td>
                  <Td dataLabel="Node">
                    <Link to={`/baremetal-insights/nodes/${event.nodeName}`}>{event.nodeName}</Link>
                  </Td>
                  <Td dataLabel="Event">{event.message}</Td>
                  <Td dataLabel="Timestamp">{new Date(event.timestamp).toLocaleString()}</Td>
                </Tr>
              ))
            )}
          </Tbody>
        </Table>
      </PageSection>
    </Page>
  );
};

export default HealthEvents;
