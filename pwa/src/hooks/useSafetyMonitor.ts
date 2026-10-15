import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fixMobPosition, restoreSafety } from '@/store/slices/safetySlice';

/**
 * Keep the safety features running: restore a MOB that was active when the
 * app closed, and record the MOB spot from the first fix when MOB was pressed
 * without one. Mount once, in the app layout. Returns whether a watch is
 * active, so the screen is kept on.
 */
export function useSafetyMonitor(): boolean {
  const dispatch = useAppDispatch();
  const position = useAppSelector((state) => state.navigation.position);
  const mob = useAppSelector((state) => state.safety.mob);
  const mobWaitingForFix = mob !== null && mob.position === null;

  useEffect(() => {
    void dispatch(restoreSafety());
  }, [dispatch]);

  useEffect(() => {
    if (mobWaitingForFix && position) dispatch(fixMobPosition(position));
  }, [dispatch, mobWaitingForFix, position]);

  return mob !== null;
}
