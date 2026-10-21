import { getCurrentSessionUser } from '@/lib/auth';
import { getAccessibleDocuments } from '@/app/actions/documentActions';
import { logoutAction } from '@/app/actions/authActions';
import { Role } from '@prisma/client';
import { redirect } from 'next/navigation';

// Type-safe document item inferred directly from your Prisma query function
type DocumentItem = Awaited<ReturnType<typeof getAccessibleDocuments>>[number];

// Explicit interface for the session user
interface SessionUser {
    id: string;
    email: string;
    name?: string;
    role: Role;
}

export default async function DashboardPage({
    searchParams,
}: {
    searchParams: Promise<{ name?: string; category?: string }>;
}) {
    const rawUser = await getCurrentSessionUser();
    if (!rawUser) {
        redirect('/login');
    }

    const user = rawUser as unknown as SessionUser;

    const params = await searchParams;
    const documents = await getAccessibleDocuments({
        name: params.name,
        category: params.category,
    });

    return (
        <div className="min-h-screen bg-gray-950 text-gray-100 p-8">
            {/* Header */}
            <header className="flex justify-between items-center mb-8 border-b border-gray-800 pb-4">
                <div>
                    <h1 className="text-2xl font-bold text-indigo-400">TrustVault Dashboard</h1>
                    <p className="text-sm text-gray-400">
                        Welcome, <span className="text-white font-medium">{user.name || user.email}</span> ({user.role})
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    {user.role === Role.ADMIN && (
                        <a
                            href="/admin"
                            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-indigo-300 rounded-lg text-sm font-medium transition"
                        >
                            Admin Audit Panel
                        </a>
                    )}
                    <form action={logoutAction}>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-red-900/40 hover:bg-red-900/60 text-red-200 rounded-lg text-sm font-medium transition border border-red-800"
                        >
                            Sign Out
                        </button>
                    </form>
                </div>
            </header>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Document Upload (Owners & Admins Only) */}
                {(user.role === Role.ADMIN || user.role === Role.OWNER) && (
                    <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 shadow-lg h-fit">
                        <h2 className="text-lg font-semibold mb-4 text-indigo-300">Upload Confidential Document</h2>
                        <form action="/api/documents/upload" method="POST" encType="multipart/form-data" className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Document Title</label>
                                <input
                                    name="title"
                                    type="text"
                                    required
                                    className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                    placeholder="e.g. Q4 Salary Audit"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Category</label>
                                <input
                                    name="category"
                                    type="text"
                                    required
                                    className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                    placeholder="e.g. Finance, HR, Legal"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Select File (PDF, DOCX, XLSX, Image)</label>
                                <input
                                    name="file"
                                    type="file"
                                    required
                                    className="w-full text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500"
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition"
                            >
                                Upload & Encrypt Securely
                            </button>
                        </form>
                    </div>
                )}

                {/* Right/Main Column: Accessible Documents List */}
                <div className={`lg:col-span-${user.role === Role.VIEWER ? '3' : '2'} space-y-6`}>
                    <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 shadow-lg">
                        <h2 className="text-lg font-semibold mb-4 text-indigo-300">Accessible Documents</h2>

                        {documents.length === 0 ? (
                            <p className="text-gray-500 text-sm italic">No documents found or currently shared with you.</p>
                        ) : (
                            <div className="space-y-4">
                                {documents.map((doc: DocumentItem) => (
                                    <div key={doc.id} className="p-4 bg-gray-950 border border-gray-800 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                        <div>
                                            <h3 className="font-semibold text-gray-200">{doc.title}</h3>
                                            <p className="text-xs text-gray-400">Category: <span className="text-indigo-400">{doc.category}</span> | Original: {doc.originalName}</p>
                                            <p className="text-xs text-gray-500 mt-1">Uploaded: {new Date(doc.createdAt).toLocaleDateString()}</p>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <a
                                                href={`/api/documents/${doc.id}/download`}
                                                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-xs font-medium transition"
                                            >
                                                Secure Download
                                            </a>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}