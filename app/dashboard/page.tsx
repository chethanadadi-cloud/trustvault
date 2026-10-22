
import { getCurrentSessionUser } from '@/lib/auth';
import { getAccessibleDocuments } from '@/app/actions/documentActions';
import { logoutAction } from '@/app/actions/authActions';
import { Role } from '@prisma/client';
import { redirect } from 'next/navigation';

type DashboardPageProps = {
    searchParams: Promise<{
        name?: string;
        category?: string;
    }>;
};

export default async function DashboardPage({
    searchParams,
}: DashboardPageProps) {
    const user = await getCurrentSessionUser();

    if (!user) {
        redirect('/login');
    }

    const params = await searchParams;

    const documents = await getAccessibleDocuments({
        title: params.name,
        category: params.category,
    });

    const isOwner = user.role === Role.OWNER;
    const isAdmin = user.role === Role.ADMIN;
    const canUpload = isOwner || isAdmin;

    return (
        <main className="dashboard-page">
            <div className="dashboard-container">
                <header className="dashboard-header">
                    <div className="dashboard-brand">
                        <h1>TrustVault</h1>
                        <p>Secure Document Management</p>
                    </div>

                    <div className="dashboard-header-actions">
                        {isAdmin && (
                            <a href="/admin" className="secondary-button">
                                Admin Audit Panel
                            </a>
                        )}

                        <form action={logoutAction}>
                            <button type="submit" className="sign-out-button">
                                Sign Out
                            </button>
                        </form>
                    </div>
                </header>

                <section className="dashboard-welcome">
                    <div>
                        <p className="section-eyebrow">YOUR WORKSPACE</p>
                        <h2>Welcome back, {user.name || user.email}</h2>
                        <p className="welcome-description">
                            Manage your documents and access your files from one place.
                        </p>
                    </div>

                    <span className="role-badge">{user.role}</span>
                </section>

                <section className="dashboard-panel details-panel">
                    <div className="panel-heading">
                        <div>
                            <h2>My Details</h2>
                            <p>Your current account information</p>
                        </div>
                    </div>

                    <div className="details-grid">
                        <div className="detail-item">
                            <span className="detail-label">Full name</span>
                            <span className="detail-value">
                                {user.name || 'Not provided'}
                            </span>
                        </div>

                        <div className="detail-item">
                            <span className="detail-label">Email address</span>
                            <span className="detail-value">{user.email}</span>
                        </div>

                        <div className="detail-item">
                            <span className="detail-label">Account role</span>
                            <span className="detail-value">{user.role}</span>
                        </div>

                        <div className="detail-item">
                            <span className="detail-label">Accessible documents</span>
                            <span className="detail-value">{documents.length}</span>
                        </div>
                    </div>
                </section>

                <div
                    className={
                        canUpload
                            ? 'dashboard-content-grid'
                            : 'dashboard-content-grid dashboard-content-single'
                    }
                >
                    {canUpload && (
                        <section className="dashboard-panel upload-panel">
                            <div className="panel-heading">
                                <div>
                                    <h2>Upload a Document</h2>
                                    <p>Add a document to your workspace.</p>
                                </div>
                            </div>

                            <form
                                action="/api/documents/upload"
                                method="POST"
                                encType="multipart/form-data"
                                className="upload-form"
                            >
                                <div className="form-field">
                                    <label htmlFor="document-title">
                                        Document Type
                                    </label>
                                    <select
                                        id="document-title"
                                        name="title"
                                        required
                                        defaultValue=""
                                        className="dashboard-input"
                                    >
                                        <option value="" disabled>
                                            Select document type
                                        </option>
                                        <option value="Report">Report</option>
                                        <option value="Contract">Contract</option>
                                        <option value="Invoice">Invoice</option>
                                        <option value="Identification">Identification</option>
                                        <option value="Legal Document">Legal Document</option>
                                        <option value="Personal Document">Personal Document</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>

                                <div className="form-field">
                                    <label htmlFor="document-category">Category</label>
                                    <select
                                        id="document-category"
                                        name="category"
                                        required
                                        defaultValue=""
                                        className="dashboard-input"
                                    >
                                        <option value="" disabled>
                                            Select category
                                        </option>
                                        <option value="Finance">Finance</option>
                                        <option value="Human Resources">Human Resources</option>
                                        <option value="Legal">Legal</option>
                                        <option value="Education">Education</option>
                                        <option value="Reports">Reports</option>
                                        <option value="Personal">Personal</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>

                                <div className="form-field">
                                    <label htmlFor="document-file">Choose a File</label>
                                    <input
                                        id="document-file"
                                        name="file"
                                        type="file"
                                        accept=".pdf,.png,.jpg,.jpeg,.txt"
                                        required
                                        className="dashboard-file-input"
                                    />
                                    <p className="field-help">
                                        Supported files: PDF, PNG, JPG, JPEG and TXT.
                                    </p>
                                </div>

                                <button type="submit" className="upload-button">
                                    Upload File
                                </button>
                            </form>
                        </section>
                    )}

                    <section className="dashboard-panel documents-panel">
                        <div className="panel-heading documents-heading">
                            <div>
                                <h2>My Documents</h2>
                                <p>
                                    Documents you uploaded or have permission to access.
                                </p>
                            </div>

                            <span className="document-count">
                                {documents.length}{' '}
                                {documents.length === 1 ? 'document' : 'documents'}
                            </span>
                        </div>

                        <form method="GET" action="/dashboard" className="filter-form">
                            <div className="form-field filter-name-field">
                                <label htmlFor="search-name">Search documents</label>
                                <input
                                    id="search-name"
                                    type="search"
                                    name="name"
                                    defaultValue={params.name ?? ''}
                                    placeholder="Search by document name"
                                    className="dashboard-input"
                                />
                            </div>

                            <div className="form-field filter-category-field">
                                <label htmlFor="filter-category">Category</label>
                                <select
                                    id="filter-category"
                                    name="category"
                                    defaultValue={params.category ?? ''}
                                    className="dashboard-input"
                                >
                                    <option value="">All categories</option>
                                    <option value="Finance">Finance</option>
                                    <option value="Human Resources">Human Resources</option>
                                    <option value="Legal">Legal</option>
                                    <option value="Education">Education</option>
                                    <option value="Reports">Reports</option>
                                    <option value="Personal">Personal</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>

                            <button type="submit" className="filter-button">
                                Apply Filters
                            </button>
                            <a href="/dashboard" className="clear-filter-button">
                                Clear
                            </a>
                        </form>

                        {documents.length === 0 ? (
                            <div className="empty-documents">
                                <h3>No documents found</h3>
                                <p>
                                    Your documents will appear here after they are
                                    uploaded or shared with your account.
                                </p>
                            </div>
                        ) : (
                            <div className="document-table-wrapper">
                                <table className="document-table">
                                    <thead>
                                        <tr>
                                            <th>Document Name</th>
                                            <th>Category</th>
                                            <th>Original File</th>
                                            <th>Uploaded On</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {documents.map((doc) => (
                                            <tr key={doc.id}>
                                                <td>
                                                    <span className="table-document-title">
                                                        {doc.title}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className="category-label">
                                                        {doc.category}
                                                    </span>
                                                </td>
                                                <td className="original-filename">
                                                    {doc.originalName}
                                                </td>
                                                <td className="date-cell">
                                                    {new Date(doc.createdAt).toLocaleDateString(
                                                        'en-IN',
                                                        {
                                                            day: '2-digit',
                                                            month: 'short',
                                                            year: 'numeric',
                                                        }
                                                    )}
                                                </td>
                                                <td>
                                                    <a
                                                        href={`/api/documents/${encodeURIComponent(doc.id)}/download`}
                                                        className="download-button"
                                                    >
                                                        Download
                                                    </a>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                </div>

                <footer className="dashboard-footer">
                    TrustVault · Secure Document Management
                </footer>
            </div>
        </main>
    );
}
