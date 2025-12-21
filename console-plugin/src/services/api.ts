import { consoleFetchJSON } from '@openshift-console/dynamic-plugin-sdk';
import { Node, NodesResponse, UpdatesResponse, FirmwareComponent } from '../types';

const API_BASE = '/api/proxy/plugin/redfish-insights-plugin/redfish-insights';

export const getNodes = async (): Promise<Node[]> => {
  const response = await consoleFetchJSON<NodesResponse>(`${API_BASE}/api/v1/nodes`);
  return response.nodes || [];
};

export const getNodeFirmware = async (name: string): Promise<FirmwareComponent[]> => {
  const response = await consoleFetchJSON<{ firmware: FirmwareComponent[] }>(
    `${API_BASE}/api/v1/nodes/${encodeURIComponent(name)}/firmware`
  );
  return response.firmware || [];
};

export const getUpdates = async (): Promise<UpdatesResponse> => {
  return consoleFetchJSON<UpdatesResponse>(`${API_BASE}/api/v1/updates`);
};
