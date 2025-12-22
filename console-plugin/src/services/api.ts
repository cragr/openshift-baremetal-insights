import { consoleFetchJSON } from '@openshift-console/dynamic-plugin-sdk';
import {
  Node,
  NodesResponse,
  UpdatesResponse,
  FirmwareComponent,
  HealthRollup,
  ThermalSummary,
  PowerSummary,
  HealthEvent,
  EventsResponse,
} from '../types';

const API_BASE = '/api/proxy/plugin/redfish-insights-plugin/redfish-insights';

export const getNodes = async (): Promise<Node[]> => {
  const response = (await consoleFetchJSON(`${API_BASE}/api/v1/nodes`)) as NodesResponse;
  return response.nodes || [];
};

export const getNodeFirmware = async (name: string): Promise<FirmwareComponent[]> => {
  const response = (await consoleFetchJSON(
    `${API_BASE}/api/v1/nodes/${encodeURIComponent(name)}/firmware`
  )) as { firmware: FirmwareComponent[] };
  return response.firmware || [];
};

export const getNodeHealth = async (name: string): Promise<{ health: string; healthRollup: HealthRollup }> => {
  return consoleFetchJSON(`${API_BASE}/api/v1/nodes/${encodeURIComponent(name)}/health`);
};

export const getNodeThermal = async (name: string): Promise<{ thermal: ThermalSummary }> => {
  return consoleFetchJSON(`${API_BASE}/api/v1/nodes/${encodeURIComponent(name)}/thermal`);
};

export const getNodePower = async (name: string): Promise<{ power: PowerSummary }> => {
  return consoleFetchJSON(`${API_BASE}/api/v1/nodes/${encodeURIComponent(name)}/power`);
};

export const getNodeEvents = async (name: string): Promise<HealthEvent[]> => {
  const response = (await consoleFetchJSON(
    `${API_BASE}/api/v1/nodes/${encodeURIComponent(name)}/events`
  )) as EventsResponse;
  return response.events || [];
};

export const getEvents = async (limit?: number, node?: string): Promise<HealthEvent[]> => {
  const params = new URLSearchParams();
  if (limit) params.set('limit', String(limit));
  if (node) params.set('node', node);
  const query = params.toString() ? `?${params}` : '';
  const response = (await consoleFetchJSON(`${API_BASE}/api/v1/events${query}`)) as EventsResponse;
  return response.events || [];
};

export const getUpdates = async (): Promise<UpdatesResponse> => {
  const response = (await consoleFetchJSON(`${API_BASE}/api/v1/updates`)) as UpdatesResponse;
  return { updates: response.updates || [] };
};
