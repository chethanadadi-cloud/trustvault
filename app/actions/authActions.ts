'use server';

import { prisma } from '@/lib/prisma';
import { verifyPassword, encryptSession, setSessionCookie, clearSessionCookie } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { logAudit } from '@/lib/audit';

export async function loginAction(formData: FormData) {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    if (!email || !password) {
        throw new Error('Email and password are required.');
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        throw new Error('Invalid email or password.');
    }

    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
        // Log failed login attempt
        await logAudit({
            userId: user.id,
            action: 'UNAUTHORIZED_ATTEMPT',
            entityType: 'USER',
            entityId: user.id,
            details: JSON.stringify({ reason: 'Incorrect password' }),
        });
        throw new Error('Invalid email or password.');
    }

    // Encrypt session and set HttpOnly cookie
    const sessionToken = await encryptSession({
        userId: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
    });

    await setSessionCookie(sessionToken);

    // Log successful login
    await logAudit({
        userId: user.id,
        action: 'USER_LOGIN',
        entityType: 'USER',
        entityId: user.id,
    });

    redirect('/dashboard');
}

export async function logoutAction() {
    await clearSessionCookie();
    redirect('/login');
}