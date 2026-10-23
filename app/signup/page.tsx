'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
    const router = useRouter();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('VIEWER');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSignup(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name.trim(),
                    email: email.trim().toLowerCase(),
                    password,
                    role,
                }),
            });

            const result = await response.json().catch(() => ({}));

            if (!response.ok) {
                setError(
                    result.error ||
                    result.message ||
                    'Unable to create your account. Please try again.'
                );
                return;
            }

            router.push('/login?registered=1');
        } catch {
            setError('Could not connect to the server. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="login-page-shell">
            <section className="trustvault-card">
                <h1 className="text-2xl font-semibold text-white">
                    Create your TrustVault account
                </h1>

                <p className="mt-2 mb-6 text-sm text-slate-400">
                    Register with your details to get started.
                </p>

                <form onSubmit={handleSignup} className="space-y-4">
                    <div>
                        <label htmlFor="name" className="mb-2 block text-sm text-slate-300">
                            Full Name
                        </label>
                        <input
                            id="name"
                            name="name"
                            className="trustvault-input"
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            autoComplete="name"
                            minLength={2}
                            maxLength={100}
                            required
                            disabled={loading}
                        />
                    </div>

                    <div>
                        <label htmlFor="email" className="mb-2 block text-sm text-slate-300">
                            Email Address
                        </label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            className="trustvault-input"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            autoComplete="email"
                            maxLength={254}
                            required
                            disabled={loading}
                        />
                    </div>

                    <div>
                        <label htmlFor="password" className="mb-2 block text-sm text-slate-300">
                            Password
                        </label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            className="trustvault-input"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            autoComplete="new-password"
                            minLength={12}
                            maxLength={72}
                            required
                            disabled={loading}
                        />
                        <p className="mt-1 text-xs text-slate-400">
                            Use at least 12 characters.
                        </p>
                    </div>

                    <div>
                        <label htmlFor="role" className="mb-2 block text-sm text-slate-300">
                            Account Role
                        </label>
                        <select
                            id="role"
                            name="role"
                            className="trustvault-input"
                            value={role}
                            onChange={(event) => setRole(event.target.value)}
                            disabled={loading}
                        >
                            <option value="VIEWER">Viewer</option>
                            <option value="OWNER">Owner</option>
                        </select>
                        <p className="mt-1 text-xs text-slate-400">
                            Admin accounts are created separately.
                        </p>
                    </div>

                    {error && (
                        <p role="alert" className="text-sm text-red-400">
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        className="trustvault-btn"
                        disabled={loading}
                    >
                        {loading ? 'Creating account...' : 'Create Account'}
                    </button>
                </form>

                <p className="mt-5 text-center text-sm text-slate-400">
                    Already registered?{' '}
                    <Link href="/login" className="text-blue-400 hover:text-blue-300">
                        Sign in
                    </Link>
                </p>
            </section>
        </main>
    );
}