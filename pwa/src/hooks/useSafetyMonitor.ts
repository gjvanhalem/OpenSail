import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fixMobPosition, restoreSafety, runAnchorCheck } from '@/store/slices/safetySlice';
import { ANCHOR_CHECK_INTERVAL_MS } from '@/utils/safety';

/**
 * Keep the safety features running: restore a MOB or anchor watch that was
 * active when the app closed, record the MOB spot from the first fix when MOB
 * was pressed without one, and check the anchor with every fix and at least
 * every 10 seconds (R8.5). Mount once, in the app layout. Returns whether a
 * MOB or anchor watch is active, so the screen is kept on.
 */
export function useSafetyMonitor(): boolean {
  const dispatch = useAppDispatch();
  const position = useAppSelector((state) => state.navigation.position);
  const mob = useAppSelector((state) => state.safety.mob);
  const anchorWatchId = useAppSelector((state) => state.safety.anchor?.id ?? null);
  const mobWaitingForFix = mob !== null && mob.position === null;

  useEffect(() => {
    void dispatch(restoreSafety());
  }, [dispatch]);

  useEffect(() => {
    if (mobWaitingForFix && position) dispatch(fixMobPosition(position));
  }, [dispatch, mobWaitingForFix, position]);

  // Every new fix
  useEffect(() => {
    if (anchorWatchId) dispatch(runAnchorCheck(Date.now()));
  }, [dispatch, anchorWatchId, position]);

  // ...and on a timer, which also notices a GPS that went quiet
  useEffect(() => {
    if (!anchorWatchId) return;
    const timer = setInterval(
      () => dispatch(runAnchorCheck(Date.now())),
      ANCHOR_CHECK_INTERVAL_MS / 2
    );
    return () => clearInterval(timer);
  }, [dispatch, anchorWatchId]);

  return mob !== null || anchorWatchId !== null;
}
