import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    const hashedPassword = await bcrypt.hash('Password123!', 12);

    // 1. Create Admin
    const admin = await prisma.user.upsert({
        where: { email: 'admin@trustvault.internal' },
        update: {},
        create: {
            email: 'admin@trustvault.internal',
            name: 'System Administrator',
            passwordHash: hashedPassword,
            role: Role.ADMIN,
        },
    });

    // 2. Create Document Owner
    const owner = await prisma.user.upsert({
        where: { email: 'owner@trustvault.internal' },
        update: {},
        create: {
            email: 'owner@trustvault.internal',
            name: 'Document Owner',
            passwordHash: hashedPassword,
            role: Role.OWNER,
        },
    });

    // 3. Create Viewer
    const viewer = await prisma.user.upsert({
        where: { email: 'viewer@trustvault.internal' },
        update: {},
        create: {
            email: 'viewer@trustvault.internal',
            name: 'Authorized Viewer',
            passwordHash: hashedPassword,
            role: Role.VIEWER,
        },
    });

    console.log({ admin, owner, viewer });
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });