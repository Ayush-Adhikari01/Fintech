import React, { useEffect, useState } from 'react';
import {
  Settings,
  Cpu,
  RotateCcw,
  Save,
  CheckCircle,
  AlertTriangle,
  Shield,
  Activity,
  Layers,
  Sparkles,
} from 'lucide-react';
import { fetchRules, updateRule, resetDemoDataset, fetchHealth } from '../services/api';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';

export const SettingsPage: React.FC = () => {
  const [rules, setRules] = useState<any[]>([]);
  const [health, setHealth] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [showResetModal, setShowResetModal] = useState<boolean>(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  // Edit Rule State
  const [editingRule, setEditingRule] = useState<any | null>(null);
  const [editWeight, setEditWeight] = useState<number>(25);
  const [editThreshold, setEditThreshold] = useState<number | null>(null);
  const [editSeverity, setEditSeverity] = useState<string>('HIGH');
  const [editEnabled, setEditEnabled] = useState<boolean>(true);
  const [isSavingRule, setIsSavingRule] = useState<boolean>(false);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const [rulesRes, healthRes] = await Promise.all([fetchRules(), fetchHealth()]);
      setRules(rulesRes.data);
      setHealth(healthRes);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleOpenEditRule = (rule: any) => {
    setEditingRule(rule);
    setEditWeight(rule.weight);
    setEditThreshold(rule.threshold_value);
    setEditSeverity(rule.severity);
    setEditEnabled(rule.is_enabled === 1);
  };

  const handleSaveRule = async () => {
    if (!editingRule) return;
    try {
      setIsSavingRule(true);
      await updateRule(editingRule.id, {
        weight: editWeight,
        threshold_value: editThreshold,
        severity: editSeverity,
        is_enabled: editEnabled,
      });
      setEditingRule(null);
      loadSettings();
    } catch (err: any) {
      alert(`Error updating rule: ${err.message}`);
    } finally {
      setIsSavingRule(false);
    }
  };

  const handleToggleRuleEnabled = async (rule: any) => {
    try {
      await updateRule(rule.id, {
        is_enabled: rule.is_enabled === 1 ? false : true,
      });
      loadSettings();
    } catch (err: any) {
      alert(`Error toggling rule: ${err.message}`);
    }
  };

  const handleResetDemo = async () => {
    try {
      setIsResetting(true);
      const res = await resetDemoDataset();
      setShowResetModal(false);
      setResetMessage(res.message);
      setTimeout(() => setResetMessage(null), 4000);
      loadSettings();
    } catch (err: any) {
      alert(`Error resetting dataset: ${err.message}`);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Risk Engine Rules & Platform Settings
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure explainable deterministic rule weights, thresholds, ML service health, and reset demonstration baseline data.
          </p>
        </div>
        <button
          onClick={() => setShowResetModal(true)}
          className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 rounded-lg text-xs font-bold transition-colors shadow-2xs"
        >
          <RotateCcw className="w-3.5 h-3.5 text-red-600" />
          <span>Reset Demonstration Baseline</span>
        </button>
      </div>

      {resetMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold animate-in fade-in">
          {resetMessage}
        </div>
      )}

      {/* ML Telemetry Card */}
      <div className="bg-navy-900 text-white p-6 rounded-2xl border border-slate-800 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-bold tracking-tight">Machine Learning Inference Engine</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-400/20 text-purple-300 border border-purple-400/30">
                  Isolation Forest v1.0.0
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Local Python scikit-learn microservice running on port 5050.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold border ${
                health?.components?.mlService?.status === 'HEALTHY'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : 'bg-red-500/20 text-red-300 border-red-500/30'
              }`}
            >
              STATUS: {health?.components?.mlService?.status || 'UNKNOWN'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-2 text-xs">
          <div className="p-3 bg-navy-800/60 rounded-xl border border-slate-800">
            <span className="text-slate-400 text-[10px] uppercase font-bold">Synthetic ROC-AUC</span>
            <div className="text-lg font-bold text-amber-400 mt-1 font-mono">0.9558</div>
            <p className="text-[10px] text-slate-400">Evaluated on test split</p>
          </div>
          <div className="p-3 bg-navy-800/60 rounded-xl border border-slate-800">
            <span className="text-slate-400 text-[10px] uppercase font-bold">F1 Score</span>
            <div className="text-lg font-bold text-slate-100 mt-1 font-mono">0.7530</div>
            <p className="text-[10px] text-slate-400">Synthetic typologies</p>
          </div>
          <div className="p-3 bg-navy-800/60 rounded-xl border border-slate-800">
            <span className="text-slate-400 text-[10px] uppercase font-bold">Estimated Latency</span>
            <div className="text-lg font-bold text-emerald-400 mt-1 font-mono">&lt; 15 ms</div>
            <p className="text-[10px] text-slate-400">Local loopback HTTP</p>
          </div>
          <div className="p-3 bg-navy-800/60 rounded-xl border border-slate-800">
            <span className="text-slate-400 text-[10px] uppercase font-bold">Features Extracted</span>
            <div className="text-lg font-bold text-slate-100 mt-1 font-mono">7 Signals</div>
            <p className="text-[10px] text-slate-400">Amount, velocity, geo, time</p>
          </div>
        </div>
      </div>

      {/* Deterministic Risk Rules Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Configurable Deterministic Rules</h2>
            <p className="text-xs text-slate-500">
              Active scoring rules evaluated synchronously on incoming payment transactions.
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-slate-100 text-slate-700">
            {rules.filter((r) => r.is_enabled === 1).length} / {rules.length} Rules Active
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Active</th>
                <th className="px-4 py-3">Rule Name & ID</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Score Weight</th>
                <th className="px-4 py-3">Threshold</th>
                <th className="px-4 py-3">Severity Band</th>
                <th className="px-4 py-3">Logic Description</th>
                <th className="px-4 py-3 text-right">Configure</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rules.map((rule) => (
                <tr key={rule.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggleRuleEnabled(rule)}
                      className={`w-9 h-5 rounded-full transition-colors relative p-0.5 ${
                        rule.is_enabled === 1 ? 'bg-amber-500' : 'bg-slate-300'
                      }`}
                      title={rule.is_enabled === 1 ? 'Click to disable rule' : 'Click to enable rule'}
                    >
                      <span
                        className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                          rule.is_enabled === 1 ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      ></span>
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-bold text-slate-900">{rule.name}</div>
                    <div className="font-mono text-[10px] text-slate-400">{rule.id}</div>
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-700">{rule.category}</td>
                  <td className="px-4 py-3 font-mono font-bold text-amber-700">+{rule.weight} pts</td>
                  <td className="px-4 py-3 font-mono text-slate-600">
                    {rule.threshold_value !== null ? rule.threshold_value : 'Conditional'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="risk" value={rule.severity} />
                  </td>
                  <td className="px-4 py-3 text-slate-600 max-w-sm">{rule.description}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleOpenEditRule(rule)}
                      className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Rule Configuration Modal */}
      <Modal
        isOpen={Boolean(editingRule)}
        onClose={() => setEditingRule(null)}
        title={`Configure Rule: ${editingRule?.name}`}
        subtitle={`Rule ID: ${editingRule?.id}`}
        footer={
          <>
            <button
              onClick={() => setEditingRule(null)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              disabled={isSavingRule}
              onClick={handleSaveRule}
              className="px-4 py-1.5 rounded-lg bg-navy-900 text-amber-300 hover:bg-navy-800 text-xs font-bold shadow-xs disabled:opacity-50"
            >
              {isSavingRule ? 'Saving...' : 'Save Configuration'}
            </button>
          </>
        }
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Score Weight (0 - 100 points contribution):
            </label>
            <div className="flex items-center space-x-3">
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={editWeight}
                onChange={(e) => setEditWeight(parseInt(e.target.value, 10))}
                className="flex-1 accent-amber-500"
              />
              <span className="font-mono font-bold text-slate-900 w-12 text-right">+{editWeight} pts</span>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Threshold Parameter Value:</label>
            <input
              type="number"
              value={editThreshold ?? ''}
              onChange={(e) => setEditThreshold(e.target.value ? parseFloat(e.target.value) : null)}
              placeholder="e.g. 10000"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Severity Classification:</label>
            <select
              value={editSeverity}
              onChange={(e) => setEditSeverity(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <input
              type="checkbox"
              id="enableRuleCheck"
              checked={editEnabled}
              onChange={(e) => setEditEnabled(e.target.checked)}
              className="rounded text-amber-500 focus:ring-amber-500"
            />
            <label htmlFor="enableRuleCheck" className="text-slate-800 font-semibold">
              Enable this rule in real-time transaction pipeline
            </label>
          </div>

          <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800">
            Note: Rule modifications will be audited with previous and new configuration states.
          </div>
        </div>
      </Modal>

      {/* Confirmation Modal for Resetting Baseline Dataset */}
      <Modal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        title="Restore Known Demonstration Baseline"
        subtitle="Confirm destructive database reset"
        footer={
          <>
            <button
              onClick={() => setShowResetModal(false)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              disabled={isResetting}
              onClick={handleResetDemo}
              className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs disabled:opacity-50"
            >
              {isResetting ? 'Restoring Database...' : 'Confirm Reset Baseline'}
            </button>
          </>
        }
      >
        <div className="space-y-3 text-xs text-slate-700">
          <p className="font-semibold text-red-700 flex items-center space-x-1.5">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Are you sure you want to restore the demonstration baseline?</span>
          </p>
          <p>
            This action wipes all newly generated transactions and resets the SQLite database to the verified 14-day reproducible scenario state (25 customers, 40 accounts, 20 counterparties, 155 transactions, 56 alerts, and 20 watchlist entries).
          </p>
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-500">
            An audit event will be recorded documenting the reset operation.
          </div>
        </div>
      </Modal>
    </div>
  );
};
