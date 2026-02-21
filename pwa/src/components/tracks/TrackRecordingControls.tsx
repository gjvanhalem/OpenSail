import React, { useState } from 'react';
import { useTrackRecorder } from '@/hooks/useTrackRecorder';

export const TrackRecordingControls: React.FC = () => {
  const { isRecording, isPaused, start, stop, pause, resume, cancel, getStatus } =
    useTrackRecorder();
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [trackName, setTrackName] = useState('');

  const handleStartRecording = () => {
    setShowNameDialog(true);
    setTrackName(`Track ${new Date().toLocaleDateString()}`);
  };

  const handleConfirmStart = async () => {
    if (!trackName.trim()) {
      alert('Please enter a track name');
      return;
    }

    try {
      await start(trackName);
      setShowNameDialog(false);
      setTrackName('');
    } catch (error) {
      console.error('Failed to start recording:', error);
      alert('Failed to start recording');
    }
  };

  const handleStop = async () => {
    try {
      await stop();
    } catch (error) {
      console.error('Failed to stop recording:', error);
      alert('Failed to stop recording');
    }
  };

  const handlePause = () => {
    try {
      pause();
    } catch (error) {
      console.error('Failed to pause recording:', error);
    }
  };

  const handleResume = () => {
    try {
      resume();
    } catch (error) {
      console.error('Failed to resume recording:', error);
    }
  };

  const handleCancel = () => {
    if (window.confirm('Are you sure you want to cancel recording? This track will not be saved.')) {
      cancel();
    }
  };

  const status = getStatus();

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h3 className="font-semibold text-lg mb-4">Track Recording</h3>

      {/* Recording Status */}
      {isRecording && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  isPaused ? 'bg-yellow-500' : 'bg-red-500 animate-pulse'
                }`}
              />
              <span className="font-medium">
                {isPaused ? 'Paused' : 'Recording'}
              </span>
            </div>
            <span className="text-sm text-gray-600">
              {status.pointCount} points
            </span>
          </div>
          {status.currentTrack && (
            <p className="text-sm text-gray-700 mt-2">{status.currentTrack.name}</p>
          )}
        </div>
      )}

      {/* Controls */}
      <div className="space-y-2">
        {!isRecording ? (
          <button
            onClick={handleStartRecording}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <circle cx="10" cy="10" r="8" />
            </svg>
            Start Recording
          </button>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              {!isPaused ? (
                <button
                  onClick={handlePause}
                  className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors font-medium"
                >
                  Pause
                </button>
              ) : (
                <button
                  onClick={handleResume}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors font-medium"
                >
                  Resume
                </button>
              )}
              <button
                onClick={handleStop}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors font-medium"
              >
                Stop & Save
              </button>
            </div>
            <button
              onClick={handleCancel}
              className="w-full px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors text-sm"
            >
              Cancel
            </button>
          </>
        )}
      </div>

      {/* Name Dialog */}
      {showNameDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Start Track Recording</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Track Name
              </label>
              <input
                type="text"
                value={trackName}
                onChange={(e) => setTrackName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter track name"
                autoFocus
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleConfirmStart();
                  }
                }}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleConfirmStart}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-medium"
              >
                Start
              </button>
              <button
                onClick={() => {
                  setShowNameDialog(false);
                  setTrackName('');
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
