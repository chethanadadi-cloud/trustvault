'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('VIEWER');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const router = useRouter();

    const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: email.trim(),
                    password,
                    role,
                }),
            });

            const data = await res.json().catch(() => ({}));

            if (res.ok) {
                router.replace('/dashboard');
                router.refresh();
                return;
            }

            setError(
                data.error ||
                data.message ||
                'Unable to sign in. Please check your credentials and try again.'
            );
        } catch {
            setError(
                'An error occurred during sign in. Please check your connection and try again.'
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <main className="login-page-shell">
            <section className="trustvault-card">
                <div
                    style={{
                        marginBottom: '2rem',
                        textAlign: 'center',
                    }}
                >
                    <h1
                        style={{
                            fontSize: '1.75rem',
                            fontWeight: 'bold',
                            color: '#ffffff',
                            marginBottom: '0.5rem',
                            letterSpacing: '-0.025em',
                        }}
                    >
                        TrustVault Secure Access
                    </h1>

                    <p
                        style={{
                            fontSize: '0.875rem',
                            color: '#94a3b8',
                            lineHeight: 1.6,
                        }}
                    >
                        Enter your credentials to access your secure vault.
                    </p>
                </div>

                {error && (
                    <div
                        role="alert"
                        style={{
                            marginBottom: '1.5rem',
                            padding: '0.875rem',
                            backgroundColor: 'rgba(153, 27, 27, 0.4)',
                            border: '1px solid rgba(185, 28, 28, 0.6)',
                            borderRadius: '0.75rem',
                            fontSize: '0.875rem',
                            color: '#fca5a5',
                            textAlign: 'center',
                            lineHeight: 1.5,
                        }}
                    >
                        {error}
                    </div>
                )}

                <form
                    onSubmit={handleLogin}
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1.25rem',
                    }}
                >
                    <div>
                        <label
                            htmlFor="login-email"
                            style={{
                                display: 'block',
                                fontSize: '0.75rem',
                                fontWeight: 'bold',
                                letterSpacing: '0.05em',
                                color: '#94a3b8',
                                marginBottom: '0.5rem',
                            }}
                        >
                            EMAIL ADDRESS
                        </label>

                        <input
                            id="login-email"
                            type="email"
                            autoComplete="username"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="admin@trustvault.internal"
                            className="trustvault-input"
                            disabled={isSubmitting}
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="login-password"
                            style={{
                                display: 'block',
                                fontSize: '0.75rem',
                                fontWeight: 'bold',
                                letterSpacing: '0.05em',
                                color: '#94a3b8',
                                marginBottom: '0.5rem',
                            }}
                        >
                            PASSWORD
                        </label>

                        <input
                            id="login-password"
                            type="password"
                            autoComplete="current-password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your password"
                            className="trustvault-input"
                            disabled={isSubmitting}
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="login-role"
                            style={{
                                display: 'block',
                                fontSize: '0.75rem',
                                fontWeight: 'bold',
                                letterSpacing: '0.05em',
                                color: '#94a3b8',
                                marginBottom: '0.5rem',
                            }}
                        >
                            SELECT ROLE
                        </label>

                        <select
                            id="login-role"
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            className="trustvault-input"
                            disabled={isSubmitting}
                        >
                            <option
                                value="VIEWER"
                                style={{
                                    backgroundColor: '#0f172a',
                                    color: '#ffffff',
                                }}
                            >
                                Viewer
                            </option>

                            <option
                                value="OWNER"
                                style={{
                                    backgroundColor: '#0f172a',
                                    color: '#ffffff',
                                }}
                            >
                                Owner
                            </option>

                            <option
                                value="ADMIN"
                                style={{
                                    backgroundColor: '#0f172a',
                                    color: '#ffffff',
                                }}
                            >
                                Admin
                            </option>
                        </select>
                    </div>

                    <button
                        type="submit"
                        className="trustvault-btn"
                        disabled={isSubmitting}
                        style={{
                            opacity: isSubmitting ? 0.7 : 1,
                            cursor: isSubmitting ? 'wait' : 'pointer',
                        }}
                    >
                        {isSubmitting ? 'Signing In…' : 'Sign In'}
                    </button>
                </form>

                <div
                    style={{
                        marginTop: '1.5rem',
                        paddingTop: '1.25rem',
                        borderTop: '1px solid rgba(148, 163, 184, 0.2)',
                        textAlign: 'center',
                    }}
                >
                    <p
                        style={{
                            fontSize: '0.875rem',
                            color: '#94a3b8',
                            marginBottom: '0.5rem',
                        }}
                    >
                        Do not have a TrustVault account?
                    </p>

                    <Link
                        href="/signup"
                        style={{
                            color: '#60a5fa',
                            fontSize: '0.9rem',
                            fontWeight: 600,
                            textDecoration: 'none',
                        }}
                    >
                        Create an account
                    </Link>
                </div>
            </section>
        </main>
    );
}