import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

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
  simulatorStatus: { isRunning: false, isPaused: false, intervalMs: 3000, generatedCount: 0 },
  lastTransaction: null,
  lastAlert: null,
  unreadAlertsCount: 0,
  clearUnreadAlerts: () => {},
});

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [simulatorStatus, setSimulatorStatus] = useState({
    isRunning: false,
    isPaused: false,
    intervalMs: 3000,
    generatedCount: 0,
  });
  const [lastTransaction, setLastTransaction] = useState<any | null>(null);
  const [lastAlert, setLastAlert] = useState<any | null>(null);
  const [unreadAlertsCount, setUnreadAlertsCount] = useState<number>(0);

  useEffect(() => {
    // Connect to backend Socket.IO
    const s = io(window.location.origin, {
      path: '/socket.io',
      reconnectionAttempts: 10,
      reconnectionDelay: 1500,
      autoConnect: true,
    });

    s.on('connect', () => {
      console.log('[Socket] Connected to RegTech Sentinel gateway:', s.id);
      setIsConnected(true);
    });

    s.on('disconnect', () => {
      console.log('[Socket] Disconnected from gateway');
      setIsConnected(false);
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

    return () => {
      s.disconnect();
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
