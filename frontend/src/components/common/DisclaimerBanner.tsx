import React, { useState } from 'react';
import { ShieldAlert, X } from 'lucide-react';

export const DisclaimerBanner: React.FC = () => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="bg-amber-500 text-slate-950 px-4 py-2 text-xs font-medium flex items-center justify-between shadow-sm z-50">
      <div className="flex items-center space-x-2">
        <ShieldAlert className="w-4 h-4 text-slate-950 shrink-0" />
        <span>
          <strong>PROTOTYPE DEMONSTRATION MODE:</strong> All accounts, transaction flows, synthetic watchlist entities, and risk assessments are simulated benchmark data. Not connected to real financial networks or certified for regulatory filing.
        </span>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="ml-4 p-1 hover:bg-amber-600/30 rounded text-slate-950 transition-colors"
        title="Dismiss notice"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
