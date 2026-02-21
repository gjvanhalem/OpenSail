import { useAppSelector } from '@/store/hooks';

/**
 * Example component demonstrating Redux state usage
 * Shows current navigation status from the Redux store
 */
export function NavigationStatus() {
  const position = useAppSelector((state) => state.navigation.position);
  const speed = useAppSelector((state) => state.navigation.speed);
  const heading = useAppSelector((state) => state.navigation.heading);
  const isGPSActive = useAppSelector((state) => state.navigation.isGPSActive);

  return (
    <div className="p-4 bg-gray-100 rounded-lg">
      <h3 className="text-lg font-semibold mb-2">Navigation Status</h3>
      
      <div className="space-y-1 text-sm">
        <div>
          <span className="font-medium">GPS:</span>{' '}
          <span className={isGPSActive ? 'text-green-600' : 'text-red-600'}>
            {isGPSActive ? 'Active' : 'Inactive'}
          </span>
        </div>
        
        {position && (
          <>
            <div>
              <span className="font-medium">Position:</span>{' '}
              {position.latitude.toFixed(6)}°, {position.longitude.toFixed(6)}°
            </div>
            <div>
              <span className="font-medium">Accuracy:</span> {position.accuracy.toFixed(1)}m
            </div>
          </>
        )}
        
        {speed !== null && (
          <div>
            <span className="font-medium">Speed:</span> {speed.toFixed(1)} kts
          </div>
        )}
        
        {heading !== null && (
          <div>
            <span className="font-medium">Heading:</span> {heading.toFixed(0)}°
          </div>
        )}
      </div>
    </div>
  );
}
