export type NodeStatus = 'up-to-date' | 'needs-update' | 'unknown' | 'auth-failed';

export interface FirmwareComponent {
  id: string;
  name: string;
  currentVersion: string;
  availableVersion?: string;
  updateable: boolean;
  componentType: string;
}

export interface Node {
  name: string;
  bmcAddress: string;
  model: string;
  manufacturer: string;
  serviceTag: string;
  lastScanned: string;
  status: NodeStatus;
  firmwareCount: number;
  updatesAvailable: number;
  firmware?: FirmwareComponent[];
}

export interface UpdateSummary {
  componentType: string;
  availableVersion: string;
  affectedNodes: string[];
  nodeCount: number;
}

export interface NodesResponse {
  nodes: Node[];
}

export interface UpdatesResponse {
  updates: UpdateSummary[];
}
