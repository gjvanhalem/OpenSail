import React, { useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { setSidebarOpen } from '@/store/slices/uiSlice';
import { Navigation } from './Navigation';
import { Sidebar } from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const dispatch = useAppDispatch();
  const sidebarOpen = useAppSelector((state) => state.ui.sidebarOpen);
  const sidebarCollapsed = useAppSelector((state) => state.ui.sidebarCollapsed);
  const fullscreenMode = useAppSelector((state) => state.ui.fullscreenMode);

  // Handle responsive behavior - close sidebar on mobile by default
  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 768;
      if (isMobile && sidebarOpen) {
        dispatch(setSidebarOpen(false));
      }
    };

    // Set initial state
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [dispatch, sidebarOpen]);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-gray-50">
      {/* Navigation - hidden in fullscreen mode */}
      {!fullscreenMode && <Navigation />}

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
            className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
            onClick={() => dispatch(setSidebarOpen(false))}
          />
        )}
      </div>
    </div>
  );
};
