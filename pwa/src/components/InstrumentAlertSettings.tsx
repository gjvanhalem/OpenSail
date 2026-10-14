import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setSettingOptimistic, updateSetting } from '@/store/slices/settingsSlice';
import {
  ALERT_VALUES,
  DEFAULT_ALERT_THRESHOLDS,
  type AlertThreshold,
  type AlertValue,
} from '@/store/slices/alertsSlice';
import { useUnits } from '@/hooks/useUnits';
import { ALERT_LABELS } from '@/components/alerts/alertLabels';

/** Min / max alerts per instrument value (R14.5), entered in the user's units */
export const InstrumentAlertSettings: React.FC = () => {
  const dispatch = useAppDispatch();
  const thresholds = useAppSelector((state) => state.settings.settings.alertThresholds);

  const save = (value: AlertValue, changes: Partial<AlertThreshold>) => {
    const current = thresholds?.[value] ?? DEFAULT_ALERT_THRESHOLDS[value];
    const update = {
      key: 'alertThresholds' as const,
      value: { ...DEFAULT_ALERT_THRESHOLDS, ...thresholds, [value]: { ...current, ...changes } },
    };
    // Update the store at once so a quick second edit builds on this one, then persist
    dispatch(setSettingOptimistic(update));
    dispatch(updateSetting(update));
  };

  return (
    <section className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-1">Instrument Alerts</h2>
      <p className="text-sm text-gray-500 mb-4">
        Show an alert when a value goes below its minimum or above its maximum. Leave a limit
        empty to not use it.
      </p>
      <div className="space-y-4">
        {ALERT_VALUES.map((value) => (
          <AlertRow
            key={value}
            value={value}
            threshold={thresholds?.[value] ?? DEFAULT_ALERT_THRESHOLDS[value]}
            onChange={(changes) => save(value, changes)}
          />
        ))}
      </div>
    </section>
  );
};

function AlertRow({
  value,
  threshold,
  onChange,
}: {
  value: AlertValue;
  threshold: AlertThreshold;
  onChange: (changes: Partial<AlertThreshold>) => void;
}) {
  const units = useUnits();
  const { name, quantity, hint } = ALERT_LABELS[value];
  const unit = units.label(quantity);
  const id = `alert-${value}`;

  return (
    <fieldset className="border border-gray-200 rounded-md p-3">
      <legend className="px-1 text-sm font-medium text-gray-700">{name}</legend>
      <label className="flex items-center gap-2 text-sm text-gray-700 mb-2">
        <input
          type="checkbox"
          checked={threshold.enabled}
          onChange={(e) => onChange({ enabled: e.target.checked })}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        {name} alert on
      </label>
      <div className="grid grid-cols-2 gap-3">
        {(['min', 'max'] as const).map((bound) => (
          // Keyed on the unit so the typed text resets when the units change
          <LimitInput
            key={`${bound}-${unit}`}
            id={`${id}-${bound}`}
            label={`${name} ${bound} (${unit})`}
            stored={threshold[bound]}
            disabled={!threshold.enabled}
            toDisplay={(v) => units.toDisplay(quantity, v)}
            fromDisplay={(v) => units.fromDisplay(quantity, v)}
            onChange={(limit) => onChange({ [bound]: limit })}
          />
        ))}
      </div>
      <p className="text-xs text-gray-500 mt-2">{hint}</p>
    </fieldset>
  );
}

function LimitInput({
  id,
  label,
  stored,
  disabled,
  toDisplay,
  fromDisplay,
  onChange,
}: {
  id: string;
  label: string;
  stored: number | null;
  disabled: boolean;
  toDisplay: (value: number) => number;
  fromDisplay: (value: number) => number;
  onChange: (limit: number | null) => void;
}) {
  // Text state, so the field can be empty or half-typed ("2.") while editing
  const [text, setText] = useState(() =>
    stored === null ? '' : String(Number(toDisplay(stored).toFixed(2)))
  );

  return (
    <div>
      <label htmlFor={id} className="block text-xs text-gray-600 mb-1">
        {label}
      </label>
      <input
        id={id}
        type="number"
        step="any"
        min="0"
        value={text}
        disabled={disabled}
        placeholder="none"
        onChange={(e) => {
          setText(e.target.value);
          if (e.target.value.trim() === '') {
            onChange(null);
            return;
          }
          const parsed = parseFloat(e.target.value);
          if (Number.isFinite(parsed) && parsed >= 0) onChange(fromDisplay(parsed));
        }}
        className="w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}
