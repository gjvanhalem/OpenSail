import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChartRegionList } from '../ChartRegionList';
import type { CachedRegion } from '@/store/slices/chartCacheSlice';

const region: CachedRegion = {
  id: 'r1',
  name: 'Stavoren',
  bounds: { north: 53, south: 52.8, east: 5.4, west: 5.2 },
  zoomLevels: [11, 12, 13],
  tileCount: 300,
  sizeBytes: 2 * 1024 * 1024,
  createdAt: new Date('2026-10-15'),
  editionDate: '2026-08-18',
};

const update = {
  regionId: 'r1',
  encRegionId: 'nl-inland',
  encRegionName: 'Nederland',
  installedEdition: '2026-08-18',
  availableEdition: '2026-10-05',
};

function setup(props: Partial<React.ComponentProps<typeof ChartRegionList>> = {}) {
  const onUpdate = vi.fn();
  const onDelete = vi.fn();
  render(
    <ChartRegionList
      regions={[region]}
      updates={[]}
      busyRegionIds={[]}
      online
      onUpdate={onUpdate}
      onDelete={onDelete}
      {...props}
    />
  );
  return { onUpdate, onDelete };
}

describe('ChartRegionList', () => {
  it('shows size, zoom levels and the edition date', () => {
    setup();
    expect(screen.getByText('2.00 MB (300 tiles)')).toBeInTheDocument();
    expect(screen.getByText('11, 12, 13')).toBeInTheDocument();
    expect(screen.getByTestId('region-edition')).toHaveTextContent('2026-08-18');
  });

  it('offers an update when a newer edition is available, only online', () => {
    const { onUpdate } = setup({ updates: [update] });
    expect(screen.getByText('Update available')).toBeInTheDocument();
    expect(screen.getByText(/Nederland: edition 2026-10-05/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Update' }));
    expect(onUpdate).toHaveBeenCalledWith('r1');
  });

  it('disables updating offline', () => {
    setup({ updates: [update], online: false });
    expect(screen.getByRole('button', { name: 'Update' })).toBeDisabled();
  });

  it('asks before deleting a region', () => {
    const { onDelete } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Delete Stavoren' }));
    fireEvent.click(screen.getByRole('button', { name: 'Keep' }));
    expect(onDelete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Delete Stavoren' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes, delete' }));
    expect(onDelete).toHaveBeenCalledWith('r1');
  });
});
