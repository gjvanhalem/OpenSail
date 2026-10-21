import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setShowAIS, setShowRoutes, setShowTracks } from '@/store/slices/uiSlice';
import { setSettingOptimistic, updateSetting, type SettingUpdate } from '@/store/slices/settingsSlice';
import { Icon } from '@/components/icons';

interface Toggle {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

/**
 * What the chart draws. Seamarks and the inland ENC are saved settings; routes,
 * tracks and AIS targets are for this session.
 */
export const LayersPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const dispatch = useAppDispatch();
  const { showRoutes, showTracks, showAIS } = useAppSelector((state) => state.ui);
  const { showNavigationAids, showDepthContours } = useAppSelector((state) => state.settings.settings);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Shown at once, saved in the background
  const save = (update: SettingUpdate) => {
    dispatch(setSettingOptimistic(update));
    dispatch(updateSetting(update));
  };

  const toggles: Toggle[] = [
    {
      label: 'Seamarks (OpenSeaMap)',
      checked: showNavigationAids,
      onChange: (value) => save({ key: 'showNavigationAids', value }),
    },
    {
      label: 'Inland ENC (Rijkswaterstaat)',
      checked: showDepthContours,
      onChange: (value) => save({ key: 'showDepthContours', value }),
    },
    { label: 'Routes', checked: showRoutes, onChange: (value) => dispatch(setShowRoutes(value)) },
    { label: 'Tracks', checked: showTracks, onChange: (value) => dispatch(setShowTracks(value)) },
    { label: 'AIS targets', checked: showAIS, onChange: (value) => dispatch(setShowAIS(value)) },
  ];

  return (
    <section
      aria-label="Layers"
      className="absolute top-3 right-18 z-20 w-72 max-w-[calc(100%-6rem)] rounded-xl border border-line bg-surface p-4 text-ink shadow-2xl"
    >
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Layers</h2>
        <button
          onClick={onClose}
          aria-label="Close layers"
          className="grid h-11 w-11 place-items-center rounded-lg hover:bg-gray-100"
        >
          <Icon name="close" className="h-5 w-5" />
        </button>
      </div>
      <ul>
        {toggles.map((toggle) => (
          <li key={toggle.label} className="border-t border-line">
            <label className="flex min-h-12 cursor-pointer items-center justify-between gap-3">
              <span>{toggle.label}</span>
              <input
                type="checkbox"
                role="switch"
                checked={toggle.checked}
                onChange={(e) => toggle.onChange(e.target.checked)}
                className="h-6 w-6 accent-[var(--accent)]"
              />
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
};
