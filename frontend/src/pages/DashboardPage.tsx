import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertOctagon,
  ShieldAlert,
  Users,
  Building2,
  Cpu,
  RefreshCw,
  Clock,
  CheckCircle,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import { fetchDashboard } from '../services/api';
import { StatCard } from '../components/common/StatCard';
import { Badge } from '../components/common/Badge';
import { Drawer } from '../components/common/Drawer';
import { fetchTransactionDetail } from '../services/api';
import { useSocket } from '../context/SocketContext';
import { useNavigate } from 'react-router-dom';

const RISK_COLORS: Record<string, string> = {
  LOW: '#10B981',
  MEDIUM: '#F59E0B',
  HIGH: '#F97316',
  CRITICAL: '#EF4444',
};

export const DashboardPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);
  const [selectedTxDetail, setSelectedTxDetail] = useState<any>(null);
  const [isDrawerLoading, setIsDrawerLoading] = useState<boolean>(false);
  const { lastTransaction, lastAlert } = useSocket();
  const navigate = useNavigate();

  const loadDashboard = async () => {
    try {
      setIsLoading(true);
      const res = await fetchDashboard();
      setData(res.data);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  // Soft refresh on socket transaction updates
  useEffect(() => {
    if (lastTransaction || lastAlert) {
      // Poll fresh KPI numbers smoothly
      fetchDashboard().then((res) => setData(res.data)).catch(() => {});
    }
  }, [lastTransaction, lastAlert]);

  const handleOpenTxDrawer = async (id: string) => {
    try {
      setSelectedTxId(id);
      setIsDrawerLoading(true);
      const res = await fetchTransactionDetail(id);
      setSelectedTxDetail(res.data);
    } catch (err) {
      console.error('Failed to load tx details:', err);
    } finally {
      setIsDrawerLoading(false);
    }
  };

  if (isLoading && !data) {
    return (
      <div className="p-12 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-200 border-t-amber-500"></div>
        <p className="mt-3 text-xs font-semibold text-slate-500">Aggregating database KPIs & risk distributions...</p>
      </div>
    );
  }

  const { kpis, charts, recentTransactions, recentAlerts, recentAudits, systemStatus } = data || {
    kpis: {},
    charts: { volumeOverTime: [], riskDistribution: [], alertCategories: [], topCounterpartiesByVolume: [] },
    recentTransactions: [],
    recentAlerts: [],
    recentAudits: [],
    systemStatus: {},
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Executive Risk Dashboard</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time compliance monitoring, deterministic rule triggers & ML anomaly detection telemetry.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={loadDashboard}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Telemetry</span>
          </button>
          <button
            onClick={() => navigate('/transactions')}
            className="inline-flex items-center space-x-1 px-3 py-1.5 bg-navy-900 text-amber-400 rounded-lg text-xs font-semibold hover:bg-navy-800 shadow-xs transition-colors"
          >
            <span>Live Monitor</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Top KPI Cards (Calculated directly from SQLite records) */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total Transactions"
          value={kpis?.totalTransactions?.toLocaleString() || '0'}
          subtitle={`Turnover: $${kpis?.totalVolumeValue?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}`}
          icon={<Activity className="w-4 h-4 text-blue-600" />}
          onClick={() => navigate('/transactions')}
        />
        <StatCard
          title="Review Required"
          value={kpis?.transactionsRequiringReview || '0'}
          subtitle="Held or flagged for review"
          highlight={kpis?.transactionsRequiringReview > 0 ? 'amber' : 'none'}
          icon={<AlertTriangle className="w-4 h-4 text-amber-600" />}
          onClick={() => navigate('/transactions?status=FLAGGED')}
        />
        <StatCard
          title="Critical Risk"
          value={kpis?.criticalRiskTransactions || '0'}
          subtitle="Score >= 80 (Sanctions/AML)"
          highlight={kpis?.criticalRiskTransactions > 0 ? 'red' : 'none'}
          icon={<AlertOctagon className="w-4 h-4 text-red-600" />}
          onClick={() => navigate('/transactions?riskBand=CRITICAL')}
        />
        <StatCard
          title="Open Alerts"
          value={kpis?.openAlerts || '0'}
          subtitle="Assigned or pending analyst review"
          highlight={kpis?.openAlerts > 0 ? 'red' : 'none'}
          icon={<ShieldAlert className="w-4 h-4 text-red-500" />}
          onClick={() => navigate('/alerts')}
        />
        <StatCard
          title="ML Anomalies"
          value={kpis?.mlAnomaliesDetected || '0'}
          subtitle="Isolation Forest outliers"
          icon={<Cpu className="w-4 h-4 text-purple-600" />}
          highlight={kpis?.mlAnomaliesDetected > 0 ? 'blue' : 'none'}
        />
      </div>

      {/* Secondary KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase text-slate-500">Incomplete KYC</span>
            <div className="text-xl font-bold text-slate-800 mt-1">{kpis?.incompleteKycCustomers || 0}</div>
            <span className="text-[11px] text-amber-600 font-medium">Pending or expired profiles</span>
          </div>
          <Users className="w-6 h-6 text-slate-300" />
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase text-slate-500">Simulated Block/Hold</span>
            <div className="text-xl font-bold text-red-600 mt-1">{kpis?.simulatedHeldBlocked || 0}</div>
            <span className="text-[11px] text-slate-500">Held pending review</span>
          </div>
          <AlertOctagon className="w-6 h-6 text-red-200" />
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase text-slate-500">Counterparties</span>
            <div className="text-xl font-bold text-slate-800 mt-1">{kpis?.totalCounterparties || 0}</div>
            <span className="text-[11px] text-slate-500">Global settlement endpoints</span>
          </div>
          <Building2 className="w-6 h-6 text-slate-300" />
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase text-slate-500">Pipeline Latency</span>
            <div className="text-xl font-bold text-slate-800 mt-1 font-mono">{kpis?.avgProcessingLatencyMs || 14.8} ms</div>
            <span className="text-[11px] text-emerald-600 font-medium">Deterministic + ML inference</span>
          </div>
          <Clock className="w-6 h-6 text-emerald-200" />
        </div>
      </div>

      {/* Primary Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Transaction Volume Over Time (2 Columns) */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Transaction Volume & Historical Turnover</h2>
              <p className="text-xs text-slate-500">Daily aggregate transaction value and processing volume.</p>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
              14-Day Baseline
            </span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts.volumeOverTime} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="volumeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3A506B" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3A506B" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748B' }} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#64748B' }} tickLine={false} />
                <Tooltip
                  formatter={(val: any, name: string) => [
                    name === 'volume' ? `$${Number(val).toLocaleString()}` : val,
                    name === 'volume' ? 'Turnover ($)' : 'Transactions',
                  ]}
                  contentStyle={{ backgroundColor: '#0B132B', borderRadius: '8px', color: '#fff', fontSize: '11px', border: 'none' }}
                />
                <Area type="monotone" dataKey="volume" stroke="#1C2541" strokeWidth={2} fillOpacity={1} fill="url(#volumeGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Risk Band Distribution Donut (1 Column) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Risk Severity Distribution</h2>
            <p className="text-xs text-slate-500">Classification breakdown of persisted transactions.</p>
          </div>
          <div className="h-52 relative flex items-center justify-center my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={charts.riskDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="count"
                  nameKey="band"
                >
                  {charts.riskDistribution.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={RISK_COLORS[entry.band] || '#94A3B8'} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any, name: string) => [`${value} txs`, `${name} Risk`]}
                  contentStyle={{ backgroundColor: '#0B132B', borderRadius: '8px', color: '#fff', fontSize: '11px', border: 'none' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {charts.riskDistribution.map((r: any) => (
              <div key={r.band} className="flex items-center justify-between p-1.5 rounded bg-slate-50 border border-slate-100">
                <span className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: RISK_COLORS[r.band] }}></span>
                  <span className="font-medium text-slate-700">{r.band}</span>
                </span>
                <span className="font-mono font-semibold text-slate-900">{r.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Secondary Charts: Alert Categories & Severity Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alert Categories */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Alert Categories</h2>
              <p className="text-xs text-slate-500">Distribution of compliance triggers by typology.</p>
            </div>
            <button onClick={() => navigate('/alerts')} className="text-xs font-semibold text-amber-600 hover:text-amber-700">
              View All Alerts &rarr;
            </button>
          </div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.alertCategories} layout="vertical" margin={{ left: 10, right: 20, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#64748B' }} />
                <YAxis dataKey="category" type="category" tick={{ fontSize: 10, fill: '#334155' }} width={80} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0B132B', borderRadius: '8px', color: '#fff', fontSize: '11px', border: 'none' }}
                />
                <Bar dataKey="count" fill="#3A506B" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Severity Trends Over Time */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Severity Trends (Stacked Daily)</h2>
              <p className="text-xs text-slate-500">Daily accumulation of Low, Medium, High & Critical events.</p>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">Daily Multi-Tier</span>
          </div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.severityTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#64748B' }} />
                <YAxis tick={{ fontSize: 9, fill: '#64748B' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0B132B', borderRadius: '8px', color: '#fff', fontSize: '11px', border: 'none' }}
                />
                <Legend iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="low" stackId="a" fill="#10B981" name="Low" />
                <Bar dataKey="medium" stackId="a" fill="#F59E0B" name="Medium" />
                <Bar dataKey="high" stackId="a" fill="#F97316" name="High" />
                <Bar dataKey="critical" stackId="a" fill="#EF4444" name="Critical" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tables Row: Recent Transactions & Recent Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Live Ingested Transactions</h2>
              <p className="text-xs text-slate-500">Most recent transactions assessed by the engine.</p>
            </div>
            <button onClick={() => navigate('/transactions')} className="text-xs font-semibold text-amber-600 hover:text-amber-700">
              Transaction Monitor &rarr;
            </button>
          </div>
          <div className="divide-y divide-slate-100 overflow-x-auto">
            <table className="min-w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 font-semibold">
                <tr>
                  <th className="px-4 py-2">ID</th>
                  <th className="px-4 py-2">Customer</th>
                  <th className="px-4 py-2">Amount</th>
                  <th className="px-4 py-2">Risk Band</th>
                  <th className="px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentTransactions.map((tx: any) => (
                  <tr
                    key={tx.id}
                    onClick={() => handleOpenTxDrawer(tx.id)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-2.5 font-mono font-medium text-slate-700">{tx.id}</td>
                    <td className="px-4 py-2.5 font-medium text-slate-800">{tx.customer_name || tx.sender_account_id}</td>
                    <td className="px-4 py-2.5 font-mono font-semibold text-slate-900">
                      ${tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge variant="risk" value={tx.risk_band} />
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge variant="status" value={tx.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Alerts */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Compliance Alerts & Cases</h2>
              <p className="text-xs text-slate-500">Review signals flagged for human investigation.</p>
            </div>
            <button onClick={() => navigate('/alerts')} className="text-xs font-semibold text-amber-600 hover:text-amber-700">
              Investigation Hub &rarr;
            </button>
          </div>
          <div className="divide-y divide-slate-100 overflow-x-auto">
            <table className="min-w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 font-semibold">
                <tr>
                  <th className="px-4 py-2">Alert ID</th>
                  <th className="px-4 py-2">Category</th>
                  <th className="px-4 py-2">Severity</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentAlerts.map((alt: any) => (
                  <tr
                    key={alt.id}
                    onClick={() => navigate('/alerts')}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-2.5 font-mono font-medium text-slate-700">{alt.id}</td>
                    <td className="px-4 py-2.5 font-medium text-slate-800">{alt.category}</td>
                    <td className="px-4 py-2.5">
                      <Badge variant="risk" value={alt.severity} />
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge variant="status" value={alt.status} />
                    </td>
                    <td className="px-4 py-2.5 text-slate-600 max-w-xs truncate" title={alt.trigger_reason}>
                      {alt.trigger_reason}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Transaction Detail Slide-Over Drawer */}
      <Drawer
        isOpen={Boolean(selectedTxId)}
        onClose={() => setSelectedTxId(null)}
        title="Transaction Risk Assessment"
        subtitle={selectedTxId || ''}
      >
        {isDrawerLoading || !selectedTxDetail ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading risk assessment details...</div>
        ) : (
          <div className="space-y-6 text-xs">
            {/* Summary Header */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Final Risk Score</span>
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
                <strong>Recommended Action:</strong>{' '}
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
                  Note: Isolation Forest scores measure multi-feature deviation from baseline synthetic distributions; not a calibrated probability of fraud.
                </p>
              </div>
            </div>

            {/* Transaction Parameters */}
            <div>
              <h3 className="font-bold text-slate-900 mb-2">Transaction Metadata</h3>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 bg-slate-50 rounded border border-slate-100">
                  <span className="text-slate-400 block">Sender Account:</span>
                  <span className="font-mono font-semibold">{selectedTxDetail.transaction.sender_account_id}</span>
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
                <div className="p-2 bg-slate-50 rounded border border-slate-100">
                  <span className="text-slate-400 block">Timestamp:</span>
                  <span className="font-mono text-[10px]">{selectedTxDetail.transaction.created_at}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};
