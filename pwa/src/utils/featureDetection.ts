/**
 * Browser Feature Detection Utility
 * 
 * Detects support for critical PWA and device APIs across different browsers.
 * Used to provide appropriate warnings and fallback options to users.
 */

export interface BrowserCapabilities {
  serviceWorker: boolean;
  indexedDB: boolean;
  webSerial: boolean;
  webBluetooth: boolean;
  geolocation: boolean;
  notifications: boolean;
  pwaInstallable: boolean;
}

export interface FeatureSupport {
  supported: boolean;
  reason?: string;
}

/**
 * Detect Web Serial API support
 * Required for USB instrument connections (NMEA devices)
 * Supported: Chrome 89+, Edge 89+
 */
export function detectWebSerial(): FeatureSupport {
  if ('serial' in navigator) {
    return { supported: true };
  }
  return {
    supported: false,
    reason: 'Web Serial API not available. USB instrument connections require Chrome or Edge browser.',
  };
}

/**
 * Detect Web Bluetooth API support
 * Required for Bluetooth instrument connections
 * Supported: Chrome 89+, Edge 89+, Safari 15.4+ (limited)
 */
export function detectWebBluetooth(): FeatureSupport {
  if ('bluetooth' in navigator) {
    return { supported: true };
  }
  return {
    supported: false,
    reason: 'Web Bluetooth API not available. Bluetooth instrument connections require Chrome, Edge, or Safari 15.4+.',
  };
}

/**
 * Detect Service Worker support
 * Required for offline functionality and PWA features
 * Supported: All modern browsers
 */
export function detectServiceWorker(): FeatureSupport {
  if ('serviceWorker' in navigator) {
    return { supported: true };
  }
  return {
    supported: false,
    reason: 'Service Workers not supported. Offline functionality will not work. Please update your browser.',
  };
}

/**
 * Detect IndexedDB support
 * Required for local data storage (routes, tracks, charts)
 * Supported: All modern browsers
 */
export function detectIndexedDB(): FeatureSupport {
  if ('indexedDB' in window) {
    return { supported: true };
  }
  return {
    supported: false,
    reason: 'IndexedDB not supported. Local data storage will not work. Please update your browser.',
  };
}

/**
 * Detect Geolocation API support
 * Required for GPS position tracking
 * Supported: All modern browsers
 */
export function detectGeolocation(): FeatureSupport {
  if ('geolocation' in navigator) {
    return { supported: true };
  }
  return {
    supported: false,
    reason: 'Geolocation API not supported. GPS position tracking will not work.',
  };
}

/**
 * Detect Notifications API support
 * Used for alerts and warnings
 * Supported: All modern browsers
 */
export function detectNotifications(): FeatureSupport {
  if ('Notification' in window) {
    return { supported: true };
  }
  return {
    supported: false,
    reason: 'Notifications API not supported. You will not receive alerts.',
  };
}

/**
 * Detect PWA installability
 * Checks if the app can be installed as a standalone PWA
 */
export function detectPWAInstallable(): FeatureSupport {
  // Check for beforeinstallprompt event support
  const hasInstallPrompt = 'onbeforeinstallprompt' in window;
  
  // Check for iOS standalone mode
  const isIOSStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  
  // Check if already installed
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  
  if (hasInstallPrompt || isIOSStandalone || isStandalone) {
    return { supported: true };
  }
  
  return {
    supported: false,
    reason: 'PWA installation may not be available on this browser.',
  };
}

/**
 * Get all browser capabilities
 * Returns a comprehensive report of supported features
 */
export function getBrowserCapabilities(): BrowserCapabilities {
  return {
    serviceWorker: detectServiceWorker().supported,
    indexedDB: detectIndexedDB().supported,
    webSerial: detectWebSerial().supported,
    webBluetooth: detectWebBluetooth().supported,
    geolocation: detectGeolocation().supported,
    notifications: detectNotifications().supported,
    pwaInstallable: detectPWAInstallable().supported,
  };
}

/**
 * Get detailed feature support information
 * Returns support status with reasons for unsupported features
 */
export function getFeatureSupport() {
  return {
    serviceWorker: detectServiceWorker(),
    indexedDB: detectIndexedDB(),
    webSerial: detectWebSerial(),
    webBluetooth: detectWebBluetooth(),
    geolocation: detectGeolocation(),
    notifications: detectNotifications(),
    pwaInstallable: detectPWAInstallable(),
  };
}

/**
 * Check if browser has minimum required features for core functionality
 * Core features: Service Worker, IndexedDB, Geolocation
 */
export function hasMinimumRequirements(): boolean {
  const caps = getBrowserCapabilities();
  return caps.serviceWorker && caps.indexedDB && caps.geolocation;
}

/**
 * Check if browser supports device connections (USB or Bluetooth)
 */
export function hasDeviceConnectionSupport(): boolean {
  const caps = getBrowserCapabilities();
  return caps.webSerial || caps.webBluetooth;
}

/**
 * Get browser name and version
 */
export function getBrowserInfo(): { name: string; version: string } {
  const ua = navigator.userAgent;
  let name = 'Unknown';
  let version = 'Unknown';

  // Chrome
  if (ua.includes('Chrome') && !ua.includes('Edg')) {
    name = 'Chrome';
    const match = ua.match(/Chrome\/(\d+)/);
    if (match) version = match[1];
  }
  // Edge
  else if (ua.includes('Edg')) {
    name = 'Edge';
    const match = ua.match(/Edg\/(\d+)/);
    if (match) version = match[1];
  }
  // Safari
  else if (ua.includes('Safari') && !ua.includes('Chrome')) {
    name = 'Safari';
    const match = ua.match(/Version\/(\d+)/);
    if (match) version = match[1];
  }
  // Firefox
  else if (ua.includes('Firefox')) {
    name = 'Firefox';
    const match = ua.match(/Firefox\/(\d+)/);
    if (match) version = match[1];
  }

  return { name, version };
}

/**
 * Get recommended browser message based on missing features
 */
export function getRecommendedBrowser(missingFeatures: string[]): string {
  const hasDeviceAPI = missingFeatures.includes('webSerial') || missingFeatures.includes('webBluetooth');
  
  if (hasDeviceAPI) {
    return 'For full functionality including USB and Bluetooth instrument connections, we recommend using Chrome 89+ or Edge 89+.';
  }
  
  return 'Please update to the latest version of your browser for the best experience.';
}

/**
 * Check if running in secure context (HTTPS)
 * Required for PWA features and device APIs
 */
export function isSecureContext(): boolean {
  return window.isSecureContext;
}
