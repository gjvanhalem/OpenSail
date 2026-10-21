import React from 'react';
import { NavLink } from 'react-router-dom';
import { Icon } from '@/components/icons';
import { NAV_ITEMS } from './navItems';

/** The tabs on phones and portrait tablets, within thumb reach */
export const BottomNav: React.FC = () => (
  <nav
    aria-label="Main"
    className="flex shrink-0 bg-bar pb-[env(safe-area-inset-bottom)] text-bar-ink"
  >
    {NAV_ITEMS.map((item) => (
      <NavLink
        key={item.path}
        to={item.path}
        className={({ isActive }) =>
          `flex min-h-15 flex-1 flex-col items-center justify-center gap-0.5 text-xs font-semibold transition-colors ${
            isActive ? 'bg-white/15 text-bar-ink' : 'text-bar-muted hover:bg-white/10'
          }`
        }
      >
        <Icon name={item.icon} className="h-6 w-6" />
        {item.label}
      </NavLink>
    ))}
  </nav>
);
