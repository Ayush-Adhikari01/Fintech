import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Activity,
  ShieldAlert,
  Users,
  SearchCheck,
  Building2,
  TrendingUp,
  FileText,
  FileCheck,
  Cpu,
  Settings,
  Shield,
  Play,
  Pause,
} from 'lucide-react';
import { useSocket } from '../../context/SocketContext';

export const Sidebar: React.FC = () => {
  const { isConnected, simulatorStatus, unreadAlertsCount } = useSocket();

  const navItems = [
    { label: 'Risk Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Live Transactions', path: '/transactions', icon: Activity },
    { label: 'Alerts & Cases', path: '/alerts', icon: ShieldAlert, badge: unreadAlertsCount > 0 ? unreadAlertsCount : null },
    { label: 'Customers & KYC', path: '/customers', icon: Users },
    { label: 'Sanctions Screening', path: '/screening', icon: SearchCheck },
    { label: 'Counterparty Risk', path: '/counterparties', icon: Building2 },
    { label: 'Stress Testing', path: '/stress-testing', icon: TrendingUp },
    { label: 'Reports & Export', path: '/reports', icon: FileText },
    { label: 'Audit Trail', path: '/audit', icon: FileCheck },
    { label: 'Risk Engine Rules', path: '/rules', icon: Cpu },
    { label: 'System Settings', path: '/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-navy-900 border-r border-slate-800 flex flex-col justify-between shrink-0 select-none text-slate-300">
      <div>
        {/* Brand Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center space-x-3 bg-navy-900/60">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 shadow-md shadow-amber-500/20">
            <Shield className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-extrabold text-white text-base tracking-tight font-sans">RegTech</span>
              <span className="text-amber-400 font-bold text-base tracking-tight">Sentinel</span>
            </div>
            <p className="text-[10px] text-slate-400 tracking-wider uppercase font-semibold">Real-Time Risk Intel</p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                  isActive
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`
              }
            >
              <div className="flex items-center space-x-3">
                <item.icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500 text-white animate-pulse">
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Simulator Quick Status in Footer */}
      <div className="p-4 border-t border-slate-800/80 bg-navy-800/40 m-3 rounded-xl">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="text-slate-400 font-medium flex items-center space-x-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                simulatorStatus.isRunning
                  ? simulatorStatus.isPaused
                    ? 'bg-amber-400'
                    : 'bg-emerald-400 animate-ping'
                  : 'bg-slate-500'
              }`}
            ></span>
            <span>Simulator Feed</span>
          </span>
          <span className="text-[10px] font-mono font-semibold text-slate-300">
            {simulatorStatus.isRunning ? (simulatorStatus.isPaused ? 'PAUSED' : 'ACTIVE') : 'IDLE'}
          </span>
        </div>
        <div className="text-[11px] text-slate-400">
          Generated: <span className="font-mono text-slate-200 font-semibold">{simulatorStatus.generatedCount}</span> txs
        </div>
        <div className="mt-2 text-[10px] text-slate-400 flex items-center justify-between">
          <span>Gateway:</span>
          <span className={isConnected ? 'text-emerald-400 font-medium' : 'text-red-400 font-medium'}>
            {isConnected ? 'LIVE WS' : 'RECONNECTING'}
          </span>
        </div>
      </div>
    </aside>
  );
};
