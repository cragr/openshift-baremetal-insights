import * as React from 'react';
import { useEffect, useState, useMemo } from 'react';
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
  Button,
  Tabs,
  Tab,
  TabTitleText,
  Switch,
  AlertGroup,
  AlertVariant,
  AlertActionCloseButton,
} from '@patternfly/react-core';
import { FirmwareResponse, Node } from '../types';
import { getFirmware, getNodes, scheduleUpdates } from '../services/api';
import { NamespaceDropdown } from '../components/NamespaceDropdown';
import { ServersTab } from '../components/ServersTab';
import { ComponentsTab } from '../components/ComponentsTab';
import { FirmwareDetailDrawer } from '../components/FirmwareDetailDrawer';
import { ScheduleUpdateModal } from '../components/ScheduleUpdateModal';

export const Firmware: React.FC = () => {
  const [firmwareData, setFirmwareData] = useState<FirmwareResponse | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [namespace, setNamespace] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [activeTab, setActiveTab] = useState<string | number>('servers');
  const [updatesOnly, setUpdatesOnly] = useState(false);

  // Selection state
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [selectedComponents, setSelectedComponents] = useState<string[]>([]);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [scheduling, setScheduling] = useState(false);

  // Alerts
  const [alerts, setAlerts] = useState<{ key: number; title: string; variant: AlertVariant }[]>([]);
  const [alertKey, setAlertKey] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [firmware, nodeData] = await Promise.all([
          getFirmware(namespace || undefined),
          getNodes(namespace || undefined),
        ]);
        setFirmwareData(firmware);
        setNodes(nodeData);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [namespace]);

  // Build node models map for ComponentsTab
  const nodeModels = useMemo(() => {
    const map: Record<string, string> = {};
    nodes.forEach((n) => {
      map[n.name] = n.model;
    });
    return map;
  }, [nodes]);

  // Calculate update counts for modal
  const getUpdateCount = () => {
    if (activeTab === 'servers') {
      return nodes
        .filter((n) => selectedNodes.includes(n.name))
        .reduce((sum, n) => sum + n.updatesAvailable, 0);
    } else {
      return selectedComponents.length;
    }
  };

  const getSelectedNodeNames = () => {
    if (activeTab === 'servers') {
      return selectedNodes;
    } else {
      const nodeSet = new Set(selectedComponents.map((c) => c.split(':')[0]));
      return Array.from(nodeSet);
    }
  };

  const handleNodeClick = (node: Node) => {
    setSelectedNode(node);
    setDrawerOpen(true);
  };

  const handleScheduleClick = () => {
    setModalOpen(true);
  };

  const handleConfirmSchedule = async () => {
    setScheduling(true);
    try {
      const nodeNames = getSelectedNodeNames();
      const components =
        activeTab === 'components'
          ? selectedComponents.map((c) => c.split(':')[1])
          : undefined;

      await scheduleUpdates({
        nodes: nodeNames,
        components,
        mode: 'OnReboot',
      });

      setAlerts((prev) => [
        ...prev,
        {
          key: alertKey,
          title: `Successfully scheduled ${getUpdateCount()} updates on ${nodeNames.length} servers`,
          variant: AlertVariant.success,
        },
      ]);
      setAlertKey((k) => k + 1);

      // Clear selections
      setSelectedNodes([]);
      setSelectedComponents([]);
      setModalOpen(false);

      // Refresh data
      const [firmware, nodeData] = await Promise.all([
        getFirmware(namespace || undefined),
        getNodes(namespace || undefined),
      ]);
      setFirmwareData(firmware);
      setNodes(nodeData);
    } catch (err) {
      setAlerts((prev) => [
        ...prev,
        {
          key: alertKey,
          title: `Failed to schedule updates: ${err instanceof Error ? err.message : 'Unknown error'}`,
          variant: AlertVariant.danger,
        },
      ]);
      setAlertKey((k) => k + 1);
    } finally {
      setScheduling(false);
    }
  };

  const removeAlert = (key: number) => {
    setAlerts((prev) => prev.filter((a) => a.key !== key));
  };

  const selectionCount = activeTab === 'servers' ? selectedNodes.length : selectedComponents.length;

  if (loading && !firmwareData) {
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

  const mainContent = (
    <Page>
      {/* Alerts */}
      <AlertGroup isToast isLiveRegion>
        {alerts.map((alert) => (
          <Alert
            key={alert.key}
            variant={alert.variant}
            title={alert.title}
            actionClose={<AlertActionCloseButton onClose={() => removeAlert(alert.key)} />}
          />
        ))}
      </AlertGroup>

      {/* Header */}
      <PageSection variant="light">
        <Flex
          justifyContent={{ default: 'justifyContentSpaceBetween' }}
          alignItems={{ default: 'alignItemsCenter' }}
        >
          <FlexItem>
            <Title headingLevel="h1">Firmware</Title>
          </FlexItem>
          <FlexItem>
            <NamespaceDropdown selected={namespace} onSelect={setNamespace} />
          </FlexItem>
        </Flex>
      </PageSection>

      {/* Updates Summary Card */}
      {firmwareData && (
        <PageSection>
          <Card>
            <CardTitle>Updates Summary</CardTitle>
            <CardBody>
              <Split hasGutter>
                <SplitItem>
                  <strong>Total:</strong> {firmwareData.summary.total}
                </SplitItem>
                <SplitItem>
                  <strong>Updates Available:</strong> {firmwareData.summary.updatesAvailable}
                </SplitItem>
                <SplitItem>
                  <Label color="red">Critical: {firmwareData.summary.critical}</Label>
                </SplitItem>
                <SplitItem>
                  <Label color="orange">Recommended: {firmwareData.summary.recommended}</Label>
                </SplitItem>
                <SplitItem>
                  <Label color="blue">Optional: {firmwareData.summary.optional}</Label>
                </SplitItem>
              </Split>
            </CardBody>
          </Card>
        </PageSection>
      )}

      {/* Tabs and Content */}
      <PageSection>
        <Card>
          <CardBody>
            {/* Toolbar */}
            <Toolbar>
              <ToolbarContent>
                <ToolbarItem>
                  <SearchInput
                    placeholder="Search by node name or model..."
                    value={searchValue}
                    onChange={(_e, value) => setSearchValue(value)}
                    onClear={() => setSearchValue('')}
                    style={{ width: '300px' }}
                  />
                </ToolbarItem>
                <ToolbarItem>
                  <Switch
                    id="updates-only-switch"
                    label="Updates only"
                    isChecked={updatesOnly}
                    onChange={(_e, checked) => setUpdatesOnly(checked)}
                  />
                </ToolbarItem>
                <ToolbarItem align={{ default: 'alignRight' }}>
                  <Button
                    variant="primary"
                    isDisabled={selectionCount === 0}
                    onClick={handleScheduleClick}
                  >
                    Schedule Update{selectionCount > 0 ? ` (${selectionCount})` : ''}
                  </Button>
                </ToolbarItem>
              </ToolbarContent>
            </Toolbar>

            {/* Tabs */}
            <Tabs
              activeKey={activeTab}
              onSelect={(_e, key) => {
                setActiveTab(key);
                setSelectedNodes([]);
                setSelectedComponents([]);
              }}
              style={{ marginTop: '1rem' }}
            >
              <Tab eventKey="servers" title={<TabTitleText>Servers</TabTitleText>}>
                <div style={{ marginTop: '1rem' }}>
                  <ServersTab
                    nodes={nodes}
                    searchValue={searchValue}
                    updatesOnly={updatesOnly}
                    selectedNodes={selectedNodes}
                    onSelectionChange={setSelectedNodes}
                    onNodeClick={handleNodeClick}
                  />
                </div>
              </Tab>
              <Tab eventKey="components" title={<TabTitleText>Components</TabTitleText>}>
                <div style={{ marginTop: '1rem' }}>
                  <ComponentsTab
                    firmware={firmwareData?.firmware || []}
                    nodeModels={nodeModels}
                    searchValue={searchValue}
                    updatesOnly={updatesOnly}
                    selectedComponents={selectedComponents}
                    onSelectionChange={setSelectedComponents}
                  />
                </div>
              </Tab>
            </Tabs>
          </CardBody>
        </Card>
      </PageSection>

      {/* Schedule Update Modal */}
      <ScheduleUpdateModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleConfirmSchedule}
        selectedNodes={getSelectedNodeNames()}
        updateCount={getUpdateCount()}
        isLoading={scheduling}
      />
    </Page>
  );

  return (
    <FirmwareDetailDrawer
      isOpen={drawerOpen}
      node={selectedNode}
      onClose={() => setDrawerOpen(false)}
    >
      {mainContent}
    </FirmwareDetailDrawer>
  );
};

export default Firmware;
