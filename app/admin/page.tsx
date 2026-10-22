import { getCurrentSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';
import { redirect } from 'next/navigation';

export default async function AdminAuditPage() {
    const user = await getCurrentSessionUser();

    if (!user || user.role !== Role.ADMIN) {
        redirect('/dashboard');
    }

    const auditLogs = await prisma.auditLog.findMany({
        orderBy: { timestamp: 'desc' },
        take: 50,
        include: {
            user: { select: { email: true, name: true } },
            document: { select: { title: true } },
        },
    });

    return (
        <div className="min-h-screen bg-[#07090e] text-slate-100 p-6 md:p-10 font-sans">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Header */}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#0f172a] p-6 rounded-2xl border border-slate-700/60 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.8)]">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-1">
                            Admin Audit Panel
                        </h1>
                        <p className="text-sm text-slate-400">
                            System security logs and activity tracking.
                        </p>
                    </div>
                    <div>
                        <a
                            href="/dashboard"
                            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-blue-300 rounded-xl text-sm font-semibold transition border border-slate-700 shadow-sm"
                        >
                            Back to Dashboard
                        </a>
                    </div>
                </header>

                {/* Audit Logs Table Card */}
                <div className="bg-[#0f172a] p-6 md:p-8 rounded-2xl border border-slate-700/60 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.8)]">
                    <h2 className="text-lg font-bold mb-6 text-white tracking-wide border-b border-slate-800 pb-3">
                        Recent System Audit Logs
                    </h2>

                    {auditLogs.length === 0 ? (
                        <p className="text-slate-500 text-sm italic py-4 text-center">
                            No audit logs recorded yet.
                        </p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-sm">
                                <thead>
                                    <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                                        <th className="py-3 px-4">Timestamp</th>
                                        <th className="py-3 px-4">User</th>
                                        <th className="py-3 px-4">Action</th>
                                        <th className="py-3 px-4">Target Entity</th>
                                        <th className="py-3 px-4">Status</th>
                                        <th className="py-3 px-4">IP Address</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/60">
                                    {auditLogs.map((log) => (
                                        <tr key={log.id} className="hover:bg-slate-800/40 transition">
                                            <td className="py-3 px-4 text-slate-400 text-xs">
                                                {new Date(log.timestamp).toLocaleString()}
                                            </td>
                                            <td className="py-3 px-4 font-medium text-white">
                                                {log.user?.email || 'System / Guest'}
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-800 text-blue-300 border border-slate-700">
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-slate-300">
                                                {log.document?.title || log.entityType}
                                            </td>
                                            <td className="py-3 px-4">
                                                {log.success ? (
                                                    <span className="text-emerald-400 font-semibold text-xs">SUCCESS</span>
                                                ) : (
                                                    <span className="text-red-400 font-semibold text-xs">FAILED</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-slate-400 text-xs">
                                                {log.ipAddress}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}