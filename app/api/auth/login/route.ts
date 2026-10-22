
import { NextRequest, NextResponse } from 'next/server';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
    verifyPassword,
    encryptSession,
    setSessionCookie,
} from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
    try {
        const body: unknown = await request.json();

        if (!body || typeof body !== 'object') {
            return NextResponse.json(
                { error: 'Invalid request body.' },
                { status: 400 }
            );
        }

        const data = body as {
            email?: unknown;
            password?: unknown;
            role?: unknown;
        };

        if (
            typeof data.email !== 'string' ||
            typeof data.password !== 'string' ||
            !data.email.trim() ||
            !data.password
        ) {
            return NextResponse.json(
                { error: 'Email and password are required.' },
                { status: 400 }
            );
        }

        if (data.password.length > 72) {
            return NextResponse.json(
                { error: 'Invalid email or password.' },
                { status: 401 }
            );
        }

        const email = data.email.trim().toLowerCase();

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return NextResponse.json(
                { error: 'Enter a valid email address.' },
                { status: 400 }
            );
        }

        let requestedRole: Role | undefined;

        if (data.role !== undefined && data.role !== '') {
            if (
                typeof data.role !== 'string' ||
                !Object.values(Role).includes(data.role as Role)
            ) {
                return NextResponse.json(
                    { error: 'Invalid role selected.' },
                    { status: 400 }
                );
            }

            requestedRole = data.role as Role;
        }

        const user = await prisma.user.findUnique({
            where: { email },
        });

        // Do not create accounts during login or reveal whether an email exists.
        if (
            !user ||
            !user.isActive ||
            !(await verifyPassword(data.password, user.passwordHash))
        ) {
            return NextResponse.json(
                { error: 'Invalid email or password.' },
                { status: 401 }
            );
        }

        // The selected role must match the role already stored in the database.
        // Never let a login request change a user's privileges.
        if (requestedRole && requestedRole !== user.role) {
            return NextResponse.json(
                { error: 'The selected role does not match this account.' },
                { status: 403 }
            );
        }

        const token = await encryptSession({
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
        });

        await setSessionCookie(token);

        return NextResponse.json({
            success: true,
            message: 'Login successful.',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    } catch (error) {
        console.error('Login error:', error);

        return NextResponse.json(
            { error: 'Unable to log in right now. Check the server configuration.' },
            { status: 500 }
        );
    }
}
