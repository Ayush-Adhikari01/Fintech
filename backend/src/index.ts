import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import { config } from './config';
import { runMigrations } from './db/schema';
import { seedDatabase } from './db/seed';
import { setSocketIO } from './engine/pipeline';
import { simulator } from './engine/simulator';
import { rateLimiter, securityHeaders, correlationIdMiddleware } from './middleware/security';
import { errorHandler } from './middleware/errorHandler';

import healthRoutes from './routes/health';
import dashboardRoutes from './routes/dashboard';
import transactionRoutes from './routes/transactions';
import simulatorRoutes from './routes/simulator';
import alertRoutes from './routes/alerts';
import customerRoutes from './routes/customers';
import screeningRoutes from './routes/screening';
import counterpartyRoutes from './routes/counterparties';
import stressTestingRoutes from './routes/stressTesting';
import reportRoutes from './routes/reports';
import auditRoutes from './routes/audit';
import ruleRoutes from './routes/rules';
import settingRoutes from './routes/settings';

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH'],
  },
});
setSocketIO(io);

io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);
  socket.emit('simulator:status', simulator.getStatus());

  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
  });
});

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(securityHeaders);
app.use(correlationIdMiddleware);
app.use(rateLimiter);

// API Routes
app.use('/api/health', healthRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/simulator', simulatorRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/screening', screeningRoutes);
app.use('/api/counterparties', counterpartyRoutes);
app.use('/api/stress-testing', stressTestingRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/rules', ruleRoutes);
app.use('/api/settings', settingRoutes);

// Error Handling
app.use(errorHandler);

// Server Startup
export function startServer() {
  console.log('='.repeat(60));
  console.log('RegTech Sentinel: Starting Backend Server');
  console.log('='.repeat(60));

  // Initialize DB & Seed Baseline Data if fresh
  runMigrations();
  seedDatabase(false);

  server.listen(config.port, '127.0.0.1', () => {
    console.log(`[Backend] RegTech Sentinel API listening on http://127.0.0.1:${config.port}`);
    console.log(`[Backend] WebSocket real-time gateway active on ws://127.0.0.1:${config.port}`);
  });

  return server;
}

if (process.argv[1]?.endsWith('index.ts') || process.argv[1]?.endsWith('index.js')) {
  startServer();
}

export { app, server, io };
