import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { encryptSession } from '@/lib/auth';

export async function POST(request: Request) {
    try {
        const { email, password, role } = await request.json();

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
        }

        // 1. Find user in database
        let user = await prisma.user.findUnique({ where: { email } });

        // 2. AUTO-PROVISIONING WITH EXPLICIT USER-SELECTED ROLE
        if (!user) {
            const hashedPassword = await bcrypt.hash(password, 12);

            // Validate and assign the role selected by the user on the frontend
            let assignedRole: Role = Role.VIEWER;
            if (role && Object.values(Role).includes(role as Role)) {
                assignedRole = role as Role;
            }

            user = await prisma.user.create({
                data: {
                    email,
                    name: email.split('@')[0],
                    passwordHash: hashedPassword,
                    role: assignedRole,
                    isActive: true,
                },
            });
        } else {
            // 3. If user exists, check if active
            if (!user.isActive) {
                return NextResponse.json({ error: 'Invalid credentials or inactive account' }, { status: 401 });
            }

            // 4. Verify password using bcrypt
            const passwordMatch = await bcrypt.compare(password, user.passwordHash);
            if (!passwordMatch) {
                return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
            }
        }

        // 5. Encrypt session safely
        const sessionToken = await encryptSession({
            id: user.id,
            email: user.email,
            role: user.role,
        } as unknown as Parameters<typeof encryptSession>[0]);

        // 6. Create response and set cookie
        const response = NextResponse.json({ success: true, role: user.role }, { status: 200 });

        response.cookies.set({
            name: 'trustvault_session',
            value: sessionToken,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/',
            maxAge: 60 * 60 * 8, // 8 hours
        });

        return response;
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}