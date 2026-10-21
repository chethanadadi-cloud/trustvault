import { prisma } from '@/lib/prisma';

interface LogAuditParams {
    userId?: string | null;
    action: string;
    entityType: string;
    entityId: string;
    documentId?: string | null;
    ipAddress: string;
    success: boolean;
    details?: string | null;
}

export async function logAudit(params: LogAuditParams) {
    try {
        await prisma.auditLog.create({
            data: {
                userId: params.userId || null,
                action: params.action,
                entityType: params.entityType,
                entityId: params.entityId,
                documentId: params.documentId || null,
                ipAddress: params.ipAddress,
                success: params.success,
                details: params.details || null,
            },
        });
    } catch (error) {
        console.error('Failed to create audit log:', error);
    }
}