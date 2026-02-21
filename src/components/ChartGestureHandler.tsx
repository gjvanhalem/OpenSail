import React, { useCallback, useRef } from 'react';
import { GestureResponderEvent, PanResponder, View } from 'react-native';

export interface GestureState {
  scale: number;
  rotation: number;
  translationX: number;
  translationY: number;
}

export interface ChartGestureHandlerProps {
  onPinchGesture?: (scale: number) => void;
  onRotateGesture?: (rotation: number) => void;
  onPanGesture?: (x: number, y: number) => void;
  children: React.ReactNode;
}

/**
 * ChartGestureHandler provides optimized touch gesture handling for the chart display.
 * Handles pinch-to-zoom, rotation, and pan gestures with performance optimization.
 */
const ChartGestureHandler: React.FC<ChartGestureHandlerProps> = ({
  onPinchGesture,
  onRotateGesture,
  onPanGesture,
  children,
}) => {
  const gestureState = useRef<GestureState>({
    scale: 1,
    rotation: 0,
    translationX: 0,
    translationY: 0,
  });

  const initialDistance = useRef<number>(0);
  const initialAngle = useRef<number>(0);
  const lastUpdateTime = useRef<number>(0);

  // Throttle gesture updates to maintain 60 FPS
  const THROTTLE_MS = 16; // ~60 FPS

  const shouldUpdate = useCallback(() => {
    const now = Date.now();
    if (now - lastUpdateTime.current >= THROTTLE_MS) {
      lastUpdateTime.current = now;
      return true;
    }
    return false;
  }, []);

  // Calculate distance between two touch points
  const getDistance = useCallback(
    (touches: GestureResponderEvent['nativeEvent']['touches']) => {
      if (touches.length < 2) return 0;
      const dx = touches[0].pageX - touches[1].pageX;
      const dy = touches[0].pageY - touches[1].pageY;
      return Math.sqrt(dx * dx + dy * dy);
    },
    []
  );

  // Calculate angle between two touch points
  const getAngle = useCallback(
    (touches: GestureResponderEvent['nativeEvent']['touches']) => {
      if (touches.length < 2) return 0;
      const dx = touches[1].pageX - touches[0].pageX;
      const dy = touches[1].pageY - touches[0].pageY;
      return (Math.atan2(dy, dx) * 180) / Math.PI;
    },
    []
  );

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const touches = evt.nativeEvent.touches;
        if (touches.length === 2) {
          initialDistance.current = getDistance(touches);
          initialAngle.current = getAngle(touches);
        }
      },
      onPanResponderMove: (evt, gestureState) => {
        if (!shouldUpdate()) return;

        const touches = evt.nativeEvent.touches;

        if (touches.length === 2) {
          // Handle pinch-to-zoom
          const currentDistance = getDistance(touches);
          if (initialDistance.current > 0) {
            const scale = currentDistance / initialDistance.current;
            if (onPinchGesture && Math.abs(scale - 1) > 0.01) {
              onPinchGesture(scale);
            }
          }

          // Handle rotation
          const currentAngle = getAngle(touches);
          const rotation = currentAngle - initialAngle.current;
          if (onRotateGesture && Math.abs(rotation) > 1) {
            onRotateGesture(rotation);
          }
        } else if (touches.length === 1) {
          // Handle pan
          if (onPanGesture) {
            onPanGesture(gestureState.dx, gestureState.dy);
          }
        }
      },
      onPanResponderRelease: () => {
        initialDistance.current = 0;
        initialAngle.current = 0;
      },
    })
  ).current;

  return <View {...panResponder.panHandlers}>{children}</View>;
};

export default ChartGestureHandler;
