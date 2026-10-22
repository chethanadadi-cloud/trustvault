
'use server';

import { prisma } from '@/lib/prisma';
import { getCurrentSessionUser } from '@/lib/auth';
import { Role, Permission } from '@prisma/client';
import { revalidatePath } from 'next/cache';

export async function grantDocumentAccess(
    documentId: string,
    targetUserId: string,
    permission: Permission = Permission.READ
) {
    const user = await getCurrentSessionUser();

    if (!user) {
        throw new Error('Unauthorized');
    }

    if (!documentId || !targetUserId) {
        throw new Error('Document ID and target user ID are required.');
    }

    const document = await prisma.document.findUnique({
        where: { id: documentId },
        select: {
            id: true,
            ownerId: true,
        },
    });

    if (!document) {
        throw new Error('Document not found.');
    }

    if (
        user.role !== Role.ADMIN &&
        document.ownerId !== user.id
    ) {
        throw new Error(
            'Forbidden: Only the document owner or an admin can grant access.'
        );
    }

    const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, isActive: true },
    });

    if (!targetUser || !targetUser.isActive) {
        throw new Error('The target user does not exist or is inactive.');
    }

    await prisma.documentAccess.upsert({
        where: {
            userId_documentId: {
                userId: targetUserId,
                documentId,
            },
        },
        update: {
            permission,
        },
        create: {
            documentId,
            userId: targetUserId,
            permission,
        },
    });

    await prisma.auditLog.create({
        data: {
            userId: user.id,
            action: 'PERMISSION_GRANT',
            entityType: 'DocumentAccess',
            entityId: documentId,
            documentId: document.id,
            ipAddress: '127.0.0.1',
            success: true,
            details: JSON.stringify({
                documentId,
                targetUserId,
                permission,
            }),
        },
    });

    revalidatePath('/dashboard');

    return { success: true };
}

export async function revokeDocumentAccess(
    documentId: string,
    targetUserId: string
) {
    const user = await getCurrentSessionUser();

    if (!user) {
        throw new Error('Unauthorized');
    }

    if (!documentId || !targetUserId) {
        throw new Error('Document ID and target user ID are required.');
    }

    const document = await prisma.document.findUnique({
        where: { id: documentId },
        select: {
            id: true,
            ownerId: true,
        },
    });

    if (!document) {
        throw new Error('Document not found.');
    }

    if (
        user.role !== Role.ADMIN &&
        document.ownerId !== user.id
    ) {
        throw new Error(
            'Forbidden: Only the document owner or an admin can revoke access.'
        );
    }

    const existingAccess = await prisma.documentAccess.findUnique({
        where: {
            userId_documentId: {
                userId: targetUserId,
                documentId,
            },
        },
    });

    if (existingAccess) {
        await prisma.documentAccess.delete({
            where: {
                id: existingAccess.id,
            },
        });

        await prisma.auditLog.create({
            data: {
                userId: user.id,
                action: 'PERMISSION_REVOKE',
                entityType: 'DocumentAccess',
                entityId: documentId,
                documentId: document.id,
                ipAddress: '127.0.0.1',
                success: true,
                details: JSON.stringify({
                    documentId,
                    targetUserId,
                }),
            },
        });
    }

    revalidatePath('/dashboard');

    return { success: true };
}
