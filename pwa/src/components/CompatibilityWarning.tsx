import React, { useState } from 'react';
import {
  getFeatureSupport,
  getBrowserInfo,
  getRecommendedBrowser,
  isSecureContext,
} from '../utils/featureDetection';
import { NATIVE_BUILD } from '../platform/platform';

// Remembers that the user dismissed the (non-critical) warnings, so the
// banner does not cover the navigation bar on every visit
export const COMPATIBILITY_WARNING_DISMISSED_KEY = 'opensail.compatibilityWarningDismissed';

function readDismissed(): boolean {
  try {
    return localStorage.getItem(COMPATIBILITY_WARNING_DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

function storeDismissed(): void {
  try {
    localStorage.setItem(COMPATIBILITY_WARNING_DISMISSED_KEY, '1');
  } catch {
    // Storage unavailable (private mode): dismissal lasts for this session only
  }
}

interface CompatibilityWarningProps {
  onDismiss?: () => void;
}

interface CompatibilityIssues {
  warnings: string[];
  criticalIssues: string[];
}

function computeCompatibilityIssues(): CompatibilityIssues {
  // The Windows and Android apps aren't browsers: advice to switch browser doesn't apply, and
  // what they offer instead of Web Serial or Bluetooth (direct TCP) is part of the app
  if (NATIVE_BUILD) return { warnings: [], criticalIssues: [] };

  const features = getFeatureSupport();
  const browserInfo = getBrowserInfo();
  const newWarnings: string[] = [];
  const newCriticalIssues: string[] = [];

  // Check secure context first
  if (!isSecureContext()) {
    newCriticalIssues.push(
      'This app must be accessed via HTTPS for PWA features to work. Please use https:// instead of http://'
    );
  }

  // Check critical features
  if (!features.serviceWorker.supported) {
    newCriticalIssues.push(features.serviceWorker.reason || 'Service Worker not supported');
  }

  if (!features.indexedDB.supported) {
    newCriticalIssues.push(features.indexedDB.reason || 'IndexedDB not supported');
  }

  if (!features.geolocation.supported) {
    newCriticalIssues.push(features.geolocation.reason || 'Geolocation not supported');
  }

  // Check optional but important features
  if (!features.webSerial.supported) {
    newWarnings.push(
      'USB instrument connections not available. Use Chrome or Edge for USB NMEA device support.'
    );
  }

  if (!features.webBluetooth.supported) {
    newWarnings.push(
      'Bluetooth instrument connections not available. Use Chrome, Edge, or Safari 15.4+ for Bluetooth support.'
    );
  }

  if (!features.notifications.supported) {
    newWarnings.push('Browser notifications not available. You may miss important alerts.');
  }

  // Add browser-specific recommendations
  if (browserInfo.name === 'Firefox') {
    newWarnings.push(
      'Firefox does not support USB or Bluetooth instrument connections. For full functionality, use Chrome or Edge.'
    );
  } else if (browserInfo.name === 'Safari') {
    newWarnings.push(
      'Safari has limited Bluetooth support and no USB support. For full functionality, use Chrome or Edge.'
    );
  }

  return { warnings: newWarnings, criticalIssues: newCriticalIssues };
}

export const CompatibilityWarning: React.FC<CompatibilityWarningProps> = ({ onDismiss }) => {
  // Compatibility issues are computed once on mount
  const [{ warnings, criticalIssues }] = useState(computeCompatibilityIssues);
  // Auto-dismiss if no issues; warnings stay dismissed once dismissed,
  // critical issues are shown on every load
  const [dismissed, setDismissed] = useState(
    () =>
      (warnings.length === 0 && criticalIssues.length === 0) ||
      (criticalIssues.length === 0 && readDismissed())
  );

  const handleDismiss = () => {
    setDismissed(true);
    if (criticalIssues.length === 0) {
      storeDismissed();
    }
    onDismiss?.();
  };

  if (dismissed) {
    return null;
  }

  const hasIssues = warnings.length > 0 || criticalIssues.length > 0;

  if (!hasIssues) {
    return null;
  }

  const browserInfo = getBrowserInfo();
  const missingFeatures = [];
  const features = getFeatureSupport();
  
  if (!features.webSerial.supported) missingFeatures.push('webSerial');
  if (!features.webBluetooth.supported) missingFeatures.push('webBluetooth');

  return (
    <div className="fixed top-0 left-0 right-0 z-50 p-4" data-testid="compatibility-warning">
      <div
        className={`max-w-4xl mx-auto rounded-lg shadow-lg p-6 ${
          criticalIssues.length > 0
            ? 'bg-red-50 border-2 border-red-500'
            : 'bg-yellow-50 border-2 border-yellow-500'
        }`}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3
              className={`text-lg font-semibold mb-2 ${
                criticalIssues.length > 0 ? 'text-red-900' : 'text-yellow-900'
              }`}
            >
              {criticalIssues.length > 0 ? '⚠️ Critical Compatibility Issues' : '⚠️ Browser Compatibility Notice'}
            </h3>

            <p className="text-sm text-gray-700 mb-3">
              <strong>Browser:</strong> {browserInfo.name} {browserInfo.version}
            </p>

            {criticalIssues.length > 0 && (
              <div className="mb-4">
                <p className="font-semibold text-red-900 mb-2">Critical Issues:</p>
                <ul className="list-disc list-inside space-y-1">
                  {criticalIssues.map((issue, index) => (
                    <li key={index} className="text-sm text-red-800">
                      {issue}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {warnings.length > 0 && (
              <div className="mb-4">
                <p className="font-semibold text-yellow-900 mb-2">
                  {criticalIssues.length > 0 ? 'Additional Warnings:' : 'Warnings:'}
                </p>
                <ul className="list-disc list-inside space-y-1">
                  {warnings.map((warning, index) => (
                    <li key={index} className="text-sm text-yellow-800">
                      {warning}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="bg-surface/50 rounded p-3 mt-3">
              <p className="text-sm font-semibold text-gray-900 mb-1">Recommendation:</p>
              <p className="text-sm text-gray-800">{getRecommendedBrowser(missingFeatures)}</p>
            </div>

            {criticalIssues.length === 0 && (
              <div className="mt-3">
                <p className="text-xs text-gray-600">
                  Core navigation features will work, but some advanced functionality may be limited.
                </p>
              </div>
            )}
          </div>

          {criticalIssues.length === 0 && (
            <button
              onClick={handleDismiss}
              className="ml-4 text-yellow-900 hover:text-yellow-700 font-bold text-xl"
              aria-label="Dismiss warning"
            >
              ×
            </button>
          )}
        </div>

        {criticalIssues.length > 0 && (
          <div className="mt-4 pt-4 border-t border-red-300">
            <p className="text-sm text-red-900 font-semibold">
              The app cannot function properly with these critical issues. Please address them to continue.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompatibilityWarning;
