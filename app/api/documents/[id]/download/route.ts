import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentSessionUser } from '@/lib/auth';
import { Role, Prisma } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const user = await getCurrentSessionUser();
        const ipAddress = request.headers.get('x-forwarded-for') || '127.0.0.1';

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized: Please log in.' }, { status: 401 });
        }

        const document = await prisma.document.findUnique({
            where: { id },
            include: { accessList: true },
        });

        if (!document) {
            return NextResponse.json({ error: 'Document not found.' }, { status: 404 });
        }

        const isAdmin = user.role === Role.ADMIN;
        const isOwner = document.ownerId === user.userId;
        const hasExplicitAccess = document.accessList.some((access) => access.userId === user.userId);

        if (!isAdmin && !isOwner && !hasExplicitAccess) {
            await prisma.auditLog.create({
                data: {
                    userId: user.userId,
                    action: 'ACCESS_DENIED',
                    documentId: document.id,
                    ipAddress,
                    success: false,
                    details: 'Attempted to download without permission grant',
                } as Prisma.AuditLogUncheckedCreateInput,
            });

            return NextResponse.json({ error: 'Forbidden: You do not have access to this document.' }, { status: 403 });
        }

        const uploadsDir = path.join(process.cwd(), 'secure_uploads');
        const fullFilePath = path.join(uploadsDir, document.filePath);
        const fileBuffer = await fs.readFile(fullFilePath);

        await prisma.auditLog.create({
            data: {
                userId: user.userId,
                action: 'DOWNLOAD',
                documentId: document.id,
                ipAddress,
                success: true,
                details: `Downloaded document: ${document.title}`,
            } as Prisma.AuditLogUncheckedCreateInput,
        });

        return new NextResponse(fileBuffer, {
            status: 200,
            headers: {
                'Content-Type': document.mimeType,
                'Content-Disposition': `attachment; filename="${encodeURIComponent(document.title)}"`,
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            },
        });
    } catch (error) {
        console.error('Download error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}