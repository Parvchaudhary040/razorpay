import React from 'react';
import { AuditLog } from '../../types';

interface AuditTableProps {
  logs: AuditLog[];
}

export const AuditTable: React.FC<AuditTableProps> = ({ logs }) => {
  if (logs.length === 0) {
    return (
      <div className="bg-[#2a2a3e] border border-slate-800 rounded-xl p-8 text-center text-slate-500 text-xs">
        No audit events recorded for your account yet.
      </div>
    );
  }

  return (
    <div className="bg-[#2a2a3e] border border-slate-800 rounded-xl overflow-hidden shadow-lg">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#1e1e2e] border-b border-slate-800 text-xs uppercase font-bold text-slate-400">
              <th className="px-6 py-4">Timestamp</th>
              <th className="px-6 py-4">Event Type</th>
              <th className="px-6 py-4">Actor</th>
              <th className="px-6 py-4">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 text-sm text-slate-300">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-[#2e2e46]/30 transition">
                <td className="px-6 py-4 font-mono text-xs whitespace-nowrap text-slate-400">
                  {new Date(log.createdAt).toLocaleString()}
                </td>
                <td className="px-6 py-4">
                  <span className="font-semibold text-indigo-400">{log.eventType}</span>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`text-xs px-2 py-0.5 rounded font-mono uppercase font-semibold border ${
                      log.actor === 'user'
                        ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                        : log.actor === 'agent'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    {log.actor}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <pre className="text-xs text-slate-400 font-mono overflow-x-auto max-w-xs md:max-w-md bg-[#1e1e2e] p-2 rounded border border-slate-800">
                    {JSON.stringify(log.payload, null, 2)}
                  </pre>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};