import React, { useState } from 'react';
import { Search, Bell, Wifi, WifiOff, User, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import { useDemo } from '../../context/DemoContext';
import { useNavigate } from 'react-router-dom';

export const Header: React.FC = () => {
  const { isConnected, unreadAlertsCount, clearUnreadAlerts, lastAlert } = useSocket();
  const { currentUser, globalSearch, setGlobalSearch } = useDemo();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const navigate = useNavigate();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (globalSearch.trim()) {
      navigate(`/transactions?search=${encodeURIComponent(globalSearch.trim())}`);
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 z-20">
      {/* Global Search Bar */}
      <form onSubmit={handleSearchSubmit} className="relative w-80 lg:w-96">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={globalSearch}
          onChange={(e) => setGlobalSearch(e.target.value)}
          placeholder="Search transactions, accounts, customers, counterparties..."
          className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-slate-800 placeholder-slate-400"
        />
      </form>

      {/* Right Action Icons & Profile */}
      <div className="flex items-center space-x-4">
        {/* Real-time Connection Indicator */}
        <div
          className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
            isConnected
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-red-50 text-red-700 border-red-200'
          }`}
          title={isConnected ? 'Connected to local WebSocket server' : 'Connecting to local server...'}
        >
          {isConnected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5 animate-pulse" />}
          <span>{isConnected ? 'LIVE ENGINE' : 'OFFLINE'}</span>
        </div>

        {/* Demo Mode Badge */}
        <div className="hidden md:flex items-center space-x-1 px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[11px] font-medium border border-slate-200">
          <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
          <span>Demo Environment</span>
        </div>

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              if (!showNotifications) clearUnreadAlerts();
            }}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors relative"
            title="Open Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadAlertsCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 p-4 text-xs z-50 animate-in fade-in duration-100">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 font-semibold text-slate-800">
                <span>Recent Risk Notifications</span>
                <span className="text-[10px] text-slate-400">Real-Time</span>
              </div>
              <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
                {lastAlert ? (
                  <div
                    onClick={() => {
                      navigate(`/alerts`);
                      setShowNotifications(false);
                    }}
                    className="p-2.5 rounded-lg bg-red-50/60 border border-red-100 hover:bg-red-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between font-semibold text-red-800">
                      <span>{lastAlert.category || 'High Risk Alert'}</span>
                      <span className="text-[10px]">{lastAlert.severity}</span>
                    </div>
                    <p className="mt-1 text-slate-600 text-[11px] line-clamp-2">
                      {lastAlert.trigger_reason}
                    </p>
                  </div>
                ) : (
                  <p className="py-4 text-center text-slate-400">No new incoming alerts.</p>
                )}
              </div>
              <div className="mt-3 pt-2 border-t border-slate-100 text-center">
                <button
                  onClick={() => {
                    navigate('/alerts');
                    setShowNotifications(false);
                  }}
                  className="text-amber-600 hover:text-amber-700 font-semibold text-[11px]"
                >
                  View Alert Investigation Centre &rarr;
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Profile */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center space-x-2 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-navy-800 text-amber-300 flex items-center justify-center font-bold text-xs shadow-xs">
              SJ
            </div>
            <div className="hidden lg:block text-left text-xs leading-tight">
              <div className="font-semibold text-slate-800">{currentUser.name}</div>
              <div className="text-[10px] text-slate-400">{currentUser.role}</div>
            </div>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 p-3 text-xs z-50">
              <div className="p-2 bg-slate-50 rounded-lg mb-2">
                <div className="font-semibold text-slate-800">{currentUser.name}</div>
                <div className="text-slate-500 text-[11px]">{currentUser.email}</div>
                <div className="mt-1 text-[10px] text-amber-700 font-medium">{currentUser.role}</div>
              </div>
              <button
                onClick={() => {
                  navigate('/settings');
                  setShowUserMenu(false);
                }}
                className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-100 rounded-lg text-xs transition-colors"
              >
                Risk Rules & System Settings
              </button>
              <button
                onClick={() => {
                  navigate('/audit');
                  setShowUserMenu(false);
                }}
                className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-100 rounded-lg text-xs transition-colors"
              >
                Audit & Governance History
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
