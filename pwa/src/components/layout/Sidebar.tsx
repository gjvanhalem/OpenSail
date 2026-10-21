import React from 'react';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { toggleSidebarCollapsed, setSidebarOpen } from '@/store/slices/uiSlice';
import { activateMob, setAnchorPanelOpen } from '@/store/slices/safetySlice';

export const Sidebar: React.FC = () => {
  const dispatch = useAppDispatch();
  const sidebarOpen = useAppSelector((state) => state.ui.sidebarOpen);
  const sidebarCollapsed = useAppSelector((state) => state.ui.sidebarCollapsed);

  if (!sidebarOpen) {
    return null;
  }

  return (
    <>
      <aside
        className={`
          bg-surface border-r border-gray-200 shadow-lg
          transition-all duration-300 ease-in-out
          ${sidebarCollapsed ? 'w-16' : 'w-64'}
          fixed md:relative h-full z-40
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            {!sidebarCollapsed && (
              <h2 className="text-lg font-semibold text-gray-800">Tools</h2>
            )}
            <button
              onClick={() => dispatch(toggleSidebarCollapsed())}
              className="p-2 rounded hover:bg-gray-100 transition-colors"
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <svg
                className={`w-5 h-5 text-gray-600 transition-transform ${
                  sidebarCollapsed ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                />
              </svg>
            </button>
          </div>

          {/* Sidebar content */}
          <div className="flex-1 overflow-y-auto p-4">
            {sidebarCollapsed ? (
              <div className="flex flex-col space-y-4">
                <SidebarIconButton icon="🧭" title="Route Planner" />
                <SidebarIconButton icon="📍" title="Waypoints" />
                <SidebarIconButton icon="🎯" title="Track Recording" />
                <SidebarIconButton icon="🚢" title="AIS Targets" />
                <SidebarIconButton icon="📊" title="Instruments" />
              </div>
            ) : (
              <div className="space-y-2">
                <SidebarButton icon="🧭" label="Route Planner" />
                <SidebarButton icon="📍" label="Waypoints" />
                <SidebarButton icon="🎯" label="Track Recording" />
                <SidebarButton icon="🚢" label="AIS Targets" />
                <SidebarButton icon="📊" label="Instruments" />
                
                <div className="pt-4 mt-4 border-t border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-600 mb-2">Quick Actions</h3>
                  <SidebarButton icon="📥" label="Download Charts" />
                  <SidebarButton
                    icon="⚓"
                    label="Anchor Watch"
                    onClick={() => dispatch(setAnchorPanelOpen(true))}
                  />
                  <SidebarButton icon="🆘" label="Man Overboard" onClick={() => dispatch(activateMob())} />
                </div>
              </div>
            )}
          </div>

          {/* Sidebar footer - close button for mobile */}
          <div className="md:hidden p-4 border-t border-gray-200">
            <button
              onClick={() => dispatch(setSidebarOpen(false))}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

interface SidebarButtonProps {
  icon: string;
  label: string;
  onClick?: () => void;
}

const SidebarButton: React.FC<SidebarButtonProps> = ({ icon, label, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center space-x-3 px-3 py-2 rounded hover:bg-gray-100 transition-colors text-left"
    >
      <span className="text-xl">{icon}</span>
      <span className="text-sm text-gray-700">{label}</span>
    </button>
  );
};

interface SidebarIconButtonProps {
  icon: string;
  title: string;
  onClick?: () => void;
}

const SidebarIconButton: React.FC<SidebarIconButtonProps> = ({ icon, title, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-center p-2 rounded hover:bg-gray-100 transition-colors"
      title={title}
      aria-label={title}
    >
      <span className="text-2xl">{icon}</span>
    </button>
  );
};
