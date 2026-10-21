import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, password, name, role } = body;

        // 1. Validate required fields
        if (!email || !password || !name) {
            return NextResponse.json(
                { error: 'Name, email, and password are required.' },
                { status: 400 }
            );
        }

        // 2. Check if the email is already registered
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return NextResponse.json(
                { error: 'An account with this email already exists.' },
                { status: 400 }
            );
        }

        // 3. Hash the password securely using bcrypt
        const hashedPassword = await bcrypt.hash(password, 12);

        // 4. Assign role (default to VIEWER if not provided or restricted)
        const assignedRole = role && Object.values(Role).includes(role) ? role : Role.VIEWER;

        // 5. Create the new user in the database
        const newUser = await prisma.user.create({
            data: {
                email,
                name,
                passwordHash: hashedPassword,
                role: assignedRole,
            },
        });

        return NextResponse.json(
            { success: true, message: 'Account created successfully!', userId: newUser.id },
            { status: 201 }
        );
    } catch (error) {
        console.error('Signup error:', error);
        return NextResponse.json(
            { error: 'Internal server error during registration.' },
            { status: 500 }
        );
    }
}