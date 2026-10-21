import { getCurrentSessionUser } from '@/lib/auth';
import { getSystemAuditLogs } from '@/app/actions/adminActions';
import { Role } from '@prisma/client';
import { redirect } from 'next/navigation';

type AuditLogItem = Awaited<ReturnType<typeof getSystemAuditLogs>>[number];

export default async function AdminPage() {
    const user = await getCurrentSessionUser();
    if (!user || user.role !== Role.ADMIN) {
        redirect('/dashboard');
    }

    const logs: AuditLogItem[] = await getSystemAuditLogs();

    return (
        <div className="min-h-screen bg-gray-950 text-gray-100 p-8">
            {/* Header */}
            <header className="flex justify-between items-center mb-8 border-b border-gray-800 pb-4">
                <div>
                    <h1 className="text-2xl font-bold text-indigo-400">TrustVault Administration Panel</h1>
                    <p className="text-sm text-gray-400">System Oversight & Audit Log Monitoring</p>
                </div>
                <div>
                    <a
                        href="/dashboard"
                        className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg text-sm font-medium transition"
                    >
                        Back to Dashboard
                    </a>
                </div>
            </header>

            {/* Global Audit Logs Table */}
            <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 shadow-lg">
                <h2 className="text-lg font-semibold mb-4 text-indigo-300">System Audit Trail</h2>

                {logs.length === 0 ? (
                    <p className="text-gray-500 text-sm italic">No audit events recorded yet.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="border-b border-gray-800 text-gray-400">
                                    <th className="py-3 px-4">Timestamp</th>
                                    <th className="py-3 px-4">User</th>
                                    <th className="py-3 px-4">Action</th>
                                    <th className="py-3 px-4">Entity Type</th>
                                    <th className="py-3 px-4">Details / Metadata</th>
                                    <th className="py-3 px-4 font-mono">Hash Record</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800 text-gray-300">
                                {logs.map((log: AuditLogItem) => {
                                    // Safe access helper for properties that might not be in the inferred select type
                                    const logRecord = log as Record<string, unknown>;
                                    const timestampVal = (logRecord.timestamp || logRecord.createdAt) as string | Date | undefined;
                                    const hashVal = (logRecord.currentHash || logRecord.hash || '—') as string;

                                    return (
                                        <tr key={log.id} className="hover:bg-gray-950/50 transition">
                                            <td className="py-3 px-4 whitespace-nowrap text-gray-400">
                                                {timestampVal ? new Date(timestampVal).toLocaleString() : '—'}
                                            </td>
                                            <td className="py-3 px-4 font-medium text-white">
                                                {log.user ? `${log.user.email} (${log.user.role})` : 'SYSTEM / UNKNOWN'}
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className="px-2 py-1 bg-indigo-950 text-indigo-300 rounded border border-indigo-800 font-mono text-[10px]">
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4">{log.entityType}</td>
                                            <td className="py-3 px-4 max-w-xs truncate text-gray-400" title={typeof log.details === 'string' ? log.details : ''}>
                                                {log.details || '—'}
                                            </td>
                                            <td className="py-3 px-4 font-mono text-[10px] text-gray-500 max-w-[120px] truncate" title={hashVal}>
                                                {hashVal}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}