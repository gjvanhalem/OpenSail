import { useMemo, useState } from 'react';
import {
  getBrowserCapabilities,
  getFeatureSupport,
  hasMinimumRequirements,
  hasDeviceConnectionSupport,
  getBrowserInfo,
  isSecureContext,
  type BrowserCapabilities,
} from '../utils/featureDetection';

export interface CompatibilityStatus {
  capabilities: BrowserCapabilities;
  hasMinimumRequirements: boolean;
  hasDeviceSupport: boolean;
  isSecure: boolean;
  browserInfo: { name: string; version: string };
  warnings: string[];
  criticalIssues: string[];
}

function computeCompatibilityStatus(): CompatibilityStatus {
  const capabilities = getBrowserCapabilities();
  const features = getFeatureSupport();
  const browserInfo = getBrowserInfo();
  const warnings: string[] = [];
  const criticalIssues: string[] = [];

  // Check secure context
  if (!isSecureContext()) {
    criticalIssues.push('App must be accessed via HTTPS');
  }

  // Check critical features
  if (!features.serviceWorker.supported && features.serviceWorker.reason) {
    criticalIssues.push(features.serviceWorker.reason);
  }
  if (!features.indexedDB.supported && features.indexedDB.reason) {
    criticalIssues.push(features.indexedDB.reason);
  }
  if (!features.geolocation.supported && features.geolocation.reason) {
    criticalIssues.push(features.geolocation.reason);
  }

  // Check optional features
  if (!features.webSerial.supported) {
    warnings.push('USB instrument connections not available');
  }
  if (!features.webBluetooth.supported) {
    warnings.push('Bluetooth instrument connections not available');
  }

  return {
    capabilities,
    hasMinimumRequirements: hasMinimumRequirements(),
    hasDeviceSupport: hasDeviceConnectionSupport(),
    isSecure: isSecureContext(),
    browserInfo,
    warnings,
    criticalIssues,
  };
}

/**
 * Hook to check browser compatibility and provide status information.
 * The status is computed once on mount.
 */
export function useCompatibility(): CompatibilityStatus {
  const [status] = useState<CompatibilityStatus>(computeCompatibilityStatus);
  return status;
}

/**
 * Hook to check if a specific feature is supported
 */
export function useFeatureSupport(feature: keyof BrowserCapabilities): boolean {
  return useMemo(() => getBrowserCapabilities()[feature], [feature]);
}
