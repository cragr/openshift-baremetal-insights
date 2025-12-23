import * as React from 'react';
import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Page,
  PageSection,
  Title,
  Spinner,
  Alert,
  Card,
  CardTitle,
  CardBody,
  Flex,
  FlexItem,
  Split,
  SplitItem,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  SearchInput,
  Label,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { FirmwareResponse, FirmwareEntry } from '../types';
import { getFirmware } from '../services/api';
import { NamespaceDropdown } from '../components/NamespaceDropdown';

export const Firmware: React.FC = () => {
  const [data, setData] = useState<FirmwareResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [namespace, setNamespace] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [sortBy, setSortBy] = useState<{ index: number; direction: 'asc' | 'desc' }>({
    index: 0,
    direction: 'asc',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const firmwareData = await getFirmware(namespace || undefined);
        setData(firmwareData);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch firmware data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [namespace]);

  // Filter firmware entries based on search
  const filteredFirmware = useMemo(() => {
    if (!data?.firmware) return [];

    let filtered = data.firmware;

    if (searchValue) {
      const searchLower = searchValue.toLowerCase();
      filtered = filtered.filter(
        (entry) =>
          entry.node.toLowerCase().includes(searchLower) ||
          entry.firmware.name.toLowerCase().includes(searchLower) ||
          entry.firmware.componentType.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }, [data, searchValue]);

  // Sort firmware entries
  const sortedFirmware = useMemo(() => {
    const sorted = [...filteredFirmware];

    sorted.sort((a, b) => {
      let aValue: string | number = '';
      let bValue: string | number = '';

      switch (sortBy.index) {
        case 0: // Node
          aValue = a.node;
          bValue = b.node;
          break;
        case 1: // Component
          aValue = a.firmware.name;
          bValue = b.firmware.name;
          break;
        case 2: // Installed Version
          aValue = a.firmware.currentVersion;
          bValue = b.firmware.currentVersion;
          break;
        case 3: // Available Version
          aValue = a.firmware.availableVersion || '';
          bValue = b.firmware.availableVersion || '';
          break;
        case 4: // Severity
          aValue = a.firmware.severity || '';
          bValue = b.firmware.severity || '';
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortBy.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortBy.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [filteredFirmware, sortBy]);

  const handleSort = (columnIndex: number) => {
    setSortBy((prev) => ({
      index: columnIndex,
      direction: prev.index === columnIndex && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  if (loading && !data) {
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
    <Page>
      {/* Header with title and namespace dropdown */}
      <PageSection variant="light">
        <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }} alignItems={{ default: 'alignItemsCenter' }}>
          <FlexItem>
            <Title headingLevel="h1">Firmware</Title>
          </FlexItem>
          <FlexItem>
            <NamespaceDropdown selected={namespace} onSelect={setNamespace} />
          </FlexItem>
        </Flex>
      </PageSection>

      {/* Updates Summary Card */}
      {data && (
        <PageSection>
          <Card>
            <CardTitle>Updates Summary</CardTitle>
            <CardBody>
              <Split hasGutter>
                <SplitItem>
                  <strong>Total:</strong> {data.summary.total}
                </SplitItem>
                <SplitItem>
                  <strong>Updates Available:</strong> {data.summary.updatesAvailable}
                </SplitItem>
                <SplitItem>
                  <Label color="red">Critical: {data.summary.critical}</Label>
                </SplitItem>
                <SplitItem>
                  <Label color="orange">Recommended: {data.summary.recommended}</Label>
                </SplitItem>
                <SplitItem>
                  <Label color="blue">Optional: {data.summary.optional}</Label>
                </SplitItem>
              </Split>
            </CardBody>
          </Card>
        </PageSection>
      )}

      {/* Firmware Inventory Table */}
      <PageSection>
        <Card>
          <CardTitle>Firmware Inventory</CardTitle>
          <CardBody>
            {/* Toolbar with search */}
            <Toolbar>
              <ToolbarContent>
                <ToolbarItem>
                  <SearchInput
                    placeholder="Search by node, component name, or type..."
                    value={searchValue}
                    onChange={(_e, value) => setSearchValue(value)}
                    onClear={() => setSearchValue('')}
                  />
                </ToolbarItem>
              </ToolbarContent>
            </Toolbar>

            {/* Table */}
            <Table variant="compact">
              <Thead>
                <Tr>
                  <Th
                    sort={{
                      sortBy: {
                        index: sortBy.index,
                        direction: sortBy.direction,
                      },
                      onSort: () => handleSort(0),
                      columnIndex: 0,
                    }}
                  >
                    Node
                  </Th>
                  <Th
                    sort={{
                      sortBy: {
                        index: sortBy.index,
                        direction: sortBy.direction,
                      },
                      onSort: () => handleSort(1),
                      columnIndex: 1,
                    }}
                  >
                    Component
                  </Th>
                  <Th
                    sort={{
                      sortBy: {
                        index: sortBy.index,
                        direction: sortBy.direction,
                      },
                      onSort: () => handleSort(2),
                      columnIndex: 2,
                    }}
                  >
                    Installed Version
                  </Th>
                  <Th
                    sort={{
                      sortBy: {
                        index: sortBy.index,
                        direction: sortBy.direction,
                      },
                      onSort: () => handleSort(3),
                      columnIndex: 3,
                    }}
                  >
                    Available Version
                  </Th>
                  <Th
                    sort={{
                      sortBy: {
                        index: sortBy.index,
                        direction: sortBy.direction,
                      },
                      onSort: () => handleSort(4),
                      columnIndex: 4,
                    }}
                  >
                    Severity
                  </Th>
                </Tr>
              </Thead>
              <Tbody>
                {sortedFirmware.length === 0 ? (
                  <Tr>
                    <Td colSpan={5}>
                      <p style={{ textAlign: 'center', padding: '2rem' }}>
                        No firmware components found
                      </p>
                    </Td>
                  </Tr>
                ) : (
                  sortedFirmware.map((entry: FirmwareEntry, index: number) => {
                    const hasUpdate = !!entry.firmware.availableVersion;
                    return (
                      <Tr
                        key={`${entry.node}-${entry.firmware.id}-${index}`}
                        style={{
                          backgroundColor: hasUpdate ? 'var(--pf-v5-global--warning-color--200)' : undefined,
                        }}
                      >
                        <Td>
                          <Link to={`/baremetal-insights/nodes/${entry.node}`}>{entry.node}</Link>
                        </Td>
                        <Td>
                          {entry.firmware.name}
                          <br />
                          <small style={{ color: 'var(--pf-v5-global--Color--200)' }}>
                            {entry.firmware.componentType}
                          </small>
                        </Td>
                        <Td>{entry.firmware.currentVersion}</Td>
                        <Td>{entry.firmware.availableVersion || '-'}</Td>
                        <Td>
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
          </CardBody>
        </Card>
      </PageSection>
    </Page>
  );
};

export default Firmware;
