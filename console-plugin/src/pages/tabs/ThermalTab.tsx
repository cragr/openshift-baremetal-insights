import * as React from 'react';
import { Card, CardTitle, CardBody, DescriptionList, DescriptionListGroup, DescriptionListTerm, DescriptionListDescription } from '@patternfly/react-core';
import { ThermalSummary } from '../../types';
import { HealthStatusIcon } from '../../components/HealthStatusIcon';

interface ThermalTabProps {
  thermal?: ThermalSummary;
}

export const ThermalTab: React.FC<ThermalTabProps> = ({ thermal }) => {
  if (!thermal) {
    return <p>No thermal data available</p>;
  }

  return (
    <Card>
      <CardTitle>Thermal Status</CardTitle>
      <CardBody>
        <DescriptionList>
          <DescriptionListGroup>
            <DescriptionListTerm>Status</DescriptionListTerm>
            <DescriptionListDescription><HealthStatusIcon status={thermal.status} showLabel /></DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Inlet Temperature</DescriptionListTerm>
            <DescriptionListDescription>{thermal.inletTempC}°C</DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Max Temperature</DescriptionListTerm>
            <DescriptionListDescription>{thermal.maxTempC}°C</DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Fans</DescriptionListTerm>
            <DescriptionListDescription>{thermal.fansHealthy} / {thermal.fanCount} healthy</DescriptionListDescription>
          </DescriptionListGroup>
        </DescriptionList>
      </CardBody>
    </Card>
  );
};
