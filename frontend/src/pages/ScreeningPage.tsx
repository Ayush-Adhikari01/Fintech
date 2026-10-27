import React, { useEffect, useState } from 'react';
import {
  SearchCheck,
  Search,
  Filter,
  RefreshCw,
  ShieldAlert,
  Sliders,
  CheckCircle,
  AlertTriangle,
  History,
  Info,
} from 'lucide-react';
import {
  fetchWatchlist,
  screenEntity,
  fetchScreeningHistory,
  updateScreeningStatus,
} from '../services/api';
import { Table } from '../components/common/Table';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';

export const ScreeningPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'SCREEN' | 'WATCHLIST' | 'HISTORY'>('SCREEN');

  // Screening Tool State
  const [queryName, setQueryName] = useState<string>('Viktor Mikhailov');
  const [similarityThreshold, setSimilarityThreshold] = useState<number>(0.75);
  const [targetType, setTargetType] = useState<string>('AD_HOC');
  const [screeningResult, setScreeningResult] = useState<any>(null);
  const [isScreening, setIsScreening] = useState<boolean>(false);

  // Watchlist State
  const [watchlist, setWatchlist] = useState<any[]>([]);
  const [watchlistSearch, setWatchlistSearch] = useState<string>('');
  const [regimeFilter, setRegimeFilter] = useState<string>('ALL');
  const [isWatchlistLoading, setIsWatchlistLoading] = useState<boolean>(false);

  // History State
  const [history, setHistory] = useState<any[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState<boolean>(false);

  // Review Modal
  const [reviewModal, setReviewModal] = useState<{
    isOpen: boolean;
    screeningId?: string;
    targetStatus?: string;
  }>({ isOpen: false });
  const [reviewReason, setReviewReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const loadWatchlist = async () => {
    try {
      setIsWatchlistLoading(true);
      const res = await fetchWatchlist(watchlistSearch.trim() || undefined, regimeFilter !== 'ALL' ? regimeFilter : undefined);
      setWatchlist(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsWatchlistLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      setIsHistoryLoading(true);
      const res = await fetchScreeningHistory(50);
      setHistory(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'WATCHLIST') loadWatchlist();
    if (activeTab === 'HISTORY') loadHistory();
  }, [activeTab, regimeFilter]);

  const handleExecuteScreen = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!queryName.trim()) return;
    try {
      setIsScreening(true);
      const res = await screenEntity({
        name: queryName.trim(),
        threshold: similarityThreshold,
        target_type: targetType,
      });
      setScreeningResult(res.data);
    } catch (err: any) {
      alert(`Screening failed: ${err.message}`);
    } finally {
      setIsScreening(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!reviewModal.screeningId || !reviewModal.targetStatus) return;
    if (!reviewReason.trim()) {
      alert('Documented rationale is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      await updateScreeningStatus(reviewModal.screeningId, reviewModal.targetStatus, reviewReason.trim());
      setReviewModal({ isOpen: false });
      setReviewReason('');
      if (activeTab === 'HISTORY') loadHistory();
      if (screeningResult) {
        // refresh current screen
        screenEntity({ name: queryName.trim(), threshold: similarityThreshold, target_type: targetType })
          .then((r) => setScreeningResult(r.data))
          .catch(() => {});
      }
    } catch (err: any) {
      alert(`Error updating screening status: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const watchlistColumns = [
    {
      header: 'ID',
      accessor: (row: any) => <span className="font-mono font-semibold text-slate-800">{row.id}</span>,
    },
    {
      header: 'Entity / Individual Name',
      accessor: (row: any) => <span className="font-semibold text-slate-900">{row.name}</span>,
    },
    {
      header: 'Type',
      accessor: (row: any) => (
        <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
          {row.entity_type}
        </span>
      ),
    },
    {
      header: 'Country',
      accessor: (row: any) => (
        <span className="font-mono font-semibold text-xs px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200">
          {row.country}
        </span>
      ),
    },
    {
      header: 'Regime',
      accessor: (row: any) => (
        <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
          {row.regime}
        </span>
      ),
    },
    {
      header: 'Sanctions Program',
      accessor: (row: any) => <span className="font-mono text-xs text-slate-600">{row.program}</span>,
    },
    {
      header: 'Remarks',
      accessor: (row: any) => <span className="text-xs text-slate-500 italic">{row.remarks}</span>,
    },
  ];

  const historyColumns = [
    {
      header: 'Screening ID',
      accessor: (row: any) => <span className="font-mono font-semibold text-slate-800">{row.id}</span>,
    },
    {
      header: 'Timestamp',
      accessor: (row: any) => (
        <span className="font-mono text-xs text-slate-500">
          {row.created_at ? row.created_at.replace('T', ' ').substring(0, 19) : ''}
        </span>
      ),
    },
    {
      header: 'Target Query',
      accessor: (row: any) => <span className="font-bold text-slate-900">{row.query_name}</span>,
    },
    {
      header: 'Matched Watchlist Entity',
      accessor: (row: any) => (
        <div>
          <div className="font-semibold text-slate-800">{row.matched_name || 'No Direct Match'}</div>
          {row.matched_regime && (
            <div className="text-[11px] text-amber-700 font-mono">
              {row.matched_regime} &bull; {row.matched_country}
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Similarity',
      accessor: (row: any) => (
        <span className="font-mono font-bold text-slate-800">
          {Math.round(row.match_score * 100)}%
        </span>
      ),
    },
    {
      header: 'Review State',
      accessor: (row: any) => (
        <Badge
          variant="status"
          value={row.status === 'POTENTIAL_MATCH' ? 'UNDER_REVIEW' : row.status === 'CLEARED' ? 'RESOLVED' : 'ESCALATED'}
        />
      ),
    },
    {
      header: 'Review Notes',
      accessor: (row: any) => <span className="text-xs text-slate-600">{row.notes}</span>,
    },
    {
      header: 'Actions',
      accessor: (row: any) =>
        row.status === 'POTENTIAL_MATCH' ? (
          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => setReviewModal({ isOpen: true, screeningId: row.id, targetStatus: 'CLEARED' })}
              className="px-2 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-[11px]"
            >
              Clear
            </button>
            <button
              onClick={() => setReviewModal({ isOpen: true, screeningId: row.id, targetStatus: 'ESCALATED' })}
              className="px-2 py-0.5 rounded bg-red-50 hover:bg-red-100 text-red-700 font-semibold text-[11px]"
            >
              Escalate
            </button>
          </div>
        ) : null,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Sanctions & Watchlist Screening
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Screen customers, accounts and counterparties against the synthetic sanctions register with fuzzy Levenshtein matching.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 flex space-x-4 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('SCREEN')}
          className={`pb-3 px-1 border-b-2 transition-all ${
            activeTab === 'SCREEN'
              ? 'border-amber-500 text-slate-900 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Interactive Screening Tool
        </button>
        <button
          onClick={() => setActiveTab('WATCHLIST')}
          className={`pb-3 px-1 border-b-2 transition-all ${
            activeTab === 'WATCHLIST'
              ? 'border-amber-500 text-slate-900 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Synthetic Watchlist Database (30 entries)
        </button>
        <button
          onClick={() => setActiveTab('HISTORY')}
          className={`pb-3 px-1 border-b-2 transition-all ${
            activeTab === 'HISTORY'
              ? 'border-amber-500 text-slate-900 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Screening Audit History
        </button>
      </div>

      {/* TAB 1: Interactive Screening Tool */}
      {activeTab === 'SCREEN' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900 mb-4 flex items-center space-x-2">
              <SearchCheck className="w-4 h-4 text-amber-600" />
              <span>Real-Time Name & Entity Screening Engine</span>
            </h2>

            <form onSubmit={handleExecuteScreen} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-slate-700 font-semibold mb-1">
                    Entity / Person Name to Screen:
                  </label>
                  <input
                    type="text"
                    required
                    value={queryName}
                    onChange={(e) => setQueryName(e.target.value)}
                    placeholder="Enter name (e.g. Viktor Mikhailov, Caspian Petrochem, Sergei Belov)..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Screening Target Type:</label>
                  <select
                    value={targetType}
                    onChange={(e) => setTargetType(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none"
                  >
                    <option value="AD_HOC">Ad-Hoc Query</option>
                    <option value="CUSTOMER">Customer Profile</option>
                    <option value="COUNTERPARTY">Counterparty Institution</option>
                  </select>
                </div>
              </div>

              {/* Similarity Threshold Slider */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <Sliders className="w-4 h-4 text-slate-500" />
                  <div>
                    <span className="font-semibold text-slate-800">Fuzzy Similarity Match Threshold:</span>
                    <p className="text-[11px] text-slate-500">
                      Minimum normalized Levenshtein score required to flag candidate hit.
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <input
                    type="range"
                    min="0.50"
                    max="1.00"
                    step="0.05"
                    value={similarityThreshold}
                    onChange={(e) => setSimilarityThreshold(parseFloat(e.target.value))}
                    className="w-32 accent-amber-500"
                  />
                  <span className="font-mono font-bold text-slate-900 w-12 text-right">
                    {Math.round(similarityThreshold * 100)}%
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center space-x-2 text-slate-500 text-[11px]">
                  <Info className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    Try quick preset:{' '}
                    <button
                      type="button"
                      onClick={() => setQueryName('Viktor Mikhailov')}
                      className="text-amber-700 underline font-medium"
                    >
                      Viktor Mikhailov
                    </button>{' '}
                    or{' '}
                    <button
                      type="button"
                      onClick={() => setQueryName('Caspian Petrochem')}
                      className="text-amber-700 underline font-medium"
                    >
                      Caspian Petrochem
                    </button>
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={isScreening || !queryName.trim()}
                  className="px-5 py-2.5 bg-navy-900 hover:bg-navy-800 text-amber-300 rounded-xl font-bold shadow-sm transition-colors disabled:opacity-50 flex items-center space-x-2"
                >
                  <SearchCheck className="w-4 h-4" />
                  <span>{isScreening ? 'Screening Register...' : 'Run Sanctions Screen'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Screening Results Card */}
          {screeningResult && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Screening Results for "{screeningResult.queryName}"
                  </h3>
                  <p className="text-xs text-slate-500">
                    Threshold: {Math.round(screeningResult.threshold * 100)}% &bull; Total Matches Found:{' '}
                    <strong className="text-slate-900">{screeningResult.totalHits}</strong>
                  </p>
                </div>
                {screeningResult.totalHits > 0 ? (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200 flex items-center space-x-1">
                    <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                    <span>POTENTIAL WATCHLIST HIT</span>
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center space-x-1">
                    <CheckCircle className="w-3.5 h-3.5 mr-1" />
                    <span>NO SANCTIONS MATCH (CLEARED)</span>
                  </span>
                )}
              </div>

              {screeningResult.totalHits > 0 ? (
                <div className="space-y-3">
                  {screeningResult.matches.map((hit: any, idx: number) => {
                    const persisted = screeningResult.persistedResults?.[idx];
                    return (
                      <div
                        key={idx}
                        className="p-4 rounded-xl border border-red-200 bg-red-50/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-sm text-slate-900">{hit.watchlistEntry.name}</span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 border border-red-200 font-mono">
                              {hit.matchType} ({Math.round(hit.matchScore * 100)}% match)
                            </span>
                          </div>
                          <div className="text-xs text-slate-600 flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                              {hit.watchlistEntry.regime}
                            </span>
                            <span>Program: {hit.watchlistEntry.program}</span>
                            <span>Jurisdiction: {hit.watchlistEntry.country}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 italic mt-1">{hit.watchlistEntry.remarks}</p>
                        </div>

                        {persisted && (
                          <div className="flex items-center space-x-2 shrink-0">
                            <button
                              onClick={() =>
                                setReviewModal({ isOpen: true, screeningId: persisted.id, targetStatus: 'CLEARED' })
                              }
                              className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-emerald-700 font-bold rounded-lg text-xs transition-colors"
                            >
                              Clear Match
                            </button>
                            <button
                              onClick={() =>
                                setReviewModal({ isOpen: true, screeningId: persisted.id, targetStatus: 'ESCALATED' })
                              }
                              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs shadow-xs transition-colors"
                            >
                              Escalate to SAR
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-100">
                  <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p className="font-semibold text-slate-800 text-sm">Target name cleared with zero sanctions hits.</p>
                  <p className="text-slate-500 text-xs mt-1">
                    Screening result has been committed to the immutable regulatory audit trail.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Watchlist Database */}
      {activeTab === 'WATCHLIST' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-2 flex-1">
              <div className="relative w-72">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={watchlistSearch}
                  onChange={(e) => setWatchlistSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadWatchlist()}
                  placeholder="Search watchlist name or program..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none"
                />
              </div>

              <select
                value={regimeFilter}
                onChange={(e) => setRegimeFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              >
                <option value="ALL">All Sanctions Regimes</option>
                <option value="OFAC_SYNTHETIC">OFAC Synthetic</option>
                <option value="UN_SYNTHETIC">UN Synthetic</option>
                <option value="EU_SYNTHETIC">EU Synthetic</option>
              </select>

              <button
                onClick={loadWatchlist}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg font-semibold text-slate-700"
              >
                Filter
              </button>
            </div>
          </div>

          <Table
            columns={watchlistColumns}
            data={watchlist}
            keyExtractor={(row) => row.id}
            isLoading={isWatchlistLoading}
          />
        </div>
      )}

      {/* TAB 3: Screening Audit History */}
      {activeTab === 'HISTORY' && (
        <div className="space-y-4">
          <Table
            columns={historyColumns}
            data={history}
            keyExtractor={(row) => row.id}
            isLoading={isHistoryLoading}
          />
        </div>
      )}

      {/* Review Match Modal */}
      <Modal
        isOpen={reviewModal.isOpen}
        onClose={() => setReviewModal({ isOpen: false })}
        title={reviewModal.targetStatus === 'CLEARED' ? 'Clear Sanctions Match' : 'Escalate Match for SAR Filing'}
        subtitle={`Screening ID: ${reviewModal.screeningId}`}
        footer={
          <>
            <button
              onClick={() => setReviewModal({ isOpen: false })}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              disabled={isSubmitting}
              onClick={handleUpdateStatus}
              className="px-4 py-1.5 rounded-lg bg-navy-900 text-amber-300 hover:bg-navy-800 text-xs font-bold shadow-xs disabled:opacity-50"
            >
              {isSubmitting ? 'Recording...' : 'Confirm Review'}
            </button>
          </>
        }
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Documented Compliance Rationale <span className="text-red-500">*</span>:
            </label>
            <textarea
              rows={3}
              value={reviewReason}
              onChange={(e) => setReviewReason(e.target.value)}
              placeholder={
                reviewModal.targetStatus === 'CLEARED'
                  ? 'e.g. Identity verified via passport cross-check; false positive on common name spelling.'
                  : 'e.g. Confirmed beneficial ownership match against designated entity; initiated SAR escalation.'
              }
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
              required
            />
          </div>
          <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800">
            This compliance clearance rationale will be persisted with your officer signature to the immutable audit log.
          </div>
        </div>
      </Modal>
    </div>
  );
};
