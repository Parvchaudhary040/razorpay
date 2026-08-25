import React, { useEffect, useState } from 'react';
import { auditApi } from '../services/auditApi';
import { AuditTable } from '../components/audit/AuditTable';
import { AuditLog } from '../types';

export const AuditPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await auditApi.getLogs();
      if (res.success) {
        setLogs(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto animate-fadeIn">
      <div>
        <h1 className="text-2xl font-black text-slate-100 uppercase tracking-wider">Security Audit Trail</h1>
        <p className="text-sm text-slate-400">Verifiable log of transactions, tool invocations, and supervisor actions</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-indigo-400">
          <span className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></span>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-[#1a1a26] p-4 rounded-xl border border-slate-800">
            <span className="text-sm font-semibold text-slate-300">
              Audit Logs ({logs.length} events)
            </span>
            <button
              onClick={fetchLogs}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
            >
              Refresh Logs
            </button>
          </div>
          <AuditTable logs={logs} />
        </div>
      )}
    </div>
  );
};