import React, { useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { setSidebarOpen, toggleFullscreen } from '@/store/slices/uiSlice';
import { Navigation } from './Navigation';
import { Sidebar } from './Sidebar';
import { AlertBanner } from '@/components/alerts/AlertBanner';
import { AlarmOverlay } from '@/components/alerts/AlarmOverlay';
import { useAlertMonitor } from '@/hooks/useAlertMonitor';
import { useAlarmOutput } from '@/hooks/useAlarmOutput';
import { useSafetyMonitor } from '@/hooks/useSafetyMonitor';
import { AnchorWatchPanel, MobButton, MobPanel } from '@/components/safety';
import { useRouteNavigation } from '@/hooks/useRouteNavigation';
import { useGpsAutoStart } from '@/hooks/useGpsAutoStart';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const dispatch = useAppDispatch();
  const sidebarOpen = useAppSelector((state) => state.ui.sidebarOpen);
  const sidebarCollapsed = useAppSelector((state) => state.ui.sidebarCollapsed);
  const fullscreenMode = useAppSelector((state) => state.ui.fullscreenMode);
  useAlertMonitor();
  const safetyWatchActive = useSafetyMonitor();
  useAlarmOutput(safetyWatchActive);
  useRouteNavigation();
  useGpsAutoStart();

  // Close the sidebar on a phone-sized screen at start, and when the window shrinks to one.
  // Only then: closing it whenever it opens would make it impossible to open on a phone.
  useEffect(() => {
    const isMobile = () => window.innerWidth < 768;
    let wasMobile = isMobile();
    if (wasMobile) dispatch(setSidebarOpen(false));

    const handleResize = () => {
      const mobile = isMobile();
      if (mobile && !wasMobile) dispatch(setSidebarOpen(false));
      wasMobile = mobile;
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [dispatch]);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-gray-50">
      {/* Navigation - hidden in fullscreen mode */}
      {!fullscreenMode && <Navigation />}

      {/* The navigation bar (with its fullscreen toggle) is hidden in fullscreen mode, so offer a way back */}
      {fullscreenMode && (
        <button
          onClick={() => dispatch(toggleFullscreen())}
          className="fixed top-3 right-3 z-50 p-2 rounded bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition-colors"
          aria-label="Exit fullscreen"
          title="Exit fullscreen"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      <AlertBanner />
      <AlarmOverlay />
      <MobPanel />
      <AnchorWatchPanel />
      <MobButton />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - hidden in fullscreen mode */}
        {!fullscreenMode && <Sidebar />}

        {/* Main content area */}
        <main
          className={`
            flex-1 overflow-auto transition-all duration-300
            ${fullscreenMode ? 'w-full' : ''}
          `}
        >
          {children}
        </main>

        {/* Sidebar overlay for mobile */}
        {sidebarOpen && !sidebarCollapsed && (
          <div
            className="fixed inset-0 bg-black/50 z-30 md:hidden"
            onClick={() => dispatch(setSidebarOpen(false))}
          />
        )}
      </div>
    </div>
  );
};
