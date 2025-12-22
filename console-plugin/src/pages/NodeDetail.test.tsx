import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Switch } from 'react-router-dom';
import { NodeDetail } from './NodeDetail';
import * as api from '../services/api';

jest.mock('../services/api');

const mockNode = {
  name: 'worker-0',
  namespace: 'default',
  bmcAddress: '10.0.0.1',
  model: 'PowerEdge R640',
  manufacturer: 'Dell',
  serviceTag: 'ABC123',
  lastScanned: '2025-12-21T00:00:00Z',
  status: 'up-to-date' as const,
  firmwareCount: 5,
  updatesAvailable: 0,
  health: 'OK' as const,
};

describe('NodeDetail', () => {
  beforeEach(() => {
    (api.getNodes as jest.Mock).mockResolvedValue([mockNode]);
    (api.getNodeFirmware as jest.Mock).mockResolvedValue([]);
    (api.getNodeEvents as jest.Mock).mockResolvedValue([]);
  });

  it('renders node name', async () => {
    render(
      <MemoryRouter initialEntries={['/nodes/worker-0']}>
        <Switch>
          <Route path="/nodes/:name" component={NodeDetail} />
        </Switch>
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'worker-0' })).toBeInTheDocument();
    });
  });
});
