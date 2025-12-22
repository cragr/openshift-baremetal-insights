export type NodeStatus = 'up-to-date' | 'needs-update' | 'unknown' | 'auth-failed';
export type HealthStatus = 'OK' | 'Warning' | 'Critical' | 'Unknown';

export interface FirmwareComponent {
  id: string;
  name: string;
  currentVersion: string;
  availableVersion?: string;
  updateable: boolean;
  componentType: string;
}

export interface HealthRollup {
  processors: HealthStatus;
  memory: HealthStatus;
  powerSupplies: HealthStatus;
  fans: HealthStatus;
  storage: HealthStatus;
  network: HealthStatus;
}

export interface ThermalSummary {
  inletTempC: number;
  maxTempC: number;
  fanCount: number;
  fansHealthy: number;
  status: HealthStatus;
}

export interface PowerSummary {
  currentWatts: number;
  psuCount: number;
  psusHealthy: number;
  redundancy: string;
  status: HealthStatus;
}

export interface Node {
  name: string;
  namespace: string;
  bmcAddress: string;
  model: string;
  manufacturer: string;
  serviceTag: string;
  lastScanned: string;
  status: NodeStatus;
  firmwareCount: number;
  updatesAvailable: number;
  firmware?: FirmwareComponent[];
  health: HealthStatus;
  healthRollup?: HealthRollup;
  thermalSummary?: ThermalSummary;
  powerSummary?: PowerSummary;
}

export interface HealthEvent {
  id: string;
  timestamp: string;
  severity: HealthStatus;
  message: string;
  nodeName: string;
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

export interface EventsResponse {
  events: HealthEvent[];
}
