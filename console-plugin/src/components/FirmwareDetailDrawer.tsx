import * as React from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerContentBody,
  DrawerPanelContent,
  DrawerHead,
  DrawerActions,
  DrawerCloseButton,
  DrawerPanelBody,
  Title,
  Text,
  TextContent,
  Label,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { Node } from '../types';

interface FirmwareDetailDrawerProps {
  isOpen: boolean;
  node: Node | null;
  onClose: () => void;
  children?: React.ReactNode;
}

export const FirmwareDetailDrawer: React.FC<FirmwareDetailDrawerProps> = ({
  isOpen,
  node,
  onClose,
  children,
}) => {
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

  const panelContent = node ? (
    <DrawerPanelContent widths={{ default: 'width_50' }}>
      <DrawerHead>
        <Title headingLevel="h2">{node.name}</Title>
        <TextContent>
          <Text component="small">
            {node.model} | {node.manufacturer}
          </Text>
        </TextContent>
        <DrawerActions>
          <DrawerCloseButton onClick={onClose} />
        </DrawerActions>
      </DrawerHead>
      <DrawerPanelBody>
        <Table aria-label="Firmware details" variant="compact">
          <Thead>
            <Tr>
              <Th>Component</Th>
              <Th>Type</Th>
              <Th>Installed</Th>
              <Th>Available</Th>
              <Th>Severity</Th>
            </Tr>
          </Thead>
          <Tbody>
            {node.firmware?.map((fw) => (
              <Tr
                key={fw.id}
                style={{
                  backgroundColor: fw.availableVersion
                    ? 'var(--pf-v5-global--warning-color--200)'
                    : undefined,
                }}
              >
                <Td dataLabel="Component">{fw.name}</Td>
                <Td dataLabel="Type">{fw.componentType}</Td>
                <Td dataLabel="Installed">{fw.currentVersion}</Td>
                <Td dataLabel="Available">{fw.availableVersion || '-'}</Td>
                <Td dataLabel="Severity">
                  {fw.severity ? (
                    <Label color={severityColor(fw.severity)}>{fw.severity}</Label>
                  ) : (
                    '-'
                  )}
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </DrawerPanelBody>
    </DrawerPanelContent>
  ) : null;

  return (
    <Drawer isExpanded={isOpen} onExpand={onClose}>
      <DrawerContent panelContent={panelContent}>
        <DrawerContentBody>{children}</DrawerContentBody>
      </DrawerContent>
    </Drawer>
  );
};
