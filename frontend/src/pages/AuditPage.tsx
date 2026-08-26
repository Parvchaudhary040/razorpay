import React, { useEffect, useState } from 'react';
import { auditApi } from '../services/auditApi';
import { AuditLog } from '../types';

export const AuditPage: React.FC = () => {
  const [groupedLogs, setGroupedLogs] = useState<Record<string, AuditLog[]>>({});
  const [loading, setLoading] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await auditApi.getLogs();
      if (res.success) {
        setGroupedLogs(res.data);
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
        <p className="text-sm text-slate-400">Workflow Visualization Tree by Agent Run</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-indigo-400">
          <span className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></span>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-[#1a1a26] p-4 rounded-xl border border-slate-800">
            <span className="text-sm font-semibold text-slate-300">
              {Object.keys(groupedLogs).length} Workflows Traced
            </span>
            <button
              onClick={fetchLogs}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold bg-[#2a2a36] px-3 py-1 rounded"
            >
              Refresh Logs
            </button>
          </div>

          {Object.entries(groupedLogs).map(([runId, logs]) => (
            <div key={runId} className="bg-[#12121a] border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-mono text-indigo-400 font-bold bg-indigo-500/10 px-2 py-1 rounded">
                  Run: {runId}
                </div>
                <div className="text-xs text-slate-500">
                  {logs.length} Events
                </div>
              </div>
              
              <div className="pl-4 border-l-2 border-slate-800 space-y-3 relative ml-2">
                {logs.map((log) => (
                  <div key={log.id} className="relative">
                    <div className="absolute -left-6 top-2 w-4 h-0.5 bg-slate-800"></div>
                    <div className="absolute -left-7 top-1 w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]"></div>
                    
                    <div className="bg-[#1a1a26] p-3 rounded-lg border border-slate-800/50 shadow-sm ml-2 group hover:border-indigo-500/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                          log.actor === 'user' ? 'bg-emerald-500/10 text-emerald-400' :
                          log.actor === 'agent' ? 'bg-purple-500/10 text-purple-400' :
                          'bg-amber-500/10 text-amber-400'
                        }`}>
                          {log.actor}
                        </span>
                        <span className="text-xs font-semibold text-slate-200">{log.eventType}</span>
                        <span className="text-[10px] text-slate-500 ml-auto">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      
                      <div className="mt-2 text-xs text-slate-400 bg-[#0f0f13] p-2 rounded border border-slate-800 font-mono overflow-x-auto whitespace-pre-wrap break-all">
                        {JSON.stringify(log.details, null, 2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};