import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { Prisma, Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
    try {
        const body: unknown = await request.json();

        if (!body || typeof body !== 'object' || Array.isArray(body)) {
            return NextResponse.json(
                { error: 'Invalid request body.' },
                { status: 400 }
            );
        }

        const data = body as {
            name?: unknown;
            email?: unknown;
            password?: unknown;
            role?: unknown;
        };

        if (
            typeof data.name !== 'string' ||
            typeof data.email !== 'string' ||
            typeof data.password !== 'string'
        ) {
            return NextResponse.json(
                { error: 'Name, email and password are required.' },
                { status: 400 }
            );
        }

        const name = data.name.trim();
        const email = data.email.trim().toLowerCase();
        const password = data.password;

        if (name.length < 2 || name.length > 100) {
            return NextResponse.json(
                { error: 'Name must contain 2–100 characters.' },
                { status: 400 }
            );
        }

        if (
            email.length > 254 ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        ) {
            return NextResponse.json(
                { error: 'Enter a valid email address.' },
                { status: 400 }
            );
        }

        if (
            password.length < 12 ||
            Buffer.byteLength(password, 'utf8') > 72
        ) {
            return NextResponse.json(
                {
                    error: 'Password must be at least 12 characters and no more than 72 UTF-8 bytes.',
                },
                { status: 400 }
            );
        }

        // Public registration defaults to VIEWER.
        // ADMIN accounts cannot be created through public signup.
        let role: Role = Role.VIEWER;

        if (data.role !== undefined && data.role !== '') {
            if (
                typeof data.role !== 'string' ||
                !Object.values(Role).includes(data.role as Role)
            ) {
                return NextResponse.json(
                    { error: 'Invalid role.' },
                    { status: 400 }
                );
            }

            if (data.role === Role.ADMIN) {
                return NextResponse.json(
                    {
                        error: 'Administrator accounts must be created by an administrator.',
                    },
                    { status: 403 }
                );
            }

            role = data.role as Role;
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const user = await prisma.user.create({
            data: {
                name,
                email,
                passwordHash,
                role,
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
            },
        });

        return NextResponse.json(
            {
                success: true,
                message: 'Account created successfully. You can now log in.',
                user,
            },
            { status: 201 }
        );
    } catch (error) {
        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2002'
        ) {
            return NextResponse.json(
                { error: 'An account with this email already exists.' },
                { status: 409 }
            );
        }

        console.error('Signup error:', error);

        return NextResponse.json(
            { error: 'Unable to create the account. Please try again.' },
            { status: 500 }
        );
    }
}