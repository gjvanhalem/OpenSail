import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ConnectionStatus } from '../ConnectionStatus';

function setOnline(online: boolean) {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(online);
  window.dispatchEvent(new Event(online ? 'online' : 'offline'));
}

afterEach(() => vi.restoreAllMocks());

describe('ConnectionStatus', () => {
  it('shows nothing while online', () => {
    setOnline(true);
    render(<ConnectionStatus />);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('says the app is offline and comes and goes with the connection', () => {
    setOnline(true);
    render(<ConnectionStatus />);
    act(() => setOnline(false));
    expect(screen.getByRole('status')).toHaveTextContent(/Offline/);
    act(() => setOnline(true));
    expect(screen.queryByRole('status')).toBeNull();
  });
});
