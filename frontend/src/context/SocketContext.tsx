import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { mockEngine } from '../services/mockEngine';
import { setUseMockEngine } from '../services/api';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  simulatorStatus: {
    isRunning: boolean;
    isPaused: boolean;
    intervalMs: number;
    generatedCount: number;
  };
  lastTransaction: any | null;
  lastAlert: any | null;
  unreadAlertsCount: number;
  clearUnreadAlerts: () => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  simulatorStatus: { isRunning: true, isPaused: false, intervalMs: 3000, generatedCount: 0 },
  lastTransaction: null,
  lastAlert: null,
  unreadAlertsCount: 0,
  clearUnreadAlerts: () => {},
});

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [simulatorStatus, setSimulatorStatus] = useState({
    isRunning: true,
    isPaused: false,
    intervalMs: 3000,
    generatedCount: 0,
  });
  const [lastTransaction, setLastTransaction] = useState<any | null>(null);
  const [lastAlert, setLastAlert] = useState<any | null>(null);
  const [unreadAlertsCount, setUnreadAlertsCount] = useState<number>(0);

  useEffect(() => {
    let hasConnected = false;
    let fallbackActive = false;

    // Activate virtual cloud simulation engine
    const activateFallback = () => {
      if (fallbackActive || hasConnected) return;
      fallbackActive = true;
      setUseMockEngine(true);
      setIsConnected(true);
      setSimulatorStatus(mockEngine.getSimulatorStatus());
      console.log('[Socket] Activated Interactive Cloud Demo Engine');

      mockEngine.on('simulator:status', (status) => {
        setSimulatorStatus(status);
      });

      mockEngine.on('transaction:new', (data) => {
        setLastTransaction(data);
      });

      mockEngine.on('alert:new', (alert) => {
        setLastAlert(alert);
        setUnreadAlertsCount((prev) => prev + 1);
      });
    };

    // Fast probe fallback timer: if socket doesn't connect within 1.5s, switch to cloud engine
    const probeTimer = setTimeout(() => {
      if (!hasConnected) {
        activateFallback();
      }
    }, 12000);

    // Try connecting to real backend Socket.IO (for local or server-hosted setups)
    let s: Socket | null = null;
    try {
      s = io('https://regtech-backend-q7wj.onrender.com', {
        path: '/socket.io',
        reconnectionAttempts: 2,
        reconnectionDelay: 1000,
        timeout: 10000,
        autoConnect: true,
      });

      s.on('connect', () => {
        hasConnected = true;
        clearTimeout(probeTimer);
        console.log('[Socket] Connected to RegTech Sentinel gateway:', s?.id);
        setIsConnected(true);
      });

      s.on('disconnect', () => {
        if (!fallbackActive) {
          setIsConnected(false);
        }
      });

      s.on('connect_error', (error) => {
  console.error('[Socket] Connection failed:', error.message);
});

      s.on('simulator:status', (status) => {
        setSimulatorStatus(status);
      });

      s.on('transaction:new', (data) => {
        setLastTransaction(data);
      });

      s.on('alert:new', (alert) => {
        setLastAlert(alert);
        setUnreadAlertsCount((prev) => prev + 1);
      });

      setSocket(s);
    } catch {
      activateFallback();
    }

    return () => {
      clearTimeout(probeTimer);
      if (s) {
        s.disconnect();
      }
    };
  }, []);

  const clearUnreadAlerts = () => setUnreadAlertsCount(0);

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        simulatorStatus,
        lastTransaction,
        lastAlert,
        unreadAlertsCount,
        clearUnreadAlerts,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
