import React, { useEffect, useState } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  RefreshCw,
  UserCheck,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowUpRight,
  MessageSquare,
  Clock,
  ShieldCheck,
  FileText,
} from 'lucide-react';
import {
  fetchAlerts,
  fetchAlertDetail,
  updateAlertStatus,
  assignAlert,
  addAlertNote,
} from '../services/api';
import { Table } from '../components/common/Table';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { Drawer } from '../components/common/Drawer';
import { useSocket } from '../context/SocketContext';

export const AlertsPage: React.FC = () => {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentTab, setCurrentTab] = useState<string>('ALL');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');

  // Selected Alert Detail
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [alertDetail, setAlertDetail] = useState<any>(null);
  const [isDetailLoading, setIsDetailLoading] = useState<boolean>(false);

  // Modals for actions
  const [actionModal, setActionModal] = useState<{
    isOpen: boolean;
    type: 'ASSIGN' | 'ESCALATE' | 'RESOLVE' | 'FALSE_POSITIVE' | 'UNDER_REVIEW';
    targetStatus?: string;
  }>({ isOpen: false, type: 'ASSIGN' });
  const [actionReason, setActionReason] = useState<string>('');
  const [assigneeInput, setAssigneeInput] = useState<string>('sarah.jenkins@sentinel.internal');
  const [newNoteInput, setNewNoteInput] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const { lastAlert } = useSocket();

  const loadAlerts = async (page: number = 1) => {
    try {
      setIsLoading(true);
      const res = await fetchAlerts({
        status: currentTab !== 'ALL' ? currentTab : undefined,
        severity: severityFilter !== 'ALL' ? severityFilter : undefined,
        search: search.trim() || undefined,
        page,
        limit: 20,
      });
      setAlerts(res.data);
      setPagination(res.pagination);
    } catch (err) {
      console.error('Failed to load alerts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts(1);
  }, [currentTab, severityFilter]);

  useEffect(() => {
    if (lastAlert && pagination.page === 1) {
      loadAlerts(1);
    }
  }, [lastAlert]);

  const handleOpenDetail = async (id: string) => {
    try {
      setSelectedAlertId(id);
      setIsDetailLoading(true);
      const res = await fetchAlertDetail(id);
      setAlertDetail(res.data);
    } catch (err) {
      console.error('Failed to load alert detail:', err);
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleExecuteStatusUpdate = async () => {
    if (!selectedAlertId || !actionModal.targetStatus) return;
    if (!actionReason.trim()) {
      alert('A documented reason is required to perform this compliance status transition.');
      return;
    }

    try {
      setIsSubmitting(true);
      await updateAlertStatus(
        selectedAlertId,
        actionModal.targetStatus,
        actionReason.trim(),
        newNoteInput.trim() || undefined
      );
      setActionModal({ isOpen: false, type: 'ASSIGN' });
      setActionReason('');
      setNewNoteInput('');
      // Reload detail and list
      const res = await fetchAlertDetail(selectedAlertId);
      setAlertDetail(res.data);
      loadAlerts(pagination.page);
    } catch (err: any) {
      alert(`Error updating alert: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExecuteAssign = async () => {
    if (!selectedAlertId || !assigneeInput.trim()) return;
    try {
      setIsSubmitting(true);
      await assignAlert(selectedAlertId, assigneeInput.trim());
      setActionModal({ isOpen: false, type: 'ASSIGN' });
      const res = await fetchAlertDetail(selectedAlertId);
      setAlertDetail(res.data);
      loadAlerts(pagination.page);
    } catch (err: any) {
      alert(`Error assigning alert: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddNote = async () => {
    if (!selectedAlertId || !newNoteInput.trim()) return;
    try {
      setIsSubmitting(true);
      await addAlertNote(selectedAlertId, newNoteInput.trim());
      setNewNoteInput('');
      const res = await fetchAlertDetail(selectedAlertId);
      setAlertDetail(res.data);
    } catch (err: any) {
      alert(`Error adding note: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const tabs = [
    { id: 'ALL', label: 'All Alerts' },
    { id: 'NEW', label: 'New Unreviewed' },
    { id: 'UNDER_REVIEW', label: 'Under Review' },
    { id: 'ESCALATED', label: 'Escalated' },
    { id: 'RESOLVED', label: 'Resolved' },
    { id: 'FALSE_POSITIVE', label: 'False Positives' },
  ];

  const columns = [
    {
      header: 'Alert ID',
      accessor: (row: any) => (
        <span className="font-mono font-semibold text-slate-900 hover:text-amber-600 transition-colors">
          {row.id}
        </span>
      ),
    },
    {
      header: 'Created At',
      accessor: (row: any) => (
        <span className="text-slate-500 font-mono text-xs">
          {row.created_at ? row.created_at.replace('T', ' ').substring(0, 19) : ''}
        </span>
      ),
    },
    {
      header: 'Category',
      accessor: (row: any) => <span className="font-semibold text-slate-800">{row.category}</span>,
    },
    {
      header: 'Severity',
      accessor: (row: any) => <Badge variant="risk" value={row.severity} />,
    },
    {
      header: 'Risk Score',
      accessor: (row: any) => (
        <span className="font-mono font-bold text-slate-900">{row.risk_score}/100</span>
      ),
    },
    {
      header: 'Customer / TX',
      accessor: (row: any) => (
        <div>
          <div className="font-medium text-slate-800">{row.customer_name || 'System Entity'}</div>
          <div className="text-[11px] font-mono text-slate-400">{row.transaction_id}</div>
        </div>
      ),
    },
    {
      header: 'Assignee',
      accessor: (row: any) => (
        <span className="text-xs text-slate-600">
          {row.assigned_to ? (
            <span className="inline-flex items-center text-slate-800 font-medium">
              <UserCheck className="w-3.5 h-3.5 mr-1 text-slate-400" />
              {row.assigned_to.split('@')[0]}
            </span>
          ) : (
            <span className="text-slate-400 italic">Unassigned</span>
          )}
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: (row: any) => <Badge variant="status" value={row.status} />,
    },
    {
      header: 'Trigger Reason',
      accessor: (row: any) => (
        <div className="text-xs text-slate-600 max-w-xs truncate" title={row.trigger_reason}>
          {row.trigger_reason}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Alerts & Case Investigation Centre
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Triage, escalate, and resolve suspicious activity review cases with documented audit rationales.
          </p>
        </div>
        <button
          onClick={() => loadAlerts(1)}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Cases</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 flex space-x-4 overflow-x-auto text-xs font-semibold">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setCurrentTab(tab.id)}
            className={`pb-3 px-1 border-b-2 transition-all whitespace-nowrap ${
              currentTab === tab.id
                ? 'border-amber-500 text-slate-900 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadAlerts(1)}
              placeholder="Search alert, TX or customer..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs"
            />
          </div>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          <button
            onClick={() => loadAlerts(1)}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg font-semibold text-slate-700 transition-colors"
          >
            Filter
          </button>
        </div>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        data={alerts}
        keyExtractor={(row) => row.id}
        onRowClick={(row) => handleOpenDetail(row.id)}
        isLoading={isLoading}
        pagination={{
          page: pagination.page,
          totalPages: pagination.totalPages,
          total: pagination.total,
          onPageChange: (newPage) => loadAlerts(newPage),
        }}
      />

      {/* Alert Investigation Slide-Over Drawer */}
      <Drawer
        isOpen={Boolean(selectedAlertId)}
        onClose={() => setSelectedAlertId(null)}
        title="Compliance Case File"
        subtitle={selectedAlertId || ''}
      >
        {isDetailLoading || !alertDetail ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading case details...</div>
        ) : (
          <div className="space-y-6 text-xs">
            {/* Top Case Card */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Case Severity</span>
                  <div className="mt-1">
                    <Badge variant="risk" value={alertDetail.alert.severity} className="text-sm px-3 py-1" />
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Investigation State</span>
                  <div className="mt-1">
                    <Badge variant="status" value={alertDetail.alert.status} />
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200 grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-400 block">Category:</span>
                  <span className="font-semibold text-slate-800">{alertDetail.alert.category}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Assigned Reviewer:</span>
                  <span className="font-semibold text-slate-800">
                    {alertDetail.alert.assigned_to || 'Unassigned'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Linked Transaction:</span>
                  <span className="font-mono font-semibold text-slate-800">{alertDetail.alert.transaction_id}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Transaction Value:</span>
                  <span className="font-mono font-bold text-slate-900">
                    ${alertDetail.alert.amount?.toFixed(2)} {alertDetail.alert.currency}
                  </span>
                </div>
              </div>
            </div>

            {/* Case Trigger Explanation */}
            <div>
              <h3 className="font-bold text-slate-900 mb-2">Compliance Trigger Reason</h3>
              <div className="p-3 bg-red-50/50 border border-red-200 rounded-lg text-slate-800 leading-relaxed font-medium">
                {alertDetail.alert.trigger_reason}
              </div>
            </div>

            {/* Triggered Rules Breakdown */}
            {alertDetail.alert.triggered_rules?.length > 0 && (
              <div>
                <h3 className="font-bold text-slate-900 mb-2">Deterministic Rule Triggers</h3>
                <div className="space-y-2">
                  {alertDetail.alert.triggered_rules.map((r: any, idx: number) => (
                    <div key={idx} className="p-3 bg-white border border-slate-200 rounded-lg shadow-2xs">
                      <div className="flex items-center justify-between font-semibold text-slate-800">
                        <span>{r.ruleName}</span>
                        <span className="font-mono text-red-600">+{r.scoreContribution} pts</span>
                      </div>
                      <p className="mt-1 text-slate-600 text-[11px]">{r.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Investigation Actions Toolbar */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <h3 className="font-bold text-slate-900">Analyst Review Actions</h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setActionModal({ isOpen: true, type: 'ASSIGN' })}
                  className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg font-semibold text-slate-700 transition-colors flex items-center justify-center space-x-1.5"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Assign Case</span>
                </button>
                <button
                  onClick={() =>
                    setActionModal({ isOpen: true, type: 'UNDER_REVIEW', targetStatus: 'UNDER_REVIEW' })
                  }
                  className="px-3 py-2 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-800 rounded-lg font-semibold transition-colors flex items-center justify-center space-x-1.5"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Mark Under Review</span>
                </button>
                <button
                  onClick={() =>
                    setActionModal({ isOpen: true, type: 'ESCALATE', targetStatus: 'ESCALATED' })
                  }
                  className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center space-x-1.5 shadow-xs"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Escalate Case</span>
                </button>
                <button
                  onClick={() =>
                    setActionModal({ isOpen: true, type: 'RESOLVE', targetStatus: 'RESOLVED' })
                  }
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center space-x-1.5 shadow-xs"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Resolve / Clear</span>
                </button>
              </div>
              <button
                onClick={() =>
                  setActionModal({ isOpen: true, type: 'FALSE_POSITIVE', targetStatus: 'FALSE_POSITIVE' })
                }
                className="w-full px-3 py-2 bg-slate-200/80 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition-colors flex items-center justify-center space-x-1.5"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Mark False Positive</span>
              </button>
            </div>

            {/* Case Timeline & Notes */}
            <div>
              <h3 className="font-bold text-slate-900 mb-2">Investigation Notes & Case History</h3>
              <div className="space-y-3">
                {alertDetail.notes?.map((n: any) => (
                  <div key={n.id} className="p-3 bg-white border border-slate-200 rounded-lg">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                      <span className="font-semibold text-slate-700">{n.author}</span>
                      <span className="font-mono">{n.created_at ? n.created_at.substring(0, 19).replace('T', ' ') : ''}</span>
                    </div>
                    <p className="text-slate-800 text-[11px] leading-relaxed">{n.note}</p>
                    {n.action_taken && (
                      <span className="mt-1.5 inline-block text-[10px] font-semibold text-amber-700 px-1.5 py-0.5 rounded bg-amber-50 border border-amber-100">
                        Action: {n.action_taken}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Add Note Input */}
              <div className="mt-3 flex space-x-2">
                <input
                  type="text"
                  value={newNoteInput}
                  onChange={(e) => setNewNoteInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                  placeholder="Append analyst note to case timeline..."
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                <button
                  disabled={isSubmitting || !newNoteInput.trim()}
                  onClick={handleAddNote}
                  className="px-3 py-2 bg-navy-900 hover:bg-navy-800 text-white rounded-lg font-semibold disabled:opacity-40 transition-colors"
                >
                  Post Note
                </button>
              </div>
            </div>
          </div>
        )}
      </Drawer>

      {/* Action Transition Modal with REQUIRED Reason */}
      <Modal
        isOpen={actionModal.isOpen}
        onClose={() => setActionModal({ isOpen: false, type: 'ASSIGN' })}
        title={
          actionModal.type === 'ASSIGN'
            ? 'Assign Case Reviewer'
            : actionModal.type === 'ESCALATE'
            ? 'Escalate Case to Compliance Officer'
            : actionModal.type === 'RESOLVE'
            ? 'Resolve Case & Clear Transaction'
            : actionModal.type === 'FALSE_POSITIVE'
            ? 'Mark Case as False Positive'
            : 'Update Status to Under Review'
        }
        subtitle={`Case ID: ${selectedAlertId}`}
        footer={
          <>
            <button
              onClick={() => setActionModal({ isOpen: false, type: 'ASSIGN' })}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              disabled={isSubmitting}
              onClick={actionModal.type === 'ASSIGN' ? handleExecuteAssign : handleExecuteStatusUpdate}
              className="px-4 py-1.5 rounded-lg bg-navy-900 text-amber-300 hover:bg-navy-800 text-xs font-bold shadow-xs disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting...' : 'Confirm Action'}
            </button>
          </>
        }
      >
        <div className="space-y-4 text-xs">
          {actionModal.type === 'ASSIGN' ? (
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Select Assignee Email:</label>
              <input
                type="text"
                value={assigneeInput}
                onChange={(e) => setAssigneeInput(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          ) : (
            <>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Compliance Rationale / Reason <span className="text-red-500">*</span>:
                </label>
                <textarea
                  rows={3}
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="Document the regulatory and risk rationale for this case state transition..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Optional Investigation Note:
                </label>
                <input
                  type="text"
                  value={newNoteInput}
                  onChange={(e) => setNewNoteInput(e.target.value)}
                  placeholder="Additional case commentary..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none"
                />
              </div>
            </>
          )}

          <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800 flex items-start space-x-2">
            <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              This action will be permanently recorded in the append-only regulatory audit log with your actor identity and correlation ID.
            </span>
          </div>
        </div>
      </Modal>
    </div>
  );
};
