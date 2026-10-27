import React, { useEffect, useState } from 'react';
import {
  Activity,
  Play,
  Pause,
  Square,
  FastForward,
  AlertTriangle,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Sliders,
  ShieldAlert,
} from 'lucide-react';
import {
  fetchTransactions,
  fetchTransactionDetail,
  startSimulator,
  pauseSimulator,
  resumeSimulator,
  stopSimulator,
  setSimulatorRate,
  generateSimulatorBatch,
  generateSuspiciousTx,
} from '../services/api';
import { Table } from '../components/common/Table';
import { Badge } from '../components/common/Badge';
import { Drawer } from '../components/common/Drawer';
import { useSocket } from '../context/SocketContext';
import { useLocation } from 'react-router-dom';

export const TransactionsPage: React.FC = () => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [riskBand, setRiskBand] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [channel, setChannel] = useState<string>('');
  const [minAmount, setMinAmount] = useState<string>('');
  const [maxAmount, setMaxAmount] = useState<string>('');
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);
  const [selectedTxDetail, setSelectedTxDetail] = useState<any>(null);
  const [isDrawerLoading, setIsDrawerLoading] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  const { socket, simulatorStatus, lastTransaction } = useSocket();
  const location = useLocation();

  // Load URL query params if any
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('search')) setSearch(params.get('search')!);
    if (params.get('riskBand')) setRiskBand(params.get('riskBand')!);
    if (params.get('status')) setStatus(params.get('status')!);
  }, [location.search]);

  const loadTransactions = async (page: number = 1) => {
    try {
      setIsLoading(true);
      const res = await fetchTransactions({
        search: search.trim() || undefined,
        riskBand: riskBand || undefined,
        status: status || undefined,
        channel: channel || undefined,
        minAmount: minAmount ? parseFloat(minAmount) : undefined,
        maxAmount: maxAmount ? parseFloat(maxAmount) : undefined,
        page,
        limit: 20,
      });
      setTransactions(res.data);
      setPagination(res.pagination);
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions(1);
  }, [riskBand, status, channel]);

  // Live real-time prepend when new transaction is emitted by Socket.IO
  useEffect(() => {
    if (lastTransaction && pagination.page === 1) {
      setTransactions((prev) => {
        // Prevent duplicate record insertion
        if (prev.some((t) => t.id === lastTransaction.transaction.id)) return prev;
        return [lastTransaction.transaction, ...prev.slice(0, 19)];
      });
      setPagination((prev) => ({ ...prev, total: prev.total + 1 }));
    }
  }, [lastTransaction]);

  const handleOpenDetail = async (id: string) => {
    try {
      setSelectedTxId(id);
      setIsDrawerLoading(true);
      const res = await fetchTransactionDetail(id);
      setSelectedTxDetail(res.data);
    } catch (err) {
      console.error('Failed to fetch transaction detail:', err);
    } finally {
      setIsDrawerLoading(false);
    }
  };

  const handleGenerateBatch = async (count: number) => {
    try {
      setIsGenerating(true);
      await generateSimulatorBatch(count);
      setNotificationMsg(`Generated batch of ${count} simulated transactions.`);
      setTimeout(() => setNotificationMsg(null), 3000);
      loadTransactions(1);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateSuspiciousDemo = async () => {
    try {
      setIsGenerating(true);
      const res = await generateSuspiciousTx();
      setNotificationMsg('Generated deliberate high-risk demonstration scenario (Structuring + Watchlist match + Sanctions routing).');
      setTimeout(() => setNotificationMsg(null), 4000);
      loadTransactions(1);
      // Auto-open detail drawer for the demo!
      if (res.data?.transaction?.id) {
        handleOpenDetail(res.data.transaction.id);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const columns = [
    {
      header: 'Transaction ID',
      accessor: (row: any) => (
        <span className="font-mono font-semibold text-slate-900 hover:text-amber-600 transition-colors">
          {row.id}
        </span>
      ),
    },
    {
      header: 'Timestamp',
      accessor: (row: any) => (
        <span className="text-slate-500 font-mono text-xs">
          {row.created_at ? row.created_at.replace('T', ' ').substring(0, 19) : ''}
        </span>
      ),
    },
    {
      header: 'Originator',
      accessor: (row: any) => (
        <div>
          <div className="font-medium text-slate-800">{row.customer_name || row.sender_customer_id}</div>
          <div className="text-[11px] font-mono text-slate-400">{row.sender_account_id}</div>
        </div>
      ),
    },
    {
      header: 'Beneficiary / Cpty',
      accessor: (row: any) => (
        <div>
          <div className="font-medium text-slate-800">{row.counterparty_name || 'External Beneficiary'}</div>
          <div className="text-[11px] font-mono text-slate-400">{row.receiver_account_id}</div>
        </div>
      ),
    },
    {
      header: 'Amount',
      accessor: (row: any) => (
        <div className="font-mono font-bold text-slate-900">
          ${Number(row.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          <span className="text-[10px] text-slate-400 font-normal ml-1">{row.currency}</span>
        </div>
      ),
    },
    {
      header: 'Routing',
      accessor: (row: any) => (
        <div className="text-xs font-semibold text-slate-600">
          <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200">{row.origin_country}</span>
          <span className="mx-1 text-slate-400">&rarr;</span>
          <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200">{row.dest_country}</span>
        </div>
      ),
    },
    {
      header: 'Channel',
      accessor: (row: any) => (
        <span className="text-xs font-medium text-slate-600 px-2 py-0.5 rounded bg-slate-100">
          {row.channel}
        </span>
      ),
    },
    {
      header: 'Risk Band',
      accessor: (row: any) => <Badge variant="risk" value={row.risk_band} />,
    },
    {
      header: 'Score',
      accessor: (row: any) => (
        <span className="font-mono font-bold text-slate-800">
          {row.risk_score}
          <span className="text-[10px] text-slate-400 font-normal">/100</span>
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: (row: any) => <Badge variant="status" value={row.status} />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header & Simulator Control Toolbar */}
      <div className="bg-navy-900 text-white rounded-2xl p-5 border border-slate-800 shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <Activity className="w-5 h-5 text-amber-400" />
              <h1 className="text-lg font-bold tracking-tight">Live Transaction Monitor & Simulation Control</h1>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Continuously stream synthetic transactions through the deterministic rule engine and Isolation Forest ML pipeline.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {!simulatorStatus.isRunning ? (
              <button
                onClick={startSimulator}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-lg text-xs font-bold transition-colors shadow-xs"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Start Stream</span>
              </button>
            ) : simulatorStatus.isPaused ? (
              <button
                onClick={resumeSimulator}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-lg text-xs font-bold transition-colors shadow-xs"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Resume Stream</span>
              </button>
            ) : (
              <button
                onClick={pauseSimulator}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-amber-400 hover:bg-amber-500 text-slate-950 rounded-lg text-xs font-bold transition-colors shadow-xs"
              >
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Pause</span>
              </button>
            )}

            {simulatorStatus.isRunning && (
              <button
                onClick={stopSimulator}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition-colors"
              >
                <Square className="w-3.5 h-3.5" />
                <span>Stop</span>
              </button>
            )}

            <button
              disabled={isGenerating}
              onClick={() => handleGenerateBatch(5)}
              className="inline-flex items-center space-x-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold disabled:opacity-50 transition-colors"
            >
              <FastForward className="w-3.5 h-3.5 text-amber-400" />
              <span>Batch +5</span>
            </button>

            {/* Evaluator Teacher Demo Button */}
            <button
              disabled={isGenerating}
              onClick={handleGenerateSuspiciousDemo}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white rounded-lg text-xs font-bold shadow-md shadow-red-950/40 border border-red-500 disabled:opacity-50 transition-all"
              title="Inject guaranteed suspicious scenario for teacher demo evaluation"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-amber-300" />
              <span>Generate Demo Scenario</span>
            </button>
          </div>
        </div>

        {/* Simulator Parameters Strip */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-300">
          <div className="flex items-center space-x-4">
            <span className="flex items-center space-x-1.5">
              <span className="text-slate-400">Stream Status:</span>
              <span
                className={`font-semibold ${
                  simulatorStatus.isRunning
                    ? simulatorStatus.isPaused
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                    : 'text-slate-400'
                }`}
              >
                {simulatorStatus.isRunning ? (simulatorStatus.isPaused ? 'PAUSED' : 'STREAMING') : 'STOPPED'}
              </span>
            </span>
            <span>
              Generated in Session: <strong className="text-white font-mono">{simulatorStatus.generatedCount}</strong>
            </span>
          </div>

          <div className="flex items-center space-x-2 mt-2 sm:mt-0">
            <Sliders className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400">Rate:</span>
            {[1000, 2000, 3000, 5000].map((rate) => (
              <button
                key={rate}
                onClick={() => setSimulatorRate(rate)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                  simulatorStatus.intervalMs === rate
                    ? 'bg-amber-400 text-slate-950 font-bold'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {rate / 1000}s
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Notification Toast */}
      {notificationMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between animate-in fade-in">
          <span>{notificationMsg}</span>
          <button onClick={() => setNotificationMsg(null)} className="text-emerald-600 hover:text-emerald-900">
            &times;
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
          {/* Search */}
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadTransactions(1)}
              placeholder="Search ID, account, name..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs"
            />
          </div>

          {/* Risk Band Filter */}
          <select
            value={riskBand}
            onChange={(e) => setRiskBand(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none"
          >
            <option value="">All Risk Bands</option>
            <option value="CRITICAL">Critical (80-100)</option>
            <option value="HIGH">High (60-79)</option>
            <option value="MEDIUM">Medium (30-59)</option>
            <option value="LOW">Low (0-29)</option>
          </select>

          {/* Status Filter */}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="FLAGGED">Flagged</option>
            <option value="HELD">Held</option>
            <option value="BLOCKED">Blocked</option>
          </select>

          {/* Channel Filter */}
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none"
          >
            <option value="">All Channels</option>
            <option value="WEB">Web</option>
            <option value="MOBILE">Mobile</option>
            <option value="API">API</option>
            <option value="SWIFT">SWIFT</option>
            <option value="ATM">ATM</option>
          </select>

          <button
            onClick={() => loadTransactions(1)}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg font-semibold text-slate-700 transition-colors"
          >
            Filter
          </button>
        </div>

        <button
          onClick={() => loadTransactions(pagination.page)}
          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
          title="Refresh List"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Main Transactions Data Table */}
      <Table
        columns={columns}
        data={transactions}
        keyExtractor={(row) => row.id}
        onRowClick={(row) => handleOpenDetail(row.id)}
        isLoading={isLoading}
        pagination={{
          page: pagination.page,
          totalPages: pagination.totalPages,
          total: pagination.total,
          onPageChange: (newPage) => loadTransactions(newPage),
        }}
      />

      {/* Transaction Inspection Drawer */}
      <Drawer
        isOpen={Boolean(selectedTxId)}
        onClose={() => setSelectedTxId(null)}
        title="Transaction Risk Intelligence"
        subtitle={selectedTxId || ''}
      >
        {isDrawerLoading || !selectedTxDetail ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading risk assessment telemetry...</div>
        ) : (
          <div className="space-y-6 text-xs">
            {/* Top Score Banner */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Aggregated Risk Score</span>
                  <div className="text-3xl font-extrabold text-slate-900 mt-1">
                    {selectedTxDetail.assessment?.final_risk_score ?? selectedTxDetail.transaction.risk_score}
                    <span className="text-xs font-normal text-slate-500"> / 100</span>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="risk" value={selectedTxDetail.transaction.risk_band} className="text-sm px-3 py-1" />
                  <div className="mt-1">
                    <Badge variant="status" value={selectedTxDetail.transaction.status} />
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-200 text-slate-700">
                <strong>Recommended Next Action:</strong>{' '}
                <span className="font-mono text-amber-700 font-semibold">
                  {selectedTxDetail.assessment?.recommended_action || 'AUTOMATIC_CLEARANCE'}
                </span>
              </div>
            </div>

            {/* Explainable Decision Overview */}
            <div>
              <h3 className="font-bold text-slate-900 mb-2">Explainable Decision Overview</h3>
              <div className="p-3 bg-amber-50/50 border border-amber-200 rounded-lg text-slate-800 leading-relaxed">
                {selectedTxDetail.assessment?.explanation || 'Within normal parameters.'}
              </div>
            </div>

            {/* Triggered Deterministic Rules */}
            <div>
              <h3 className="font-bold text-slate-900 mb-2 flex items-center justify-between">
                <span>Triggered Deterministic Rules</span>
                <span className="text-[10px] text-slate-400 font-normal">
                  Rule Score Contribution: {selectedTxDetail.assessment?.rule_score || 0} pts
                </span>
              </h3>
              {selectedTxDetail.assessment?.triggered_rules?.length > 0 ? (
                <div className="space-y-2">
                  {selectedTxDetail.assessment.triggered_rules.map((r: any, idx: number) => (
                    <div key={idx} className="p-3 bg-white border border-slate-200 rounded-lg shadow-2xs">
                      <div className="flex items-center justify-between font-semibold text-slate-800">
                        <span>{r.ruleName}</span>
                        <span className="font-mono text-red-600">+{r.scoreContribution} pts</span>
                      </div>
                      <p className="mt-1 text-slate-600 text-[11px]">{r.reason}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 text-center">
                  No deterministic risk rules triggered.
                </p>
              )}
            </div>

            {/* Machine Learning Telemetry */}
            <div>
              <h3 className="font-bold text-slate-900 mb-2">Machine Learning Telemetry (Isolation Forest)</h3>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">ML Model Status:</span>
                  <span className="font-semibold text-emerald-600">
                    {selectedTxDetail.assessment?.ml_service_status || 'HEALTHY'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Statistical Anomaly Score:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {selectedTxDetail.assessment?.ml_anomaly_score !== null
                      ? selectedTxDetail.assessment.ml_anomaly_score?.toFixed(3)
                      : 'N/A'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Multidimensional Outlier Flag:</span>
                  <span
                    className={`font-semibold ${
                      selectedTxDetail.assessment?.ml_is_anomaly ? 'text-red-600' : 'text-slate-600'
                    }`}
                  >
                    {selectedTxDetail.assessment?.ml_is_anomaly ? 'OUTLIER DETECTED' : 'NORMAL INLIER'}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 border-t border-slate-200 pt-2 italic">
                  Note: Isolation Forest scores measure multidimensional deviation from synthetic training patterns; not a calibrated probability of fraud.
                </p>
              </div>
            </div>

            {/* Transaction Parameters */}
            <div>
              <h3 className="font-bold text-slate-900 mb-2">Transaction Parameters</h3>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 bg-slate-50 rounded border border-slate-100">
                  <span className="text-slate-400 block">Sender Account:</span>
                  <span className="font-mono font-semibold">{selectedTxDetail.transaction.sender_account_id}</span>
                </div>
                <div className="p-2 bg-slate-50 rounded border border-slate-100">
                  <span className="text-slate-400 block">Customer KYC:</span>
                  <Badge variant="kyc" value={selectedTxDetail.transaction.kyc_status || 'VERIFIED'} />
                </div>
                <div className="p-2 bg-slate-50 rounded border border-slate-100">
                  <span className="text-slate-400 block">Beneficiary Account:</span>
                  <span className="font-mono font-semibold">{selectedTxDetail.transaction.receiver_account_id}</span>
                </div>
                <div className="p-2 bg-slate-50 rounded border border-slate-100">
                  <span className="text-slate-400 block">Amount:</span>
                  <span className="font-mono font-bold text-slate-900">
                    ${selectedTxDetail.transaction.amount?.toFixed(2)} {selectedTxDetail.transaction.currency}
                  </span>
                </div>
                <div className="p-2 bg-slate-50 rounded border border-slate-100">
                  <span className="text-slate-400 block">Channel / Type:</span>
                  <span className="font-semibold">
                    {selectedTxDetail.transaction.channel} / {selectedTxDetail.transaction.type}
                  </span>
                </div>
                <div className="p-2 bg-slate-50 rounded border border-slate-100">
                  <span className="text-slate-400 block">Routing:</span>
                  <span className="font-semibold">
                    {selectedTxDetail.transaction.origin_country} &rarr; {selectedTxDetail.transaction.dest_country}
                  </span>
                </div>
              </div>
            </div>

            {/* Linked Alerts */}
            {selectedTxDetail.alerts?.length > 0 && (
              <div>
                <h3 className="font-bold text-slate-900 mb-2">Generated Compliance Alerts</h3>
                <div className="space-y-2">
                  {selectedTxDetail.alerts.map((a: any) => (
                    <div key={a.id} className="p-3 bg-red-50/60 border border-red-200 rounded-lg">
                      <div className="flex items-center justify-between font-semibold text-red-900">
                        <span>{a.id}</span>
                        <Badge variant="status" value={a.status} />
                      </div>
                      <p className="mt-1 text-slate-700 text-[11px]">{a.trigger_reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
};
