import * as React from 'react';
import { Card, CardTitle, CardBody, DescriptionList, DescriptionListGroup, DescriptionListTerm, DescriptionListDescription } from '@patternfly/react-core';
import { HealthRollup } from '../../types';
import { HealthStatusIcon } from '../../components/HealthStatusIcon';

interface HealthTabProps {
  healthRollup?: HealthRollup;
}

export const HealthTab: React.FC<HealthTabProps> = ({ healthRollup }) => {
  if (!healthRollup) {
    return <p>No health data available</p>;
  }

  return (
    <Card>
      <CardTitle>Component Health</CardTitle>
      <CardBody>
        <DescriptionList>
          <DescriptionListGroup>
            <DescriptionListTerm>Processors</DescriptionListTerm>
            <DescriptionListDescription><HealthStatusIcon status={healthRollup.processors} showLabel /></DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Memory</DescriptionListTerm>
            <DescriptionListDescription><HealthStatusIcon status={healthRollup.memory} showLabel /></DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Power Supplies</DescriptionListTerm>
            <DescriptionListDescription><HealthStatusIcon status={healthRollup.powerSupplies} showLabel /></DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Fans</DescriptionListTerm>
            <DescriptionListDescription><HealthStatusIcon status={healthRollup.fans} showLabel /></DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Storage</DescriptionListTerm>
            <DescriptionListDescription><HealthStatusIcon status={healthRollup.storage} showLabel /></DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Network</DescriptionListTerm>
            <DescriptionListDescription><HealthStatusIcon status={healthRollup.network} showLabel /></DescriptionListDescription>
          </DescriptionListGroup>
        </DescriptionList>
      </CardBody>
    </Card>
  );
};
