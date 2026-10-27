import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  Play,
  RotateCcw,
  Sliders,
  AlertTriangle,
  ShieldAlert,
  ArrowRight,
  FileDown,
  Layers,
  Building2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { runStressTest, fetchStressScenarios, fetchCounterparties } from '../services/api';
import { StatCard } from '../components/common/StatCard';
import { Table } from '../components/common/Table';

export const StressTestingPage: React.FC = () => {
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [counterparties, setCounterparties] = useState<any[]>([]);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [currentResult, setCurrentResult] = useState<any>(null);

  // Scenario Parameter Sliders
  const [scenarioName, setScenarioName] = useState<string>('Q4 Liquidity & Sanctions Shock');
  const [volumeIncreasePct, setVolumeIncreasePct] = useState<number>(50);
  const [highValMultiplier, setHighValMultiplier] = useState<number>(2);
  const [highRiskGeoPct, setHighRiskGeoPct] = useState<number>(15);
  const [suspiciousMultiplier, setSuspiciousMultiplier] = useState<number>(3);
  const [selectedDefaultCpty, setSelectedDefaultCpty] = useState<string>('');

  const loadScenarios = async () => {
    try {
      const res = await fetchStressScenarios();
      setScenarios(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadCounterparties = async () => {
    try {
      const res = await fetchCounterparties();
      setCounterparties(res.data?.counterparties || []);
      if (res.data?.counterparties?.length > 2) {
        setSelectedDefaultCpty(res.data.counterparties[2].id); // e.g. Caspian Petrochem
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadScenarios();
    loadCounterparties();
    // Run initial baseline scenario projection
    handleExecuteScenario();
  }, []);

  const handleExecuteScenario = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      setIsRunning(true);
      const res = await runStressTest({
        name: scenarioName.trim() || 'Custom Stress Scenario',
        volume_increase_pct: volumeIncreasePct,
        high_value_freq_multiplier: highValMultiplier,
        high_risk_geo_pct: highRiskGeoPct,
        suspicious_pattern_multiplier: suspiciousMultiplier,
        counterparty_default_id: selectedDefaultCpty || undefined,
      });
      setCurrentResult(res.data);
      loadScenarios();
    } catch (err: any) {
      alert(`Stress simulation error: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const chartData = currentResult
    ? [
        {
          band: 'Low',
          Baseline: currentResult.baseline.riskDistribution.low,
          Projected: currentResult.projected.riskDistribution.low,
        },
        {
          band: 'Medium',
          Baseline: currentResult.baseline.riskDistribution.medium,
          Projected: currentResult.projected.riskDistribution.medium,
        },
        {
          band: 'High',
          Baseline: currentResult.baseline.riskDistribution.high,
          Projected: currentResult.projected.riskDistribution.high,
        },
        {
          band: 'Critical',
          Baseline: currentResult.baseline.riskDistribution.critical,
          Projected: currentResult.projected.riskDistribution.critical,
        },
      ]
    : [];

  const scenarioColumns = [
    {
      header: 'Scenario ID',
      accessor: (row: any) => <span className="font-mono font-semibold text-slate-800">{row.id}</span>,
    },
    {
      header: 'Scenario Name',
      accessor: (row: any) => <span className="font-bold text-slate-900">{row.name}</span>,
    },
    {
      header: 'Parameters',
      accessor: (row: any) => (
        <span className="text-xs text-slate-600">
          +{row.parameters.volume_increase_pct}% vol &bull; {row.parameters.suspicious_pattern_multiplier}x suspicious &bull; {row.parameters.high_risk_geo_pct}% geo shock
        </span>
      ),
    },
    {
      header: 'Baseline Tx',
      accessor: (row: any) => (
        <span className="font-mono text-xs">{row.baseline.totalTransactions} txs</span>
      ),
    },
    {
      header: 'Projected Tx',
      accessor: (row: any) => (
        <span className="font-mono font-bold text-xs text-slate-900">{row.projected.totalTransactions} txs</span>
      ),
    },
    {
      header: 'Projected Alerts',
      accessor: (row: any) => (
        <span className="font-mono font-bold text-xs text-red-600">{row.projected.totalAlerts} alerts</span>
      ),
    },
    {
      header: 'Simulated At',
      accessor: (row: any) => (
        <span className="font-mono text-xs text-slate-400">
          {row.created_at ? row.created_at.substring(0, 19).replace('T', ' ') : ''}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Stress Testing & What-If Scenario Analysis
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Evaluate platform operational resilience and compliance alert capacity under simulated macro stress shocks.
          </p>
        </div>
      </div>

      {/* Disclaimers */}
      <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-600 leading-relaxed flex items-start space-x-2">
        <ShieldAlert className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
        <div>
          <strong>Deterministic Model Methodology:</strong> What-if simulations compute projected volumes, alert thresholds, and risk migrations based on reproducible mathematical coefficients. These projections represent stress heuristics rather than forecasts of actual financial loss.
        </div>
      </div>

      {/* Interactive Controls & What-If Sliders */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
            <Sliders className="w-4 h-4 text-amber-600" />
            <span>Interactive Scenario Configuration</span>
          </h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                setVolumeIncreasePct(50);
                setHighValMultiplier(2);
                setHighRiskGeoPct(15);
                setSuspiciousMultiplier(3);
              }}
              className="px-2.5 py-1 text-xs font-semibold text-slate-500 hover:text-slate-800 rounded bg-slate-50 border border-slate-200"
            >
              Reset Sliders
            </button>
          </div>
        </div>

        <form onSubmit={handleExecuteScenario} className="space-y-5 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Scenario Label / Name:</label>
            <input
              type="text"
              value={scenarioName}
              onChange={(e) => setScenarioName(e.target.value)}
              className="w-full max-w-md px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Slider 1: Volume Shock */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800">Volume Surge</span>
                <span className="font-mono font-bold text-slate-900">+{volumeIncreasePct}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="300"
                step="10"
                value={volumeIncreasePct}
                onChange={(e) => setVolumeIncreasePct(parseInt(e.target.value, 10))}
                className="w-full accent-amber-500"
              />
              <p className="text-[10px] text-slate-500">Hypothetical surge in platform transfer frequency.</p>
            </div>

            {/* Slider 2: High Value Frequency */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800">High-Value Spike</span>
                <span className="font-mono font-bold text-slate-900">{highValMultiplier}x multiplier</span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                step="1"
                value={highValMultiplier}
                onChange={(e) => setHighValMultiplier(parseInt(e.target.value, 10))}
                className="w-full accent-amber-500"
              />
              <p className="text-[10px] text-slate-500">Frequency of transactions exceeding $10,000 threshold.</p>
            </div>

            {/* Slider 3: High Risk Geo */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800">Sanctioned Geo Routing</span>
                <span className="font-mono font-bold text-slate-900">{highRiskGeoPct}% of flow</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                step="5"
                value={highRiskGeoPct}
                onChange={(e) => setHighRiskGeoPct(parseInt(e.target.value, 10))}
                className="w-full accent-amber-500"
              />
              <p className="text-[10px] text-slate-500">Shift into high-risk sanctions jurisdictions (IR, KP, SY, RU).</p>
            </div>

            {/* Slider 4: Suspicious Pattern Multiplier */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800">Suspicious Burst</span>
                <span className="font-mono font-bold text-slate-900">{suspiciousMultiplier}x frequency</span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                step="1"
                value={suspiciousMultiplier}
                onChange={(e) => setSuspiciousMultiplier(parseInt(e.target.value, 10))}
                className="w-full accent-amber-500"
              />
              <p className="text-[10px] text-slate-500">Structuring bursts and rapid fund flow-through events.</p>
            </div>
          </div>

          {/* Counterparty Default Shock Selector */}
          <div className="p-4 bg-red-50/40 rounded-xl border border-red-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <Building2 className="w-4 h-4 text-red-600" />
              <div>
                <span className="font-semibold text-slate-800">Hypothetical Counterparty Default Shock:</span>
                <p className="text-[11px] text-slate-500">
                  Simulate instant insolvency or blocked clearing status for selected institution.
                </p>
              </div>
            </div>
            <select
              value={selectedDefaultCpty}
              onChange={(e) => setSelectedDefaultCpty(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none"
            >
              <option value="">No Counterparty Shock</option>
              {counterparties.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.country}) - ${Number(c.total_volume_exposure).toLocaleString()}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isRunning}
              className="px-6 py-2.5 bg-navy-900 hover:bg-navy-800 text-amber-300 rounded-xl font-bold shadow-md transition-all flex items-center space-x-2 disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{isRunning ? 'Calculating Projections...' : 'Simulate Stress Impact'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Before & After Scenario Results */}
      {currentResult && (
        <div className="space-y-6 animate-in fade-in">
          {/* Comparison Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-slate-400">Total Volume</span>
              <div className="mt-2 flex items-baseline justify-between">
                <div>
                  <div className="text-xs text-slate-400 font-mono">
                    Baseline: {currentResult.baseline.totalTransactions}
                  </div>
                  <div className="text-2xl font-bold text-slate-900 font-mono">
                    {currentResult.projected.totalTransactions}
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-50 text-amber-700">
                  +{currentResult.projected.delta.txChangePct}%
                </span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-slate-400">Turnover Exposure</span>
              <div className="mt-2 flex items-baseline justify-between">
                <div>
                  <div className="text-xs text-slate-400 font-mono">
                    Baseline: ${Number(currentResult.baseline.totalVolumeValue).toLocaleString()}
                  </div>
                  <div className="text-xl font-bold text-slate-900 font-mono">
                    ${Number(currentResult.projected.totalVolumeValue).toLocaleString()}
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-50 text-amber-700">
                  +{currentResult.projected.delta.valueChangePct}%
                </span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-slate-400">Compliance Alerts</span>
              <div className="mt-2 flex items-baseline justify-between">
                <div>
                  <div className="text-xs text-slate-400 font-mono">
                    Baseline: {currentResult.baseline.totalAlerts}
                  </div>
                  <div className="text-2xl font-bold text-red-600 font-mono">
                    {currentResult.projected.totalAlerts}
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-800">
                  +{currentResult.projected.delta.alertsChangePct}%
                </span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-slate-400">Critical Risk Volume</span>
              <div className="mt-2 flex items-baseline justify-between">
                <div>
                  <div className="text-xs text-slate-400 font-mono">
                    Baseline: {currentResult.baseline.riskDistribution.critical}
                  </div>
                  <div className="text-2xl font-bold text-red-600 font-mono">
                    {currentResult.projected.riskDistribution.critical}
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-800">
                  +{currentResult.projected.delta.criticalRiskChangePct}%
                </span>
              </div>
            </div>
          </div>

          {/* Counterparty Default Shock Card if selected */}
          {currentResult.projected.defaultShock && (
            <div className="p-4 rounded-xl border border-red-300 bg-red-50 text-xs flex items-center justify-between">
              <div>
                <span className="font-bold text-red-900 text-sm">
                  Simulated Default: {currentResult.projected.defaultShock.name} ({currentResult.projected.defaultShock.country})
                </span>
                <p className="text-red-700 text-xs mt-0.5">
                  Simulated Trapped Turnover: <strong>${currentResult.projected.defaultShock.simulatedTrappedTurnover.toLocaleString()}</strong> across {currentResult.projected.defaultShock.affectedTransactionsCount} transactions.
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-semibold text-red-600 uppercase block">Capital Impact Index</span>
                <span className="text-xl font-mono font-bold text-red-900">
                  {currentResult.projected.defaultShock.capitalImpactScore} / 100
                </span>
              </div>
            </div>
          )}

          {/* Bar Chart: Baseline vs Projected Risk Distribution */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-4">
              Baseline vs Projected Risk Migration
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="band" tick={{ fontSize: 11, fill: '#64748B' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748B' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0B132B', borderRadius: '8px', color: '#fff', fontSize: '11px', border: 'none' }}
                  />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="Baseline" fill="#94A3B8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Projected" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Historical Scenarios Table */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-900">Previously Executed Scenario Runs</h3>
        <Table columns={scenarioColumns} data={scenarios} keyExtractor={(row) => row.id} />
      </div>
    </div>
  );
};
