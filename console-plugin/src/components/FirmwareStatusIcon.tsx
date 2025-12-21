import * as React from 'react';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  QuestionCircleIcon,
  ExclamationCircleIcon,
} from '@patternfly/react-icons';
import { Label } from '@patternfly/react-core';
import { NodeStatus } from '../types';

interface FirmwareStatusIconProps {
  status: NodeStatus;
}

const statusConfig: Record<NodeStatus, { icon: React.ComponentType; color: 'green' | 'orange' | 'grey' | 'red'; text: string }> = {
  'up-to-date': { icon: CheckCircleIcon, color: 'green', text: 'Up to date' },
  'needs-update': { icon: ExclamationTriangleIcon, color: 'orange', text: 'Updates available' },
  'unknown': { icon: QuestionCircleIcon, color: 'grey', text: 'Unknown' },
  'auth-failed': { icon: ExclamationCircleIcon, color: 'red', text: 'Auth failed' },
};

export const FirmwareStatusIcon: React.FC<FirmwareStatusIconProps> = ({ status }) => {
  const config = statusConfig[status] || statusConfig.unknown;
  const Icon = config.icon;

  return (
    <Label color={config.color} icon={<Icon />}>
      {config.text}
    </Label>
  );
};
