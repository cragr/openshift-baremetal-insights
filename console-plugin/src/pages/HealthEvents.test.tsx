import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HealthEvents } from './HealthEvents';
import * as api from '../services/api';
import { HealthEvent } from '../types';

jest.mock('../services/api');

// Create timestamps within last 7 days for testing
const recentTimestamp = new Date();
recentTimestamp.setDate(recentTimestamp.getDate() - 1);

const mockEvents: HealthEvent[] = [
  {
    id: '1',
    timestamp: recentTimestamp.toISOString(),
    severity: 'Critical',
    message: 'PSU 1 failed',
    nodeName: 'worker-0',
  },
  {
    id: '2',
    timestamp: recentTimestamp.toISOString(),
    severity: 'Warning',
    message: 'Fan speed high',
    nodeName: 'worker-1',
  },
];

describe('HealthEvents', () => {
  beforeEach(() => {
    (api.getEvents as jest.Mock).mockResolvedValue(mockEvents);
  });

  it('renders title', async () => {
    render(
      <MemoryRouter>
        <HealthEvents />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('Recent Events')).toBeInTheDocument();
    });
  });

  it('displays event message', async () => {
    render(
      <MemoryRouter>
        <HealthEvents />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('PSU 1 failed')).toBeInTheDocument();
    });
  });

  it('displays node name', async () => {
    render(
      <MemoryRouter>
        <HealthEvents />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('worker-0')).toBeInTheDocument();
    });
  });
});
