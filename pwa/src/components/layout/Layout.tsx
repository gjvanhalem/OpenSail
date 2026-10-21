import React from 'react';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { toggleFullscreen } from '@/store/slices/uiSlice';
import { AppBar } from './AppBar';
import { BottomNav } from './BottomNav';
import { AlertBanner } from '@/components/alerts/AlertBanner';
import { AlarmOverlay } from '@/components/alerts/AlarmOverlay';
import { useAlertMonitor } from '@/hooks/useAlertMonitor';
import { useAlarmOutput } from '@/hooks/useAlarmOutput';
import { useSafetyMonitor } from '@/hooks/useSafetyMonitor';
import { AnchorWatchPanel, MobPanel, SafetyCluster } from '@/components/safety';
import { useRouteNavigation } from '@/hooks/useRouteNavigation';
import { useGpsAutoStart } from '@/hooks/useGpsAutoStart';
import { useBackgroundMode } from '@/hooks/useBackgroundMode';
import { useMediaQuery, WIDE_SCREEN } from '@/hooks/useMediaQuery';
import { useApplyDisplayMode } from '@/hooks/useDisplayMode';
import { Icon } from '@/components/icons';

interface LayoutProps {
  children: React.ReactNode;
}

/**
 * One navigation model (docs/ui-redesign.md): tabs in the top bar on wide
 * screens, a bottom bar below 1024 px, and the safety actions on every page.
 */
export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const dispatch = useAppDispatch();
  const fullscreenMode = useAppSelector((state) => state.ui.fullscreenMode);
  const wide = useMediaQuery(WIDE_SCREEN);
  const night = useApplyDisplayMode();
  useAlertMonitor();
  const safetyWatchActive = useSafetyMonitor();
  useAlarmOutput(safetyWatchActive);
  useRouteNavigation();
  useGpsAutoStart();
  useBackgroundMode();

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-canvas">
      {!fullscreenMode && <AppBar showTabs={wide} night={night} />}

      {/* The bars (with the fullscreen toggle) are hidden in fullscreen mode, so offer a way back */}
      {fullscreenMode && (
        <button
          onClick={() => dispatch(toggleFullscreen())}
          className="fixed top-3 left-1/2 -translate-x-1/2 z-50 grid h-12 w-12 place-items-center rounded-xl bg-bar text-bar-ink shadow-lg"
          aria-label="Exit fullscreen"
          title="Exit fullscreen"
        >
          <Icon name="exitFullscreen" />
        </button>
      )}

      <AlertBanner />
      <AlarmOverlay />
      <MobPanel />
      <AnchorWatchPanel />

      <div className="relative flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-auto">{children}</main>
        <SafetyCluster />
      </div>

      {!fullscreenMode && !wide && <BottomNav />}
    </div>
  );
};
