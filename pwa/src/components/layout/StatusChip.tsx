import React from 'react';
import { Link } from 'react-router-dom';
import { useAppSelector } from '@/store/hooks';
import type { ConnectionType } from '@/store/slices/instrumentsSlice';

const CONNECTION_NAMES: Record<ConnectionType, string> = {
  serial: 'USB',
  bluetooth: 'Bluetooth',
  network: 'Wi-Fi',
  stub: 'Simulator',
};

/**
 * Where the boat's data comes from, at a glance: the instrument connection and
 * whether there is a position. Green with a position, amber without. Opens Instruments.
 */
export const StatusChip: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const connection = useAppSelector((state) =>
    state.instruments.connections.find((c) => c.status === 'connected')
  );
  const position = useAppSelector((state) => state.navigation.position);
  const source = useAppSelector((state) => state.navigation.sources.position);

  const parts = [
    connection ? CONNECTION_NAMES[connection.type] : null,
    position
      ? `${source === 'instrument' ? 'Position' : 'GPS'}${position.accuracy > 0 ? ` ±${Math.round(position.accuracy)} m` : ''}`
      : 'No position',
  ].filter(Boolean);
  const label = parts.join(' · ');

  return (
    <Link
      to="/instruments"
      aria-label={`Status: ${label}`}
      title={label}
      className="flex min-h-12 items-center gap-2 rounded-lg px-2 text-sm text-bar-muted hover:bg-white/10"
    >
      <span
        className={`h-2.5 w-2.5 shrink-0 rounded-full ${position ? 'bg-green-500' : 'bg-amber-400'}`}
        aria-hidden="true"
      />
      {!compact && <span className="whitespace-nowrap">{label}</span>}
    </Link>
  );
};
