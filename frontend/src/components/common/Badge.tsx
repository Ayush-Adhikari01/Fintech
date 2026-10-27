import React from 'react';

interface BadgeProps {
  variant?: 'risk' | 'status' | 'kyc' | 'custom';
  value: string;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ variant = 'risk', value, className = '' }) => {
  const upper = (value || '').toUpperCase();

  let colorClasses = 'bg-slate-100 text-slate-800 border-slate-200';

  if (variant === 'risk') {
    switch (upper) {
      case 'CRITICAL':
        colorClasses = 'bg-red-50 text-red-700 border-red-200 font-semibold';
        break;
      case 'HIGH':
        colorClasses = 'bg-orange-50 text-orange-700 border-orange-200 font-medium';
        break;
      case 'MEDIUM':
        colorClasses = 'bg-amber-50 text-amber-700 border-amber-200 font-medium';
        break;
      case 'LOW':
        colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200 font-medium';
        break;
    }
  } else if (variant === 'status') {
    switch (upper) {
      case 'NEW':
        colorClasses = 'bg-blue-50 text-blue-700 border-blue-200 font-semibold';
        break;
      case 'UNDER_REVIEW':
        colorClasses = 'bg-indigo-50 text-indigo-700 border-indigo-200 font-medium';
        break;
      case 'ESCALATED':
        colorClasses = 'bg-red-50 text-red-700 border-red-200 font-bold animate-pulse';
        break;
      case 'RESOLVED':
        colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200';
        break;
      case 'FALSE_POSITIVE':
        colorClasses = 'bg-slate-100 text-slate-600 border-slate-200';
        break;
      case 'HELD':
        colorClasses = 'bg-rose-50 text-rose-700 border-rose-200 font-semibold';
        break;
      case 'BLOCKED':
        colorClasses = 'bg-red-100 text-red-900 border-red-300 font-bold';
        break;
      case 'FLAGGED':
        colorClasses = 'bg-amber-50 text-amber-800 border-amber-200 font-medium';
        break;
      case 'COMPLETED':
        colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200';
        break;
    }
  } else if (variant === 'kyc') {
    switch (upper) {
      case 'VERIFIED':
        colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200 font-medium';
        break;
      case 'PENDING':
        colorClasses = 'bg-amber-50 text-amber-700 border-amber-200';
        break;
      case 'EXPIRED':
        colorClasses = 'bg-orange-50 text-orange-700 border-orange-200 font-medium';
        break;
      case 'REJECTED':
        colorClasses = 'bg-red-50 text-red-700 border-red-200 font-semibold';
        break;
    }
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border tracking-tight ${colorClasses} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-75"></span>
      {value}
    </span>
  );
};
