import React, { useEffect, useState } from 'react';
import {
  Users,
  Search,
  Filter,
  RefreshCw,
  Plus,
  ShieldCheck,
  Building,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
} from 'lucide-react';
import {
  fetchCustomers,
  fetchCustomerDetail,
  updateCustomer,
  createCustomer,
} from '../services/api';
import { Table } from '../components/common/Table';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { Drawer } from '../components/common/Drawer';

export const CustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [kycFilter, setKycFilter] = useState<string>('ALL');
  const [riskFilter, setRiskFilter] = useState<string>('ALL');

  // Customer Detail Drawer
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerDetail, setCustomerDetail] = useState<any>(null);
  const [isDetailLoading, setIsDetailLoading] = useState<boolean>(false);

  // Edit / Onboard Modals
  const [editKycModal, setEditKycModal] = useState<boolean>(false);
  const [newKycStatus, setNewKycStatus] = useState<string>('VERIFIED');
  const [newRiskRating, setNewRiskRating] = useState<string>('LOW');
  const [newTurnover, setNewTurnover] = useState<number>(15000);

  const [createModal, setCreateModal] = useState<boolean>(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    type: 'CORPORATE',
    country: 'US',
    kyc_status: 'VERIFIED',
    risk_rating: 'LOW',
    occupation_or_industry: '',
    monthly_expected_turnover: 50000,
    initial_account_currency: 'USD',
    initial_account_balance: 25000,
  });

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const loadCustomers = async (page: number = 1) => {
    try {
      setIsLoading(true);
      const res = await fetchCustomers({
        search: search.trim() || undefined,
        kycStatus: kycFilter !== 'ALL' ? kycFilter : undefined,
        riskRating: riskFilter !== 'ALL' ? riskFilter : undefined,
        page,
        limit: 20,
      });
      setCustomers(res.data);
      setPagination(res.pagination);
    } catch (err) {
      console.error('Failed to load customers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers(1);
  }, [kycFilter, riskFilter]);

  const handleOpenDetail = async (id: string) => {
    try {
      setSelectedCustomerId(id);
      setIsDetailLoading(true);
      const res = await fetchCustomerDetail(id);
      setCustomerDetail(res.data);
      setNewKycStatus(res.data.customer.kyc_status);
      setNewRiskRating(res.data.customer.risk_rating);
      setNewTurnover(res.data.customer.monthly_expected_turnover);
    } catch (err) {
      console.error('Failed to load customer detail:', err);
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleUpdateKyc = async () => {
    if (!selectedCustomerId) return;
    try {
      setIsSubmitting(true);
      await updateCustomer(selectedCustomerId, {
        kyc_status: newKycStatus as any,
        risk_rating: newRiskRating as any,
        monthly_expected_turnover: newTurnover,
      });
      setEditKycModal(false);
      const res = await fetchCustomerDetail(selectedCustomerId);
      setCustomerDetail(res.data);
      loadCustomers(pagination.page);
    } catch (err: any) {
      alert(`Error updating customer: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const res = await createCustomer(createForm);
      setCreateModal(false);
      loadCustomers(1);
      if (res.data?.customer?.id) {
        handleOpenDetail(res.data.customer.id);
      }
    } catch (err: any) {
      alert(`Error onboarding customer: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    {
      header: 'Customer ID',
      accessor: (row: any) => (
        <span className="font-mono font-semibold text-slate-900 hover:text-amber-600 transition-colors">
          {row.id}
        </span>
      ),
    },
    {
      header: 'Customer Name',
      accessor: (row: any) => (
        <div>
          <div className="font-semibold text-slate-800">{row.name}</div>
          <div className="text-[11px] text-slate-500">{row.occupation_or_industry}</div>
        </div>
      ),
    },
    {
      header: 'Type',
      accessor: (row: any) => (
        <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-700">
          {row.type}
        </span>
      ),
    },
    {
      header: 'Jurisdiction',
      accessor: (row: any) => (
        <span className="font-semibold text-xs text-slate-700 px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
          {row.country}
        </span>
      ),
    },
    {
      header: 'KYC Status',
      accessor: (row: any) => <Badge variant="kyc" value={row.kyc_status} />,
    },
    {
      header: 'Risk Classification',
      accessor: (row: any) => <Badge variant="risk" value={row.risk_rating} />,
    },
    {
      header: 'Expected Turnover',
      accessor: (row: any) => (
        <span className="font-mono font-bold text-slate-900">
          ${Number(row.monthly_expected_turnover).toLocaleString()}
          <span className="text-[10px] text-slate-400 font-normal ml-0.5">/mo</span>
        </span>
      ),
    },
    {
      header: 'Accounts',
      accessor: (row: any) => (
        <span className="font-mono font-semibold text-slate-700">
          {row.accounts_count} {row.accounts_count === 1 ? 'acc' : 'accs'}
        </span>
      ),
    },
    {
      header: 'Open Alerts',
      accessor: (row: any) =>
        row.open_alerts_count > 0 ? (
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
            {row.open_alerts_count} active
          </span>
        ) : (
          <span className="text-slate-400 text-xs">None</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Customer Directory & KYC Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage customer risk profiles, verify KYC documentation states, and inspect linked accounts.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => loadCustomers(pagination.page)}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setCreateModal(true)}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-navy-900 text-amber-300 hover:bg-navy-800 rounded-lg text-xs font-bold shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Onboard Customer</span>
          </button>
        </div>
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
              onKeyDown={(e) => e.key === 'Enter' && loadCustomers(1)}
              placeholder="Search customer, industry..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs"
            />
          </div>

          <select
            value={kycFilter}
            onChange={(e) => setKycFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none"
          >
            <option value="ALL">All KYC States</option>
            <option value="VERIFIED">Verified</option>
            <option value="PENDING">Pending</option>
            <option value="EXPIRED">Expired</option>
            <option value="REJECTED">Rejected</option>
          </select>

          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none"
          >
            <option value="ALL">All Risk Ratings</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          <button
            onClick={() => loadCustomers(1)}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg font-semibold text-slate-700 transition-colors"
          >
            Filter
          </button>
        </div>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        data={customers}
        keyExtractor={(row) => row.id}
        onRowClick={(row) => handleOpenDetail(row.id)}
        isLoading={isLoading}
        pagination={{
          page: pagination.page,
          totalPages: pagination.totalPages,
          total: pagination.total,
          onPageChange: (newPage) => loadCustomers(newPage),
        }}
      />

      {/* Customer Detail Drawer */}
      <Drawer
        isOpen={Boolean(selectedCustomerId)}
        onClose={() => setSelectedCustomerId(null)}
        title="Customer Compliance Profile"
        subtitle={selectedCustomerId || ''}
      >
        {isDetailLoading || !customerDetail ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading customer profile...</div>
        ) : (
          <div className="space-y-6 text-xs">
            {/* Customer Summary Card */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">{customerDetail.customer.name}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {customerDetail.customer.type} &bull; {customerDetail.customer.country} &bull;{' '}
                    {customerDetail.customer.occupation_or_industry}
                  </p>
                </div>
                <button
                  onClick={() => setEditKycModal(true)}
                  className="px-3 py-1 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-700 shadow-2xs"
                >
                  Edit KYC / Risk
                </button>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200 grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-400 block">KYC Status:</span>
                  <Badge variant="kyc" value={customerDetail.customer.kyc_status} />
                </div>
                <div>
                  <span className="text-slate-400 block">Risk Rating:</span>
                  <Badge variant="risk" value={customerDetail.customer.risk_rating} />
                </div>
                <div>
                  <span className="text-slate-400 block">Expected Monthly Turnover:</span>
                  <span className="font-mono font-bold text-slate-900">
                    ${Number(customerDetail.customer.monthly_expected_turnover).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Customer Since:</span>
                  <span className="font-mono text-slate-600">
                    {customerDetail.customer.created_at ? customerDetail.customer.created_at.substring(0, 10) : ''}
                  </span>
                </div>
              </div>
            </div>

            {/* Linked Bank Accounts */}
            <div>
              <h3 className="font-bold text-slate-900 mb-2 flex items-center justify-between">
                <span>Associated Demo Accounts</span>
                <span className="text-slate-400 font-normal text-[11px]">
                  {customerDetail.accounts?.length} linked
                </span>
              </h3>
              <div className="space-y-2">
                {customerDetail.accounts?.map((acc: any) => (
                  <div key={acc.id} className="p-3 bg-white border border-slate-200 rounded-lg flex items-center justify-between">
                    <div>
                      <div className="font-mono font-bold text-slate-900">{acc.id}</div>
                      <div className="text-[11px] text-slate-500">Status: {acc.status}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-slate-900">
                        ${Number(acc.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })} {acc.currency}
                      </div>
                      <Badge variant="status" value={acc.status} className="mt-0.5" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Transactions */}
            <div>
              <h3 className="font-bold text-slate-900 mb-2">Recent Ingested Activity</h3>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {customerDetail.recentTransactions?.length > 0 ? (
                  customerDetail.recentTransactions.map((tx: any) => (
                    <div key={tx.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
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
                  <p className="text-slate-400 italic">No recent transactions recorded.</p>
                )}
              </div>
            </div>

            {/* Linked Open Alerts */}
            {customerDetail.alerts?.length > 0 && (
              <div>
                <h3 className="font-bold text-slate-900 mb-2">Associated Compliance Alerts</h3>
                <div className="space-y-2">
                  {customerDetail.alerts.map((a: any) => (
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

      {/* Edit KYC Modal */}
      <Modal
        isOpen={editKycModal}
        onClose={() => setEditKycModal(false)}
        title="Update Customer KYC & Risk Rating"
        subtitle={`Customer ID: ${selectedCustomerId}`}
        footer={
          <>
            <button
              onClick={() => setEditKycModal(false)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              disabled={isSubmitting}
              onClick={handleUpdateKyc}
              className="px-4 py-1.5 rounded-lg bg-navy-900 text-amber-300 hover:bg-navy-800 text-xs font-bold shadow-xs disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save & Audit'}
            </button>
          </>
        }
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Simulated KYC Verification Status:</label>
            <select
              value={newKycStatus}
              onChange={(e) => setNewKycStatus(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="VERIFIED">Verified (Cleared)</option>
              <option value="PENDING">Pending Verification</option>
              <option value="EXPIRED">Expired Documentation</option>
              <option value="REJECTED">Rejected / Adverse Media</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Assigned Risk Classification:</label>
            <select
              value={newRiskRating}
              onChange={(e) => setNewRiskRating(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="LOW">Low Risk</option>
              <option value="MEDIUM">Medium Risk</option>
              <option value="HIGH">High Risk</option>
              <option value="CRITICAL">Critical Risk</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Monthly Expected Turnover ($):</label>
            <input
              type="number"
              value={newTurnover}
              onChange={(e) => setNewTurnover(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none"
            />
          </div>

          <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800">
            <strong>Audit Note:</strong> Updating KYC status alters deterministic risk scores for all upcoming transactions initiated by this customer.
          </div>
        </div>
      </Modal>

      {/* Onboard Customer Modal */}
      <Modal
        isOpen={createModal}
        onClose={() => setCreateModal(false)}
        title="Onboard Synthetic Customer & Account"
        subtitle="Prototype customer directory registration"
        footer={
          <>
            <button
              onClick={() => setCreateModal(false)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              disabled={isSubmitting}
              onClick={handleCreateCustomer}
              className="px-4 py-1.5 rounded-lg bg-navy-900 text-amber-300 hover:bg-navy-800 text-xs font-bold shadow-xs disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Onboard Customer'}
            </button>
          </>
        }
      >
        <form onSubmit={handleCreateCustomer} className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Customer / Entity Name *:</label>
            <input
              type="text"
              required
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              placeholder="e.g. Acme Financial Technologies"
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Type:</label>
              <select
                value={createForm.type}
                onChange={(e) => setCreateForm({ ...createForm, type: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
              >
                <option value="CORPORATE">Corporate</option>
                <option value="INDIVIDUAL">Individual</option>
                <option value="SME">SME</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Country (ISO-2):</label>
              <input
                type="text"
                maxLength={2}
                required
                value={createForm.country}
                onChange={(e) => setCreateForm({ ...createForm, country: e.target.value.toUpperCase() })}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Industry / Occupation *:</label>
            <input
              type="text"
              required
              value={createForm.occupation_or_industry}
              onChange={(e) => setCreateForm({ ...createForm, occupation_or_industry: e.target.value })}
              placeholder="e.g. Cross-border payments platform"
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Initial KYC Status:</label>
              <select
                value={createForm.kyc_status}
                onChange={(e) => setCreateForm({ ...createForm, kyc_status: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
              >
                <option value="VERIFIED">Verified</option>
                <option value="PENDING">Pending</option>
                <option value="EXPIRED">Expired</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Expected Monthly Turnover:</label>
              <input
                type="number"
                value={createForm.monthly_expected_turnover}
                onChange={(e) =>
                  setCreateForm({ ...createForm, monthly_expected_turnover: parseFloat(e.target.value) || 0 })
                }
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Account Currency:</label>
              <select
                value={createForm.initial_account_currency}
                onChange={(e) => setCreateForm({ ...createForm, initial_account_currency: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Initial Balance ($):</label>
              <input
                type="number"
                value={createForm.initial_account_balance}
                onChange={(e) =>
                  setCreateForm({ ...createForm, initial_account_balance: parseFloat(e.target.value) || 0 })
                }
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
              />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};
