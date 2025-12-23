import { consoleFetchJSON } from '@openshift-console/dynamic-plugin-sdk';
import {
  getNodes,
  getNodeFirmware,
  getUpdates,
  getDashboard,
  getNamespaces,
  getTasks,
  getFirmware,
} from './api';

jest.mock('@openshift-console/dynamic-plugin-sdk');

const mockFetch = consoleFetchJSON as jest.MockedFunction<typeof consoleFetchJSON>;

describe('API Service', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('getNodes calls correct endpoint', async () => {
    mockFetch.mockResolvedValue({ nodes: [] });
    await getNodes();
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/nodes')
    );
  });

  it('getNodeFirmware calls correct endpoint with name', async () => {
    mockFetch.mockResolvedValue({ firmware: [] });
    await getNodeFirmware('worker-0');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/nodes/worker-0/firmware')
    );
  });

  it('getUpdates calls correct endpoint', async () => {
    mockFetch.mockResolvedValue({ updates: [] });
    await getUpdates();
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/updates')
    );
  });

  it('getNodeFirmware properly encodes node names with special characters', async () => {
    mockFetch.mockResolvedValue({ firmware: [] });
    await getNodeFirmware('worker/node-1');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/nodes/worker%2Fnode-1/firmware')
    );
  });

  it('getNodes handles missing nodes array', async () => {
    mockFetch.mockResolvedValue({});
    const result = await getNodes();
    expect(result).toEqual([]);
  });

  it('getNodeFirmware handles missing firmware array', async () => {
    mockFetch.mockResolvedValue({});
    const result = await getNodeFirmware('worker-0');
    expect(result).toEqual([]);
  });

  it('getUpdates handles missing updates array', async () => {
    mockFetch.mockResolvedValue({});
    const result = await getUpdates();
    expect(result).toEqual({ updates: [] });
  });
});

describe('Dashboard API', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('fetches dashboard stats', async () => {
    const mockStats = {
      totalNodes: 10,
      healthSummary: { healthy: 8, warning: 1, critical: 1 },
      powerSummary: { on: 9, off: 1 },
      updatesSummary: { total: 5, critical: 1, recommended: 2, optional: 2, nodesWithUpdates: 3 },
      jobsSummary: { pending: 0, inProgress: 0, completed: 0 },
      lastRefresh: '2025-12-22T20:00:00Z',
      nextRefresh: '2025-12-22T20:30:00Z',
    };
    mockFetch.mockResolvedValue(mockStats);

    const result = await getDashboard();
    expect(result.totalNodes).toBe(10);
  });

  it('fetches dashboard stats with namespace filter', async () => {
    const mockStats = {
      totalNodes: 5,
      healthSummary: { healthy: 5, warning: 0, critical: 0 },
      powerSummary: { on: 5, off: 0 },
      updatesSummary: { total: 2, critical: 0, recommended: 1, optional: 1, nodesWithUpdates: 2 },
      jobsSummary: { pending: 0, inProgress: 0, completed: 0 },
      lastRefresh: '2025-12-22T20:00:00Z',
      nextRefresh: '2025-12-22T20:30:00Z',
    };
    mockFetch.mockResolvedValue(mockStats);

    const result = await getDashboard('test-namespace');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('?namespace=test-namespace')
    );
    expect(result.totalNodes).toBe(5);
  });

  it('fetches namespaces', async () => {
    mockFetch.mockResolvedValue({ namespaces: ['ns-a', 'ns-b'] });

    const result = await getNamespaces();
    expect(result).toEqual(['ns-a', 'ns-b']);
  });

  it('fetches namespaces handles missing array', async () => {
    mockFetch.mockResolvedValue({});

    const result = await getNamespaces();
    expect(result).toEqual([]);
  });

  it('fetches tasks', async () => {
    mockFetch.mockResolvedValue({ tasks: [{ taskId: 'JID_1' }] });

    const result = await getTasks();
    expect(result.length).toBe(1);
  });

  it('fetches tasks with namespace filter', async () => {
    mockFetch.mockResolvedValue({ tasks: [{ taskId: 'JID_2' }] });

    const result = await getTasks('test-namespace');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('?namespace=test-namespace')
    );
    expect(result.length).toBe(1);
  });

  it('fetches tasks handles missing array', async () => {
    mockFetch.mockResolvedValue({});

    const result = await getTasks();
    expect(result).toEqual([]);
  });

  it('fetches firmware inventory', async () => {
    mockFetch.mockResolvedValue({
      summary: { total: 10, updatesAvailable: 2, critical: 1, recommended: 1, optional: 0 },
      firmware: [],
    });

    const result = await getFirmware();
    expect(result.summary.total).toBe(10);
  });

  it('fetches firmware inventory with namespace filter', async () => {
    mockFetch.mockResolvedValue({
      summary: { total: 5, updatesAvailable: 1, critical: 0, recommended: 1, optional: 0 },
      firmware: [],
    });

    const result = await getFirmware('test-namespace');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('?namespace=test-namespace')
    );
    expect(result.summary.total).toBe(5);
  });
});
