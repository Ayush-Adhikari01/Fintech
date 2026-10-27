import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: string;
    isPositive?: boolean;
    isNeutral?: boolean;
  };
  highlight?: 'red' | 'amber' | 'green' | 'blue' | 'none';
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  highlight = 'none',
  onClick,
}) => {
  let highlightBorder = 'border-slate-200';
  if (highlight === 'red') highlightBorder = 'border-red-300 bg-red-50/20';
  else if (highlight === 'amber') highlightBorder = 'border-amber-300 bg-amber-50/20';
  else if (highlight === 'green') highlightBorder = 'border-emerald-300 bg-emerald-50/20';
  else if (highlight === 'blue') highlightBorder = 'border-blue-300 bg-blue-50/20';

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border ${highlightBorder} p-5 shadow-sm transition-all hover:shadow-md ${
        onClick ? 'cursor-pointer hover:border-slate-300' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</span>
        {icon && <div className="p-2 bg-slate-50 rounded-lg text-slate-600">{icon}</div>}
      </div>

      <div className="mt-3 flex items-baseline justify-between">
        <div className="text-2xl font-bold tracking-tight text-slate-900 font-sans">{value}</div>
        {trend && (
          <span
            className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full ${
              trend.isNeutral
                ? 'bg-slate-100 text-slate-600'
                : trend.isPositive
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-red-50 text-red-700'
            }`}
          >
            {trend.value}
          </span>
        )}
      </div>

      {subtitle && <p className="mt-1 text-xs text-slate-500 line-clamp-1">{subtitle}</p>}
    </div>
  );
};
