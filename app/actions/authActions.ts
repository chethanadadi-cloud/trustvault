
'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
    verifyPassword,
    encryptSession,
    setSessionCookie,
    clearSessionCookie,
    getCurrentSessionUser,
} from '@/lib/auth';
import { logAudit } from '@/lib/audit';

async function getClientIp(): Promise<string> {
    try {
        const headerStore = await headers();

        return (
            headerStore.get('x-real-ip') ??
            headerStore.get('x-forwarded-for')?.split(',')[0]?.trim() ??
            'unknown'
        );
    } catch {
        return 'unknown';
    }
}

export async function loginAction(formData: FormData): Promise<void> {
    const emailValue = formData.get('email');
    const passwordValue = formData.get('password');
    const roleValue = formData.get('role');

    if (
        typeof emailValue !== 'string' ||
        typeof passwordValue !== 'string' ||
        !emailValue.trim() ||
        !passwordValue
    ) {
        throw new Error('Email and password are required.');
    }

    const email = emailValue.trim().toLowerCase();
    const password = passwordValue;
    const ipAddress = await getClientIp();

    if (password.length > 72) {
        throw new Error('Invalid email or password.');
    }

    const user = await prisma.user.findUnique({
        where: { email },
    });

    if (!user || !user.isActive) {
        await logAudit({
            userId: user?.id ?? null,
            action: 'LOGIN_FAILED',
            entityType: 'USER',
            entityId: user?.id ?? email,
            ipAddress,
            success: false,
            details:
                'Login failed: account unavailable or credentials invalid.',
        });

        throw new Error('Invalid email or password.');
    }

    const isValidPassword = await verifyPassword(
        password,
        user.passwordHash
    );

    if (!isValidPassword) {
        await logAudit({
            userId: user.id,
            action: 'LOGIN_FAILED',
            entityType: 'USER',
            entityId: user.id,
            ipAddress,
            success: false,
            details: 'Login failed: incorrect password.',
        });

        throw new Error('Invalid email or password.');
    }

    if (typeof roleValue === 'string' && roleValue.trim() !== '') {
        const requestedRole = roleValue.trim().toUpperCase();

        if (
            !Object.values(Role).includes(requestedRole as Role) ||
            requestedRole !== user.role
        ) {
            await logAudit({
                userId: user.id,
                action: 'LOGIN_ROLE_MISMATCH',
                entityType: 'USER',
                entityId: user.id,
                ipAddress,
                success: false,
                details:
                    'Login rejected because the selected role did not match the account role.',
            });

            throw new Error(
                'The selected role does not match this account.'
            );
        }
    }

    const sessionToken = await encryptSession({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
    });

    await setSessionCookie(sessionToken);

    await logAudit({
        userId: user.id,
        action: 'USER_LOGIN',
        entityType: 'USER',
        entityId: user.id,
        ipAddress,
        success: true,
        details: 'User logged in successfully.',
    });

    redirect('/dashboard');
}

export async function logoutAction(): Promise<void> {
    let currentUser: Awaited<
        ReturnType<typeof getCurrentSessionUser>
    > = null;

    let ipAddress = 'unknown';

    try {
        ipAddress = await getClientIp();
        currentUser = await getCurrentSessionUser();
    } catch (error) {
        console.error('Could not retrieve logout audit context:', error);
    }

    // Clear the session before attempting any optional audit operation.
    await clearSessionCookie();

    if (currentUser) {
        await logAudit({
            userId: currentUser.id,
            action: 'USER_LOGOUT',
            entityType: 'USER',
            entityId: currentUser.id,
            ipAddress,
            success: true,
            details: 'User logged out.',
        });
    }

    redirect('/login');
}
