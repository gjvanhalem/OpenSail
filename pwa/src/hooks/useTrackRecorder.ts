import { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { trackRecorder } from '@/services/TrackRecorder';
import type { RootState } from '@/store';
import type { TracksState } from '@/store/slices/tracksSlice';
import {
  startRecording,
  stopRecording,
  pauseRecording,
  resumeRecording,
  addTrack,
  clearCurrentTrack,
} from '@/store/slices/tracksSlice';

/**
 * Hook to manage track recording with automatic position updates
 */
export function useTrackRecorder() {
  const dispatch = useDispatch();
  const tracksState = useSelector((state: RootState) => state.tracks) as TracksState;
  const { isRecording, isPaused } = tracksState;
  const navigation = useSelector((state: RootState) => state.navigation);

  // Automatically add position points when recording
  useEffect(() => {
    if (!isRecording || isPaused || !navigation.position) {
      return;
    }

    const speed = navigation.speed ?? 0;
    const heading = navigation.heading ?? 0;

    // Add point to track recorder
    trackRecorder.addPoint(navigation.position, speed, heading);
  }, [
    isRecording,
    isPaused,
    navigation.position,
    navigation.speed,
    navigation.heading,
  ]);

  /**
   * Start recording a new track
   */
  const start = useCallback(
    async (name: string) => {
      try {
        const trackId = await trackRecorder.start(name);
        dispatch(startRecording({ id: trackId, name }));
        return trackId;
      } catch (error) {
        console.error('Failed to start track recording:', error);
        throw error;
      }
    },
    [dispatch]
  );

  /**
   * Stop recording and save the track
   */
  const stop = useCallback(async () => {
    try {
      const savedTrack = await trackRecorder.stop();
      if (savedTrack && savedTrack.id) {
        // Convert compressed points to uncompressed for Redux state
        const points = JSON.parse(savedTrack.points.data);
        dispatch(
          addTrack({
            id: savedTrack.id,
            name: savedTrack.name,
            startTime: savedTrack.startTime,
            endTime: savedTrack.endTime,
            distance: savedTrack.distance,
            maxSpeed: savedTrack.maxSpeed,
            avgSpeed: savedTrack.avgSpeed,
            points,
          })
        );
      }
      dispatch(stopRecording());
      return savedTrack;
    } catch (error) {
      console.error('Failed to stop track recording:', error);
      throw error;
    }
  }, [dispatch]);

  /**
   * Pause recording
   */
  const pause = useCallback(() => {
    try {
      trackRecorder.pause();
      dispatch(pauseRecording());
    } catch (error) {
      console.error('Failed to pause track recording:', error);
      throw error;
    }
  }, [dispatch]);

  /**
   * Resume recording
   */
  const resume = useCallback(() => {
    try {
      trackRecorder.resume();
      dispatch(resumeRecording());
    } catch (error) {
      console.error('Failed to resume track recording:', error);
      throw error;
    }
  }, [dispatch]);

  /**
   * Cancel recording without saving
   */
  const cancel = useCallback(() => {
    trackRecorder.pause();
    dispatch(clearCurrentTrack());
  }, [dispatch]);

  /**
   * Get current recording status
   */
  const getStatus = useCallback(() => {
    return trackRecorder.getStatus();
  }, []);

  /**
   * Get current track points
   */
  const getCurrentPoints = useCallback(() => {
    return trackRecorder.getCurrentPoints();
  }, []);

  return {
    isRecording,
    isPaused,
    start,
    stop,
    pause,
    resume,
    cancel,
    getStatus,
    getCurrentPoints,
  };
}
