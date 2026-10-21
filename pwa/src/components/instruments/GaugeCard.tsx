import React from 'react';
import type { ActiveAlert } from '@/store/slices/alertsSlice';
import { GAUGE_ALERT_CLASSES } from '@/hooks/useGaugeAlert';
import { GaugeAlert } from '@/components/alerts/GaugeAlert';

interface GaugeCardProps {
  /** What the gauge shows: SPEED, DEPTH, ... */
  title: string;
  /** What the value is measured against: STW, APPARENT, TRUE, ... */
  reference?: string;
  alert?: ActiveAlert;
  /** Secondary values under the gauge */
  footer?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

/**
 * The card every instrument gauge sits in: the name top left, the reference
 * top right, the gauge, then a row of secondary values. Red ring in alarm.
 */
export const GaugeCard: React.FC<GaugeCardProps> = ({
  title,
  reference,
  alert,
  footer,
  className = '',
  children,
}) => (
  <section
    aria-label={title}
    className={`@container flex flex-col rounded-2xl bg-slate-900 px-3 pt-3 pb-3 sm:px-4 sm:pb-4 text-slate-50 ${alert ? GAUGE_ALERT_CLASSES : ''} ${className}`}
  >
    <div className="flex flex-wrap justify-between gap-x-2 text-xs font-semibold tracking-widest text-slate-400">
      <h3>{title}</h3>
      {reference && <span>{reference}</span>}
    </div>
    <div className="flex flex-1 flex-col items-center justify-center">{children}</div>
    {footer && (
      <div className="mt-2 flex flex-wrap justify-between gap-x-3 text-xs @[14rem]:text-sm text-slate-400 tabular-nums">
        {footer}
      </div>
    )}
    <GaugeAlert alert={alert} />
  </section>
);

/** A label with its value in the gauge footer, e.g. "SOG 6.2 kn" */
export const FooterValue: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <span>
    {label} <b className="font-semibold text-slate-50">{children}</b>
  </span>
);

/** SVG colours of the gauges, matching the card classes above */
export const GAUGE_COLORS = {
  ink: '#f8fafc',
  muted: '#94a3b8',
  track: '#1e293b',
  accent: '#38bdf8',
  port: '#ef4444',
  starboard: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
} as const;
