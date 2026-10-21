import React from 'react';
import { InstrumentManager, InstrumentPanel } from '@/components/instruments';

/** The gauges first, then the connection to the boat's instruments */
export const InstrumentsPage: React.FC = () => {
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-7xl space-y-8 p-4 pb-32 md:p-6 md:pb-32">
        <h1 className="text-3xl font-bold text-ink">Instruments</h1>

        <InstrumentPanel showConfig={true} layout="grid" />

        <section aria-labelledby="instrument-connection" className="space-y-4">
          <div>
            <h2 id="instrument-connection" className="text-xl font-semibold text-ink">
              Connection
            </h2>
            <p className="text-sm text-muted">
              USB, Bluetooth, Wi-Fi (in the Windows and Android apps also straight to the autopilot)
              or the built-in simulator.
            </p>
          </div>
          <InstrumentManager />
        </section>
      </div>
    </div>
  );
};
