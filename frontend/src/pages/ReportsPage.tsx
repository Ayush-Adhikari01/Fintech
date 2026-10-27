import React, { useEffect, useState } from 'react';
import {
  FileText,
  Download,
  Printer,
  Calendar,
  Filter,
  RefreshCw,
  CheckCircle,
  ShieldCheck,
  ArrowDownToLine,
} from 'lucide-react';
import { fetchReport, downloadReportCsvUrl } from '../services/api';

export const ReportsPage: React.FC = () => {
  const [reportType, setReportType] = useState<string>('TRANSACTIONS');
  const [startDate, setStartDate] = useState<string>('2026-10-01');
  const [endDate, setEndDate] = useState<string>('2026-10-31');
  const [reportData, setReportData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadReport = async () => {
    try {
      setIsLoading(true);
      const res = await fetchReport(reportType, { startDate, endDate });
      setReportData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [reportType]);

  const handlePrint = () => {
    window.print();
  };

  const csvUrl = downloadReportCsvUrl(reportType, { startDate, endDate });

  return (
    <div className="space-y-6">
      {/* Header (hidden in print) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 no-print">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Reports & Regulatory Audit Export
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Generate audit-ready compliance dossiers, transaction monitoring logs, and download RFC 4180 CSV exports.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <a
            href={csvUrl}
            download
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-navy-900 text-amber-300 hover:bg-navy-800 rounded-lg text-xs font-bold shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download CSV</span>
          </a>
          <button
            onClick={handlePrint}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Printable Dossier</span>
          </button>
        </div>
      </div>

      {/* Report Controls (hidden in print) */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs no-print">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Report Specification:</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none"
            >
              <option value="TRANSACTIONS">Transaction Monitoring & Risk Scoring Register</option>
              <option value="ALERTS">Case Investigation & Alert Resolution Summary</option>
              <option value="KYC">Customer KYC & Due Diligence Register</option>
              <option value="COUNTERPARTIES">Counterparty Exposure & Settlement Analytics</option>
              <option value="AUDIT">Immutable Append-Only Regulatory Audit Trail</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Date Range (Start):</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Date Range (End):</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
            />
          </div>

          <div className="self-end">
            <button
              onClick={loadReport}
              className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg font-semibold text-slate-700 transition-colors"
            >
              Update Preview
            </button>
          </div>
        </div>
      </div>

      {/* Printable Report Dossier Preview */}
      <div id="printable-report" className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        {/* Formal Report Header */}
        <div className="border-b border-slate-200 pb-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-navy-900 text-amber-400 flex items-center justify-center font-bold">
                RS
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-900 font-sans tracking-tight">
                  RegTech Sentinel &bull; Risk Intelligence
                </h2>
                <p className="text-[10px] text-slate-500 uppercase font-semibold">Regulatory Compliance Division</p>
              </div>
            </div>
            <div className="text-right text-xs">
              <span className="font-mono font-semibold text-slate-700">REPORT-REF-{Date.now().toString(36).toUpperCase()}</span>
              <p className="text-[10px] text-slate-400">Classification: INTERNAL AUDIT ONLY</p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-600">
            <div>
              <strong>Dossier Title:</strong> {reportData?.title || 'Regulatory Intelligence Report'}
            </div>
            <div>
              <strong>Generated:</strong> {new Date().toISOString().substring(0, 19).replace('T', ' ')} UTC
            </div>
            <div>
              <strong>Total Filtered Records:</strong> <span className="font-bold font-mono">{reportData?.totalRecords || 0}</span>
            </div>
          </div>
        </div>

        {/* Regulatory Disclaimer Banner */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-600 leading-relaxed">
          <strong>SIMULATED PROTOTYPE NOTICE:</strong> This document was compiled from reproducible synthetic financial transaction logs. All named entities, individual identifications, accounts, and jurisdiction exposures are computer-generated benchmark artifacts created strictly for hackathon evaluation.
        </div>

        {/* Report Content Preview (CSV Content preview) */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            Generated Report Preview (RFC 4180 Escape Format)
          </h3>
          <div className="p-4 bg-slate-950 text-emerald-400 rounded-xl font-mono text-[11px] overflow-x-auto max-h-[500px] leading-relaxed shadow-inner">
            <pre className="whitespace-pre-wrap">{reportData?.csv || 'Generating report buffer...'}</pre>
          </div>
        </div>

        {/* Sign-off Footer */}
        <div className="pt-6 border-t border-slate-200 grid grid-cols-2 gap-8 text-xs text-slate-600">
          <div>
            <p className="font-semibold text-slate-800">Generated By Review Officer:</p>
            <p className="text-[11px] text-slate-500 mt-1">Sarah Jenkins (Senior AML Compliance Lead)</p>
            <div className="mt-4 border-b border-dashed border-slate-300 w-48"></div>
            <p className="text-[10px] text-slate-400 mt-1">Digital Officer Signature</p>
          </div>
          <div className="text-right">
            <p className="font-semibold text-slate-800">Governance Verification:</p>
            <p className="text-[11px] text-slate-500 mt-1">System Hash: SHA256-SYNTH-VERIFIED</p>
            <div className="mt-4 border-b border-dashed border-slate-300 w-48 ml-auto"></div>
            <p className="text-[10px] text-slate-400 mt-1">Audit Trail Reference Hash</p>
          </div>
        </div>
      </div>
    </div>
  );
};
