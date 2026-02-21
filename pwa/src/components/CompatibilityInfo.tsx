import React from 'react';
import { useCompatibility } from '../hooks/useCompatibility';

/**
 * Display browser compatibility information in Settings
 */
export const CompatibilityInfo: React.FC = () => {
  const compatibility = useCompatibility();

  const getStatusIcon = (supported: boolean) => {
    return supported ? '✅' : '❌';
  };

  const getStatusColor = (supported: boolean) => {
    return supported ? 'text-green-600' : 'text-red-600';
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Browser Compatibility</h2>

      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Browser Information</h3>
        <p className="text-sm text-gray-600">
          <strong>Browser:</strong> {compatibility.browserInfo.name} {compatibility.browserInfo.version}
        </p>
        <p className="text-sm text-gray-600">
          <strong>Secure Context (HTTPS):</strong>{' '}
          <span className={getStatusColor(compatibility.isSecure)}>
            {compatibility.isSecure ? 'Yes' : 'No'}
          </span>
        </p>
      </div>

      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Feature Support</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between py-2 border-b border-gray-200">
            <span className="text-sm text-gray-700">Service Worker (Offline Mode)</span>
            <span className={`text-sm font-semibold ${getStatusColor(compatibility.capabilities.serviceWorker)}`}>
              {getStatusIcon(compatibility.capabilities.serviceWorker)}{' '}
              {compatibility.capabilities.serviceWorker ? 'Supported' : 'Not Supported'}
            </span>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-gray-200">
            <span className="text-sm text-gray-700">IndexedDB (Local Storage)</span>
            <span className={`text-sm font-semibold ${getStatusColor(compatibility.capabilities.indexedDB)}`}>
              {getStatusIcon(compatibility.capabilities.indexedDB)}{' '}
              {compatibility.capabilities.indexedDB ? 'Supported' : 'Not Supported'}
            </span>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-gray-200">
            <span className="text-sm text-gray-700">Geolocation (GPS)</span>
            <span className={`text-sm font-semibold ${getStatusColor(compatibility.capabilities.geolocation)}`}>
              {getStatusIcon(compatibility.capabilities.geolocation)}{' '}
              {compatibility.capabilities.geolocation ? 'Supported' : 'Not Supported'}
            </span>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-gray-200">
            <span className="text-sm text-gray-700">Web Serial API (USB Instruments)</span>
            <span className={`text-sm font-semibold ${getStatusColor(compatibility.capabilities.webSerial)}`}>
              {getStatusIcon(compatibility.capabilities.webSerial)}{' '}
              {compatibility.capabilities.webSerial ? 'Supported' : 'Not Supported'}
            </span>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-gray-200">
            <span className="text-sm text-gray-700">Web Bluetooth API (Bluetooth Instruments)</span>
            <span className={`text-sm font-semibold ${getStatusColor(compatibility.capabilities.webBluetooth)}`}>
              {getStatusIcon(compatibility.capabilities.webBluetooth)}{' '}
              {compatibility.capabilities.webBluetooth ? 'Supported' : 'Not Supported'}
            </span>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-gray-200">
            <span className="text-sm text-gray-700">PWA Installation</span>
            <span className={`text-sm font-semibold ${getStatusColor(compatibility.capabilities.pwaInstallable)}`}>
              {getStatusIcon(compatibility.capabilities.pwaInstallable)}{' '}
              {compatibility.capabilities.pwaInstallable ? 'Supported' : 'Not Supported'}
            </span>
          </div>

          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-700">Notifications</span>
            <span className={`text-sm font-semibold ${getStatusColor(compatibility.capabilities.notifications)}`}>
              {getStatusIcon(compatibility.capabilities.notifications)}{' '}
              {compatibility.capabilities.notifications ? 'Supported' : 'Not Supported'}
            </span>
          </div>
        </div>
      </div>

      {compatibility.criticalIssues.length > 0 && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded">
          <h3 className="text-sm font-semibold text-red-900 mb-2">Critical Issues</h3>
          <ul className="list-disc list-inside space-y-1">
            {compatibility.criticalIssues.map((issue, index) => (
              <li key={index} className="text-sm text-red-800">
                {issue}
              </li>
            ))}
          </ul>
        </div>
      )}

      {compatibility.warnings.length > 0 && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
          <h3 className="text-sm font-semibold text-yellow-900 mb-2">Warnings</h3>
          <ul className="list-disc list-inside space-y-1">
            {compatibility.warnings.map((warning, index) => (
              <li key={index} className="text-sm text-yellow-800">
                {warning}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="p-4 bg-blue-50 border border-blue-200 rounded">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">Recommended Browsers</h3>
        <p className="text-sm text-blue-800 mb-2">
          For full functionality including USB and Bluetooth instrument connections:
        </p>
        <ul className="list-disc list-inside space-y-1 text-sm text-blue-800">
          <li>Chrome 89 or later</li>
          <li>Microsoft Edge 89 or later</li>
        </ul>
        <p className="text-sm text-blue-800 mt-2">
          Core navigation features work on Safari 15.4+ and Firefox 90+, but device connections are limited.
        </p>
      </div>
    </div>
  );
};

export default CompatibilityInfo;
