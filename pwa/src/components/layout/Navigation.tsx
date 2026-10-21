import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { toggleSidebar, toggleFullscreen } from '@/store/slices/uiSlice';
import { APP_NAME } from '@/utils';
import { Icon, type IconName } from '@/components/icons';

export const Navigation: React.FC = () => {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const fullscreenMode = useAppSelector((state) => state.ui.fullscreenMode);

  const navItems: { path: string; label: string; icon: IconName }[] = [
    { path: '/chart', label: 'Chart', icon: 'chart' },
    { path: '/routes', label: 'Routes', icon: 'routes' },
    { path: '/tracks', label: 'Tracks', icon: 'tracks' },
    { path: '/logbook', label: 'Logbook', icon: 'logbook' },
    { path: '/instruments', label: 'Instruments', icon: 'instruments' },
    { path: '/settings', label: 'Settings', icon: 'settings' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="bg-bar text-bar-ink shadow-lg">
      <div className="px-2 py-1">
        <div className="flex items-center justify-between">
          {/* Left section - Menu toggle and brand */}
          <div className="flex items-center space-x-4">
            <button
              onClick={() => dispatch(toggleSidebar())}
              className="w-12 h-12 grid place-items-center rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Toggle sidebar"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>

            <Link to="/chart" className="text-xl font-bold hover:text-blue-100 transition-colors">
              {APP_NAME}
            </Link>
          </div>

          {/* Center section - Desktop navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                aria-label={item.label}
                title={item.label}
                className={`
                  min-h-12 min-w-12 px-3 lg:px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors
                  ${
                    isActive(item.path)
                      ? 'bg-white/15 font-semibold'
                      : 'hover:bg-white/10'
                  }
                `}
              >
                <Icon name={item.icon} className="w-5 h-5" />
                {/* Icons only on narrow tablets, where six labels don't fit */}
                <span className="hidden lg:inline">{item.label}</span>
              </Link>
            ))}
          </div>

          {/* Right section - Actions */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => dispatch(toggleFullscreen())}
              className="w-12 h-12 grid place-items-center rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Toggle fullscreen"
              title={fullscreenMode ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {fullscreenMode ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                  />
                )}
              </svg>
            </button>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden w-12 h-12 grid place-items-center rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Toggle mobile menu"
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {mobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div id="mobile-menu" className="md:hidden mt-3 pt-3 border-t border-white/20">
            <div className="flex flex-col space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`
                    min-h-12 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors
                    ${
                      isActive(item.path)
                        ? 'bg-white/15 font-semibold'
                        : 'hover:bg-white/10'
                    }
                  `}
                >
                  <Icon name={item.icon} className="w-5 h-5" />
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};
