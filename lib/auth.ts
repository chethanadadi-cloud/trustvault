
import 'server-only';

import { cookies } from 'next/headers';
import { jwtVerify, SignJWT } from 'jose';
import bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';

const COOKIE_NAME = 'trustvault_session';
const SESSION_ISSUER = 'trustvault';
const SESSION_AUDIENCE = 'trustvault-web';
const SESSION_DURATION_SECONDS = 8 * 60 * 60;

export interface SessionPayload {
    id: string;
    email: string;
    name: string;
    role: Role;
}

function getJwtSecret(): Uint8Array {
    const secret = process.env.JWT_SECRET;

    if (!secret || Buffer.byteLength(secret, 'utf8') < 32) {
        throw new Error(
            'JWT_SECRET must be set to a secret of at least 32 bytes in .env'
        );
    }

    return new TextEncoder().encode(secret);
}

export async function verifyPassword(
    password: string,
    passwordHash: string
): Promise<boolean> {
    if (!password || !passwordHash) return false;

    try {
        return await bcrypt.compare(password, passwordHash);
    } catch {
        return false;
    }
}

export async function encryptSession(
    user: SessionPayload
): Promise<string> {
    return new SignJWT({
        email: user.email,
        name: user.name,
        role: user.role,
    })
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject(user.id)
        .setIssuer(SESSION_ISSUER)
        .setAudience(SESSION_AUDIENCE)
        .setIssuedAt()
        .setExpirationTime('8h')
        .sign(getJwtSecret());
}

export async function setSessionCookie(token: string): Promise<void> {
    const cookieStore = await cookies();

    cookieStore.set(COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: SESSION_DURATION_SECONDS,
    });
}

export async function clearSessionCookie(): Promise<void> {
    const cookieStore = await cookies();

    cookieStore.set(COOKIE_NAME, '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 0,
    });
}

export async function getCurrentSessionUser(): Promise<SessionPayload | null> {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get(COOKIE_NAME)?.value;

        if (!token) return null;

        const { payload } = await jwtVerify(token, getJwtSecret(), {
            algorithms: ['HS256'],
            issuer: SESSION_ISSUER,
            audience: SESSION_AUDIENCE,
        });

        if (typeof payload.sub !== 'string') return null;

        // Read current user data from the database so role changes and
        // account deactivation take effect without waiting for token expiry.
        const user = await prisma.user.findUnique({
            where: { id: payload.sub },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                isActive: true,
            },
        });

        if (!user || !user.isActive) return null;

        return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
        };
    } catch {
        return null;
    }
}

export async function logoutAction(): Promise<void> {
    'use server';
    await clearSessionCookie();
}
