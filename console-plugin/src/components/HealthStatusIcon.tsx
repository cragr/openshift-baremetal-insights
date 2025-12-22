import * as React from 'react';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  QuestionCircleIcon,
} from '@patternfly/react-icons';
import { HealthStatus } from '../types';

interface HealthStatusIconProps {
  status: HealthStatus;
  showLabel?: boolean;
}

export const HealthStatusIcon: React.FC<HealthStatusIconProps> = ({ status, showLabel = false }) => {
  const getIcon = () => {
    switch (status) {
      case 'OK':
        return <CheckCircleIcon color="var(--pf-v5-global--success-color--100)" aria-label="OK" />;
      case 'Warning':
        return <ExclamationTriangleIcon color="var(--pf-v5-global--warning-color--100)" aria-label="Warning" />;
      case 'Critical':
        return <ExclamationCircleIcon color="var(--pf-v5-global--danger-color--100)" aria-label="Critical" />;
      default:
        return <QuestionCircleIcon color="var(--pf-v5-global--disabled-color--100)" aria-label="Unknown" />;
    }
  };

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
      {getIcon()}
      {showLabel && <span>{status}</span>}
    </span>
  );
};
