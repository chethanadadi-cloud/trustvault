'use server';

import { prisma } from '@/lib/prisma';
import { getCurrentSessionUser } from '@/lib/auth';
import { Role, Permission, Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';

export async function grantDocumentAccess(documentId: string, targetUserId: string, permission: Permission = Permission.READ) {
    const user = await getCurrentSessionUser();
    if (!user) throw new Error('Unauthorized');

    const document = await prisma.document.findUnique({
        where: { id: documentId },
    });

    if (!document) throw new Error('Document not found.');
    if (user.role !== Role.ADMIN && document.ownerId !== user.userId) {
        throw new Error('Forbidden: Only the document owner or an admin can grant access.');
    }

    await prisma.documentAccess.upsert({
        where: {
            userId_documentId: {
                documentId,
                userId: targetUserId,
            },
        },
        update: { permission },
        create: {
            documentId,
            userId: targetUserId,
            permission,
        } as Prisma.DocumentAccessUncheckedCreateInput,
    });

    await prisma.auditLog.create({
        data: {
            userId: user.userId,
            action: 'PERMISSION_GRANT',
            documentId: document.id,
            ipAddress: '127.0.0.1',
            success: true,
            details: JSON.stringify({ documentId, targetUserId, permission }),
        } as Prisma.AuditLogUncheckedCreateInput,
    });

    revalidatePath('/dashboard');
    return { success: true };
}

export async function revokeDocumentAccess(documentId: string, targetUserId: string) {
    const user = await getCurrentSessionUser();
    if (!user) throw new Error('Unauthorized');

    const document = await prisma.document.findUnique({
        where: { id: documentId },
    });

    if (!document) throw new Error('Document not found.');
    if (user.role !== Role.ADMIN && document.ownerId !== user.userId) {
        throw new Error('Forbidden: Only the document owner or an admin can revoke access.');
    }

    const existingAccess = await prisma.documentAccess.findUnique({
        where: {
            userId_documentId: { userId: targetUserId, documentId },
        },
    });

    if (existingAccess) {
        await prisma.documentAccess.delete({
            where: { id: existingAccess.id },
        });

        await prisma.auditLog.create({
            data: {
                userId: user.userId,
                action: 'PERMISSION_REVOKE',
                documentId: document.id,
                ipAddress: '127.0.0.1',
                success: true,
                details: JSON.stringify({ documentId, targetUserId }),
            } as Prisma.AuditLogUncheckedCreateInput,
        });
    }

    revalidatePath('/dashboard');
    return { success: true };
}