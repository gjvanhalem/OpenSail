import React from 'react';
import { InstrumentManager, InstrumentPanel } from '@/components/instruments';

export const InstrumentsPage: React.FC = () => {
  return (
    <div className="h-full p-6 overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Instruments</h1>
        <p className="text-gray-600 mb-6">
          Connect and manage marine instruments via USB or Bluetooth
        </p>
        
        {/* Instrument Panel with Gauges */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Instrument Display</h2>
          <InstrumentPanel showConfig={true} layout="grid" />
        </div>

        {/* Connection Manager */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Connection Manager</h2>
          <InstrumentManager />
        </div>
      </div>
    </div>
  );
};
