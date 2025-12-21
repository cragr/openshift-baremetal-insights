import { consoleFetchJSON } from '@openshift-console/dynamic-plugin-sdk';
import { getNodes, getNodeFirmware, getUpdates } from './api';

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
});
