import * as React from 'react';
import {
  Modal,
  ModalVariant,
  Button,
  TextContent,
  Text,
  List,
  ListItem,
  Alert,
} from '@patternfly/react-core';

interface ScheduleUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  selectedNodes: string[];
  updateCount: number;
  isLoading: boolean;
}

export const ScheduleUpdateModal: React.FC<ScheduleUpdateModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  selectedNodes,
  updateCount,
  isLoading,
}) => {
  return (
    <Modal
      variant={ModalVariant.medium}
      title="Schedule Firmware Updates"
      isOpen={isOpen}
      onClose={onClose}
      actions={[
        <Button
          key="confirm"
          variant="primary"
          onClick={onConfirm}
          isLoading={isLoading}
          isDisabled={isLoading}
        >
          {isLoading ? 'Scheduling...' : 'Confirm'}
        </Button>,
        <Button key="cancel" variant="link" onClick={onClose} isDisabled={isLoading}>
          Cancel
        </Button>,
      ]}
    >
      <TextContent>
        <Text>
          <strong>{updateCount} updates</strong> on <strong>{selectedNodes.length} servers</strong>{' '}
          will be scheduled.
        </Text>
      </TextContent>

      <TextContent style={{ marginTop: '1rem' }}>
        <Text component="h4">Affected servers:</Text>
      </TextContent>
      <List>
        {selectedNodes.map((node) => (
          <ListItem key={node}>{node}</ListItem>
        ))}
      </List>

      <Alert
        variant="info"
        isInline
        title="OnReboot Mode"
        style={{ marginTop: '1rem' }}
      >
        Updates will be applied during the next server reboot.
      </Alert>
    </Modal>
  );
};
