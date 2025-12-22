import * as React from 'react';
import { Card, CardTitle, CardBody, DescriptionList, DescriptionListGroup, DescriptionListTerm, DescriptionListDescription } from '@patternfly/react-core';
import { PowerSummary } from '../../types';
import { HealthStatusIcon } from '../../components/HealthStatusIcon';

interface PowerTabProps {
  power?: PowerSummary;
}

export const PowerTab: React.FC<PowerTabProps> = ({ power }) => {
  if (!power) {
    return <p>No power data available</p>;
  }

  return (
    <Card>
      <CardTitle>Power Status</CardTitle>
      <CardBody>
        <DescriptionList>
          <DescriptionListGroup>
            <DescriptionListTerm>Status</DescriptionListTerm>
            <DescriptionListDescription><HealthStatusIcon status={power.status} showLabel /></DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Current Power</DescriptionListTerm>
            <DescriptionListDescription>{power.currentWatts} W</DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Power Supplies</DescriptionListTerm>
            <DescriptionListDescription>{power.psusHealthy} / {power.psuCount} healthy</DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Redundancy</DescriptionListTerm>
            <DescriptionListDescription>{power.redundancy}</DescriptionListDescription>
          </DescriptionListGroup>
        </DescriptionList>
      </CardBody>
    </Card>
  );
};
