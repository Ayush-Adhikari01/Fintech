import React, { useEffect, useState } from 'react';
import {
  FileCheck,
  Search,
  Filter,
  RefreshCw,
  ShieldCheck,
  Key,
  ShieldAlert,
} from 'lucide-react';
import { fetchAuditEvents } from '../services/api';
import { Table } from '../components/common/Table';

export const AuditPage: React.FC = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actorSearch, setActorSearch] = useState<string>('');
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('ALL');
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('ALL');

  const loadAudit = async (page: number = 1) => {
    try {
      setIsLoading(true);
      const res = await fetchAuditEvents({
        actor: actorSearch.trim() || undefined,
        eventType: eventTypeFilter !== 'ALL' ? eventTypeFilter : undefined,
        entityType: entityTypeFilter !== 'ALL' ? entityTypeFilter : undefined,
        page,
        limit: 25,
      });
      setEvents(res.data);
      setPagination(res.pagination);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAudit(1);
  }, [eventTypeFilter, entityTypeFilter]);

  const columns = [
    {
      header: 'Audit ID',
      accessor: (row: any) => <span className="font-mono font-bold text-slate-800">{row.id}</span>,
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
      header: 'Actor',
      accessor: (row: any) => (
        <span className="font-semibold text-xs text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
          {row.actor}
        </span>
      ),
    },
    {
      header: 'Event Type',
      accessor: (row: any) => (
        <span className="text-xs font-mono font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
          {row.event_type}
        </span>
      ),
    },
    {
      header: 'Entity',
      accessor: (row: any) => (
        <div>
          <span className="text-slate-500 text-[10px] uppercase block">{row.entity_type}</span>
          <span className="font-mono font-semibold text-slate-900">{row.entity_id}</span>
        </div>
      ),
    },
    {
      header: 'Action Taken',
      accessor: (row: any) => <span className="font-semibold text-slate-800">{row.action}</span>,
    },
    {
      header: 'Documented Reason',
      accessor: (row: any) => <span className="text-xs text-slate-600 italic">{row.reason || 'Standard operation'}</span>,
    },
    {
      header: 'Correlation ID',
      accessor: (row: any) => <span className="font-mono text-[10px] text-slate-400">{row.correlation_id}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Immutable Regulatory Audit Log
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Append-only record of all consequential operations, rule changes, case escalations, and system actions.
          </p>
        </div>
        <button
          onClick={() => loadAudit(pagination.page)}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Audit Trail</span>
        </button>
      </div>

      {/* Governance & Architectural Notice */}
      <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-600 leading-relaxed flex items-start space-x-2">
        <ShieldAlert className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
        <div>
          <strong>Governance Architecture Note:</strong> In this prototype, audit records are persisted in an append-only SQLite table with application-level delete restrictions. In a production enterprise deployment, this would be mirrored to a tamper-proof write-once-read-many (WORM) cloud ledger or blockchain infrastructure.
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={actorSearch}
              onChange={(e) => setActorSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadAudit(1)}
              placeholder="Search actor email..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none"
            />
          </div>

          <select
            value={eventTypeFilter}
            onChange={(e) => setEventTypeFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
          >
            <option value="ALL">All Event Types</option>
            <option value="TRANSACTION_INGEST">Transaction Ingest</option>
            <option value="ALERT_STATUS_CHANGE">Alert Status Change</option>
            <option value="ALERT_ASSIGN">Alert Assignment</option>
            <option value="CUSTOMER_UPDATE">Customer Update</option>
            <option value="SCREENING_EXECUTE">Screening Execution</option>
            <option value="RULE_CONFIG_CHANGE">Rule Config Change</option>
            <option value="STRESS_TEST_EXECUTE">Stress Test Execution</option>
            <option value="DEMO_DATA_RESET">Demo Data Reset</option>
          </select>

          <select
            value={entityTypeFilter}
            onChange={(e) => setEntityTypeFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
          >
            <option value="ALL">All Entity Types</option>
            <option value="TRANSACTION">Transaction</option>
            <option value="ALERT">Alert</option>
            <option value="CUSTOMER">Customer</option>
            <option value="RISK_RULE">Risk Rule</option>
            <option value="WATCHLIST">Watchlist</option>
            <option value="STRESS_SCENARIO">Stress Scenario</option>
            <option value="DATABASE">Database</option>
          </select>

          <button
            onClick={() => loadAudit(1)}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg font-semibold text-slate-700"
          >
            Filter
          </button>
        </div>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        data={events}
        keyExtractor={(row) => row.id}
        isLoading={isLoading}
        pagination={{
          page: pagination.page,
          totalPages: pagination.totalPages,
          total: pagination.total,
          onPageChange: (newPage) => loadAudit(newPage),
        }}
      />
    </div>
  );
};
