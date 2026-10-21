import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAppDispatch } from '@/store/hooks';
import { toggleFullscreen } from '@/store/slices/uiSlice';
import { APP_NAME } from '@/utils';
import { Icon } from '@/components/icons';
import { NAV_ITEMS } from './navItems';
import { StatusChip } from './StatusChip';

/**
 * The bar at the top of every screen. On wide screens it holds the tabs; on
 * narrower ones the tabs are in the bottom bar and this only keeps the name,
 * the status and full screen.
 */
export const AppBar: React.FC<{ showTabs: boolean }> = ({ showTabs }) => {
  const dispatch = useAppDispatch();

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 bg-bar px-2 text-bar-ink shadow-lg">
      <Link to="/chart" className="mr-2 flex items-center gap-2 px-2 text-xl font-bold">
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6" aria-hidden="true">
          <path d="M12 2 4 18h8zM13 6v12h7zM2 20h20l-2 2H4z" />
        </svg>
        {APP_NAME}
      </Link>

      {showTabs && (
        <nav aria-label="Main" className="flex flex-1 items-center gap-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex min-h-12 items-center gap-2 rounded-lg px-4 font-semibold transition-colors ${
                  isActive ? 'bg-white/15 text-bar-ink' : 'text-bar-muted hover:bg-white/10'
                }`
              }
            >
              <Icon name={item.icon} className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      )}

      <div className="ml-auto flex items-center gap-1">
        <StatusChip compact={!showTabs} />
        <button
          onClick={() => dispatch(toggleFullscreen())}
          className="grid h-12 w-12 place-items-center rounded-lg hover:bg-white/10"
          aria-label="Toggle fullscreen"
          title="Full screen: hide the bars"
        >
          <Icon name="fullscreen" />
        </button>
      </div>
    </header>
  );
};
