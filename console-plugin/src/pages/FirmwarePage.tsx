import * as React from 'react';
import { useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import {
  Page,
  PageSection,
  Title,
  Tabs,
  Tab,
  TabTitleText,
} from '@patternfly/react-core';
import { OverviewTab } from './tabs/OverviewTab';
import { NodesTab } from './tabs/NodesTab';
import { UpdatesTab } from './tabs/UpdatesTab';

type TabKey = 'overview' | 'nodes' | 'updates';

const tabPaths: Record<TabKey, string> = {
  overview: '/redfish-insights/firmware',
  nodes: '/redfish-insights/firmware/nodes',
  updates: '/redfish-insights/firmware/updates',
};

const pathToTab: Record<string, TabKey> = {
  '/redfish-insights/firmware': 'overview',
  '/redfish-insights/firmware/nodes': 'nodes',
  '/redfish-insights/firmware/updates': 'updates',
};

export const FirmwarePage: React.FC = () => {
  const history = useHistory();
  const location = useLocation();

  const getActiveTab = (): TabKey => {
    return pathToTab[location.pathname] || 'overview';
  };

  const [activeTab, setActiveTab] = useState<TabKey>(getActiveTab());

  const handleTabSelect = (_event: React.MouseEvent, tabKey: string | number) => {
    const key = tabKey as TabKey;
    setActiveTab(key);
    history.push(tabPaths[key]);
  };

  return (
    <Page>
      <PageSection variant="light">
        <Title headingLevel="h1">Firmware</Title>
      </PageSection>
      <PageSection variant="light" type="tabs">
        <Tabs activeKey={activeTab} onSelect={handleTabSelect} aria-label="Firmware tabs">
          <Tab eventKey="overview" title={<TabTitleText>Overview</TabTitleText>}>
            <PageSection>
              <OverviewTab />
            </PageSection>
          </Tab>
          <Tab eventKey="nodes" title={<TabTitleText>Nodes</TabTitleText>}>
            <PageSection>
              <NodesTab />
            </PageSection>
          </Tab>
          <Tab eventKey="updates" title={<TabTitleText>Updates</TabTitleText>}>
            <PageSection>
              <UpdatesTab />
            </PageSection>
          </Tab>
        </Tabs>
      </PageSection>
    </Page>
  );
};

export default FirmwarePage;
