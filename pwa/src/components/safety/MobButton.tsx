import React from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { activateMob } from '@/store/slices/safetySlice';

/**
 * The man-overboard button: large, red and always on screen, on every page
 * and in fullscreen mode. One tap records the position (R12.1). It sits above
 * the chart's bottom-left corner, which holds the "Not for navigation" note.
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
      className={`fixed left-3 bottom-24 z-[90] w-20 h-20 rounded-full border-4 border-white
        bg-red-600 text-white font-extrabold text-xl shadow-2xl
        hover:bg-red-700 active:scale-95 transition-transform
        focus:outline-none focus:ring-4 focus:ring-red-300
        ${active ? 'ring-4 ring-yellow-300 animate-pulse' : ''}`}
    >
      MOB
    </button>
  );
};
