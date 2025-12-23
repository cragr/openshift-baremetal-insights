import * as React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NamespaceDropdown } from './NamespaceDropdown';
import { getNamespaces } from '../services/api';

jest.mock('../services/api');

describe('NamespaceDropdown', () => {
  beforeEach(() => {
    (getNamespaces as jest.Mock).mockResolvedValue(['ns-a', 'ns-b']);
  });

  it('renders with All Namespaces by default', async () => {
    render(<NamespaceDropdown selected="" onSelect={jest.fn()} />);
    await waitFor(() => {
      expect(screen.getByText('All Namespaces')).toBeInTheDocument();
    });
  });

  it('displays selected namespace', async () => {
    render(<NamespaceDropdown selected="ns-a" onSelect={jest.fn()} />);
    await waitFor(() => {
      expect(screen.getByText('ns-a')).toBeInTheDocument();
    });
  });

  it('calls onSelect with empty string when All Namespaces is selected', async () => {
    const onSelect = jest.fn();
    render(<NamespaceDropdown selected="ns-a" onSelect={onSelect} />);

    await waitFor(() => {
      fireEvent.click(screen.getByRole('button'));
    });

    fireEvent.click(screen.getByText('All Namespaces'));
    expect(onSelect).toHaveBeenCalledWith('');
  });

  it('calls onSelect with namespace when selected', async () => {
    const onSelect = jest.fn();
    render(<NamespaceDropdown selected="" onSelect={onSelect} />);

    await waitFor(() => {
      fireEvent.click(screen.getByRole('button'));
    });

    await waitFor(() => {
      fireEvent.click(screen.getByText('ns-a'));
    });
    expect(onSelect).toHaveBeenCalledWith('ns-a');
  });
});
