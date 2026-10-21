'use server';

import { prisma } from '@/lib/prisma';
import { getCurrentSessionUser } from '@/lib/auth';
import { Role } from '@prisma/client';

export async function getSystemAuditLogs() {
    const user = await getCurrentSessionUser();
    if (!user || user.role !== Role.ADMIN) {
        throw new Error('Forbidden: Admin access required.');
    }

    return prisma.auditLog.findMany({
        include: {
            user: { select: { email: true, role: true } },
        },
        orderBy: { timestamp: 'desc' },
        take: 100, // Most recent 100 entries
    });
}

export async function getAllUsers() {
    const user = await getCurrentSessionUser();
    if (!user || user.role !== Role.ADMIN) {
        throw new Error('Forbidden: Admin access required.');
    }

    return prisma.user.findMany({
        select: { id: true, email: true, role: true, isActive: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
    });
}