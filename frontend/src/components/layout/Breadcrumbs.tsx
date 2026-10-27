import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

export const Breadcrumbs: React.FC = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  const routeNames: Record<string, string> = {
    transactions: 'Live Transactions Monitor',
    alerts: 'Alerts & Investigation Centre',
    customers: 'Customer & KYC Directory',
    screening: 'Sanctions & Watchlist Screening',
    counterparties: 'Counterparty Risk & Exposure',
    'stress-testing': 'Stress Testing & Scenario Analysis',
    reports: 'Reports & Regulatory Export',
    audit: 'Immutable Audit Trail',
    rules: 'Risk Engine Intelligence Rules',
    settings: 'System Configuration & Settings',
  };

  return (
    <nav className="flex items-center space-x-1.5 text-xs text-slate-500 mb-4 select-none">
      <Link to="/" className="hover:text-slate-800 flex items-center transition-colors">
        <Home className="w-3.5 h-3.5 mr-1" />
        <span>Executive Dashboard</span>
      </Link>

      {pathnames.map((segment, index) => {
        const to = `/${pathnames.slice(0, index + 1).join('/')}`;
        const isLast = index === pathnames.length - 1;
        const name = routeNames[segment] || segment;

        return (
          <React.Fragment key={to}>
            <ChevronRight className="w-3 h-3 text-slate-400" />
            {isLast ? (
              <span className="font-semibold text-slate-800">{name}</span>
            ) : (
              <Link to={to} className="hover:text-slate-800 transition-colors">
                {name}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
