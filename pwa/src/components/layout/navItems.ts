import type { IconName } from '@/components/icons';

/**
 * The app's five destinations, one place for each function (docs/ui-redesign.md).
 * The logbook is left out until it is built; /logbook still works.
 */
export const NAV_ITEMS: { path: string; label: string; icon: IconName }[] = [
  { path: '/chart', label: 'Chart', icon: 'chart' },
  { path: '/routes', label: 'Routes', icon: 'routes' },
  { path: '/tracks', label: 'Tracks', icon: 'tracks' },
  { path: '/instruments', label: 'Instruments', icon: 'instruments' },
  { path: '/settings', label: 'Settings', icon: 'settings' },
];
