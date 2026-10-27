import React, { useEffect, useState } from 'react';
import {
  Building2,
  RefreshCw,
  Globe,
  PieChart as PieIcon,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
  ShieldAlert,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { fetchCounterparties, fetchCounterpartyDetail } from '../services/api';
import { Table } from '../components/common/Table';
import { Badge } from '../components/common/Badge';
import { Drawer } from '../components/common/Drawer';

const RISK_COLORS: Record<string, string> = {
  LOW: '#10B981',
  MEDIUM: '#F59E0B',
  HIGH: '#F97316',
  CRITICAL: '#EF4444',
};

export const CounterpartiesPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedCptyId, setSelectedCptyId] = useState<string | null>(null);
  const [cptyDetail, setCptyDetail] = useState<any>(null);
  const [isDetailLoading, setIsDetailLoading] = useState<boolean>(false);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const res = await fetchCounterparties();
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenDetail = async (id: string) => {
    try {
      setSelectedCptyId(id);
      setIsDetailLoading(true);
      const res = await fetchCounterpartyDetail(id);
      setCptyDetail(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDetailLoading(false);
    }
  };

  const columns = [
    {
      header: 'ID',
      accessor: (row: any) => <span className="font-mono font-semibold text-slate-800">{row.id}</span>,
    },
    {
      header: 'Counterparty Entity',
      accessor: (row: any) => (
        <div>
          <div className="font-bold text-slate-900">{row.name}</div>
          <div className="text-[11px] text-slate-500">{row.institution_type}</div>
        </div>
      ),
    },
    {
      header: 'Country',
      accessor: (row: any) => (
        <span className="font-mono font-semibold text-xs px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
          {row.country}
        </span>
      ),
    },
    {
      header: 'Risk Classification',
      accessor: (row: any) => <Badge variant="risk" value={row.risk_level} />,
    },
    {
      header: 'Turnover Exposure Proxy',
      accessor: (row: any) => (
        <div>
          <div className="font-mono font-bold text-slate-900">
            ${Number(row.total_volume_exposure).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            Avg: ${Number(row.avg_transaction_size).toLocaleString()}
          </div>
        </div>
      ),
    },
    {
      header: 'Concentration %',
      accessor: (row: any) => (
        <div className="flex items-center space-x-2">
          <div className="w-16 bg-slate-100 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full ${
                row.concentration_pct > 15 ? 'bg-red-500' : row.concentration_pct > 8 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, row.concentration_pct * 4)}%` }}
            ></div>
          </div>
          <span className="font-mono font-semibold text-xs">{row.concentration_pct}%</span>
        </div>
      ),
    },
    {
      header: 'Transactions',
      accessor: (row: any) => (
        <span className="font-mono font-medium text-slate-700">{row.transaction_count} txs</span>
      ),
    },
    {
      header: 'Flagged / Open Alerts',
      accessor: (row: any) => (
        <div>
          {row.open_alerts_count > 0 ? (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
              {row.open_alerts_count} alerts
            </span>
          ) : (
            <span className="text-slate-400 text-xs">Clean</span>
          )}
        </div>
      ),
    },
  ];

  const counterparties = data?.counterparties || [];
  const geographicConcentration = data?.geographicConcentration || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Counterparty Risk & Exposure Analytics
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor settlement counterparties, transaction turnover concentration, and cross-border routing exposure.
          </p>
        </div>
        <button
          onClick={loadData}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Analytics</span>
        </button>
      </div>

      {/* Methodology Disclaimer Note */}
      <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl text-xs text-slate-700 leading-relaxed flex items-start space-x-2">
        <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <strong>Exposure Methodology Note:</strong> Counterparty exposure figures in this prototype represent cumulative transactional turnover proxy. They should not be confused with outstanding credit limit exposure or unsettled interbank clearing balances.
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Counterparties by Turnover */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Largest Counterparties by Turnover</h2>
              <p className="text-xs text-slate-500">Cumulative settlement volume processed per entity.</p>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">Top 7</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={counterparties.slice(0, 7)}
                layout="vertical"
                margin={{ left: 10, right: 20, top: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                <XAxis type="number" tick={{ fontSize: 9, fill: '#64748B' }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: '#334155' }} width={120} />
                <Tooltip
                  formatter={(val: any) => [`$${Number(val).toLocaleString()}`, 'Turnover Exposure']}
                  contentStyle={{ backgroundColor: '#0B132B', borderRadius: '8px', color: '#fff', fontSize: '11px', border: 'none' }}
                />
                <Bar dataKey="total_volume_exposure" fill="#1C2541" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Geographic Concentration */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Geographic Jurisdiction Concentration</h2>
              <p className="text-xs text-slate-500">Cross-border destination country volume distribution.</p>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">Cross-Border</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={geographicConcentration.slice(0, 8)} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="country" tick={{ fontSize: 10, fill: '#64748B' }} />
                <YAxis tick={{ fontSize: 10, fill: '#64748B' }} />
                <Tooltip
                  formatter={(val: any) => [`$${Number(val).toLocaleString()}`, 'Volume']}
                  contentStyle={{ backgroundColor: '#0B132B', borderRadius: '8px', color: '#fff', fontSize: '11px', border: 'none' }}
                />
                <Bar dataKey="total_volume" fill="#3A506B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Main Counterparties Table */}
      <Table
        columns={columns}
        data={counterparties}
        keyExtractor={(row) => row.id}
        onRowClick={(row) => handleOpenDetail(row.id)}
        isLoading={isLoading}
      />

      {/* Counterparty Drilldown Drawer */}
      <Drawer
        isOpen={Boolean(selectedCptyId)}
        onClose={() => setSelectedCptyId(null)}
        title="Counterparty Risk Profile"
        subtitle={selectedCptyId || ''}
      >
        {isDetailLoading || !cptyDetail ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading counterparty metrics...</div>
        ) : (
          <div className="space-y-6 text-xs">
            {/* Summary */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">{cptyDetail.counterparty.name}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {cptyDetail.counterparty.institution_type} &bull; Jurisdiction:{' '}
                    <span className="font-mono font-bold text-slate-800">{cptyDetail.counterparty.country}</span>
                  </p>
                </div>
                <Badge variant="risk" value={cptyDetail.counterparty.risk_level} className="text-sm px-3 py-1" />
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200 grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-400 block">Total Processed Turnover:</span>
                  <span className="font-mono font-bold text-slate-900">
                    ${Number(cptyDetail.stats?.total_volume || 0).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Transaction Count:</span>
                  <span className="font-mono font-semibold text-slate-800">
                    {cptyDetail.stats?.total_tx_count || 0} transfers
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Critical Risk Flagged:</span>
                  <span className="font-mono font-bold text-red-600">
                    {cptyDetail.stats?.critical_count || 0} txs
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Synthetic Sanctions Target:</span>
                  <span className="font-semibold text-slate-800">
                    {cptyDetail.counterparty.is_sanctioned_proxy ? 'YES (FLAGGED)' : 'NO'}
                  </span>
                </div>
              </div>
            </div>

            {/* Recent Transactions List */}
            <div>
              <h3 className="font-bold text-slate-900 mb-2">Transfers Involving This Counterparty</h3>
              <div className="space-y-1.5 max-h-96 overflow-y-auto">
                {cptyDetail.transactions?.length > 0 ? (
                  cptyDetail.transactions.map((tx: any) => (
                    <div key={tx.id} className="p-2.5 bg-white border border-slate-200 rounded-lg flex items-center justify-between">
                      <div>
                        <div className="font-mono font-semibold text-slate-800">{tx.id}</div>
                        <div className="text-[10px] text-slate-500">
                          {tx.created_at?.substring(0, 19).replace('T', ' ')} &bull; {tx.channel}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold text-slate-900">${tx.amount?.toFixed(2)}</div>
                        <Badge variant="risk" value={tx.risk_band} className="text-[10px]" />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400 italic">No transactions found for this counterparty.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};
