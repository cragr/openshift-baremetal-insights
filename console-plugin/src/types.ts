export type NodeStatus = 'up-to-date' | 'needs-update' | 'unknown' | 'auth-failed';
export type HealthStatus = 'OK' | 'Warning' | 'Critical' | 'Unknown';
export type PowerState = 'On' | 'Off' | 'Unknown';
export type Severity = 'Critical' | 'Recommended' | 'Optional';
export type TaskState = 'Pending' | 'Running' | 'Completed' | 'Exception';

export interface FirmwareComponent {
  id: string;
  name: string;
  currentVersion: string;
  availableVersion?: string;
  updateable: boolean;
  componentType: string;
  severity?: Severity;
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

export interface NetworkAdapter {
  name: string;
  model: string;
  port: string;
  linkStatus: 'Up' | 'Down' | 'Unknown';
  linkSpeed: string;
  macAddress: string;
}

export interface StorageController {
  name: string;
  deviceDescription: string;
  pcieSlot: string;
  firmwareVersion: string;
}

export interface Disk {
  name: string;
  state: string;
  slotNumber: string;
  size: string;
  busProtocol: string;
  mediaType: string;
}

export interface StorageDetail {
  controllers: StorageController[];
  disks: Disk[];
}

export interface Node {
  name: string;
  namespace: string;
  bmcAddress: string;
  model: string;
  manufacturer: string;
  serviceTag: string;
  powerState: PowerState;
  lastScanned: string;
  status: NodeStatus;
  firmwareCount: number;
  updatesAvailable: number;
  firmware?: FirmwareComponent[];
  health: HealthStatus;
  healthRollup?: HealthRollup;
  thermalSummary?: ThermalSummary;
  powerSummary?: PowerSummary;
  networkAdapters?: NetworkAdapter[];
  storage?: StorageDetail;
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

export interface Task {
  node: string;
  namespace: string;
  taskId: string;
  taskType: string;
  taskState: TaskState;
  percentComplete: number;
  startTime: string;
  message: string;
}

export interface HealthSummary {
  healthy: number;
  warning: number;
  critical: number;
}

export interface PowerStateSummary {
  on: number;
  off: number;
}

export interface UpdatesSummary {
  total: number;
  critical: number;
  recommended: number;
  optional: number;
  nodesWithUpdates: number;
}

export interface JobsSummary {
  pending: number;
  inProgress: number;
  completed: number;
}

export interface DashboardStats {
  totalNodes: number;
  healthSummary: HealthSummary;
  powerSummary: PowerStateSummary;
  updatesSummary: UpdatesSummary;
  jobsSummary: JobsSummary;
  lastRefresh: string;
  nextRefresh: string;
}

export interface FirmwareEntry {
  node: string;
  namespace: string;
  firmware: FirmwareComponent;
}

export interface FirmwareSummary {
  total: number;
  updatesAvailable: number;
  critical: number;
  recommended: number;
  optional: number;
}

export interface FirmwareResponse {
  summary: FirmwareSummary;
  firmware: FirmwareEntry[];
}

export interface TasksResponse {
  tasks: Task[];
}

export interface NamespacesResponse {
  namespaces: string[];
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
