import React from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { activateMob } from '@/store/slices/safetySlice';

/**
 * The man-overboard button: large, red and always on screen, on every page
 * and in fullscreen mode (it sits in the SafetyCluster, above the chart's bottom-left notes). One tap records the position (R12.1).
 */
export const MobButton: React.FC = () => {
  const dispatch = useAppDispatch();
  const active = useAppSelector((state) => state.safety.mob !== null);

  return (
    <button
      onClick={() => dispatch(activateMob())}
      aria-label="Man overboard"
      aria-pressed={active}
      title={active ? 'Man overboard active' : 'Man overboard: mark this position'}
      className={`w-[72px] h-[72px] rounded-full border-4 border-white
        bg-red-600 text-white font-extrabold text-xl shadow-2xl
        hover:bg-red-700 active:scale-95 transition-transform
        focus:outline-none focus:ring-4 focus:ring-red-300
        ${active ? 'ring-4 ring-yellow-300 animate-pulse' : ''}`}
    >
      MOB
    </button>
  );
};
