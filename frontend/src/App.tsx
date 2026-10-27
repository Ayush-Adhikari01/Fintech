import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SocketProvider } from './context/SocketContext';
import { DemoProvider } from './context/DemoContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { Breadcrumbs } from './components/layout/Breadcrumbs';
import { DisclaimerBanner } from './components/common/DisclaimerBanner';

// Pages
import { DashboardPage } from './pages/DashboardPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { AlertsPage } from './pages/AlertsPage';
import { CustomersPage } from './pages/CustomersPage';
import { ScreeningPage } from './pages/ScreeningPage';
import { CounterpartiesPage } from './pages/CounterpartiesPage';
import { StressTestingPage } from './pages/StressTestingPage';
import { ReportsPage } from './pages/ReportsPage';
import { AuditPage } from './pages/AuditPage';
import { SettingsPage } from './pages/SettingsPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <SocketProvider>
        <DemoProvider>
          <div className="flex h-screen w-screen overflow-hidden bg-slate-50 font-sans text-slate-900">
            {/* Sidebar Navigation */}
            <Sidebar />

            {/* Main Application Column */}
            <div className="flex flex-col flex-1 h-full min-w-0 overflow-hidden">
              {/* Demo Notice Banner */}
              <DisclaimerBanner />

              {/* Top Global Header */}
              <Header />

              {/* Page Viewport Area */}
              <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50">
                <div className="max-w-7xl mx-auto">
                  <Breadcrumbs />
                  <Routes>
                    <Route path="/" element={<DashboardPage />} />
                    <Route path="/transactions" element={<TransactionsPage />} />
                    <Route path="/alerts" element={<AlertsPage />} />
                    <Route path="/customers" element={<CustomersPage />} />
                    <Route path="/screening" element={<ScreeningPage />} />
                    <Route path="/counterparties" element={<CounterpartiesPage />} />
                    <Route path="/stress-testing" element={<StressTestingPage />} />
                    <Route path="/reports" element={<ReportsPage />} />
                    <Route path="/audit" element={<AuditPage />} />
                    <Route path="/rules" element={<SettingsPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </div>
              </main>
            </div>
          </div>
        </DemoProvider>
      </SocketProvider>
    </BrowserRouter>
  );
};

export default App;
