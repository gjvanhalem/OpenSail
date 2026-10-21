import { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export function PWAInstallPrompt() {
  const { isInstallable, isInstalled, promptInstall } = usePWAInstall();
  const [isDismissed, setIsDismissed] = useState(false);

  if (!isInstallable || isInstalled || isDismissed) {
    return null;
  }

  const handleInstall = async () => {
    const installed = await promptInstall();
    if (!installed) {
      // User dismissed the prompt
      setIsDismissed(true);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50">
      <div className="bg-sky-600 text-white rounded-lg shadow-lg p-4 flex items-start gap-3">
        <div className="flex-shrink-0 text-2xl">⚓</div>
        <div className="flex-1">
          <h3 className="font-semibold text-lg mb-1">Install OpenSail</h3>
          <p className="text-sm text-sky-100 mb-3">
            Install this app for offline access and a better experience
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleInstall}
              className="bg-surface text-sky-600 px-4 py-2 rounded-md font-medium text-sm hover:bg-sky-50 transition-colors"
            >
              Install
            </button>
            <button
              onClick={handleDismiss}
              className="bg-sky-700 text-white px-4 py-2 rounded-md font-medium text-sm hover:bg-sky-800 transition-colors"
            >
              Not now
            </button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 text-sky-200 hover:text-white transition-colors"
          aria-label="Close"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
