
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentSessionUser } from '@/lib/auth';
import { getSupabaseStorage } from '@/lib/supabaseStorage';
import { Permission } from '@prisma/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getClientIp(request: NextRequest): string {
    return (
        request.headers.get('x-real-ip') ??
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
        'unknown'
    );
}

async function writeAudit(
    userId: string | null,
    entityId: string,
    documentId: string | null,
    ipAddress: string,
    success: boolean,
    action: string,
    details: string
) {
    await prisma.auditLog.create({
        data: {
            userId,
            action,
            entityType: 'DOCUMENT',
            entityId,
            documentId,
            ipAddress,
            success,
            details,
        },
    });
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await getCurrentSessionUser();
    const ipAddress = getClientIp(request);
    const { id } = await params;

    if (!user) {
        return NextResponse.json(
            { error: 'Unauthorized. Please log in.' },
            { status: 401 }
        );
    }

    try {
        const document = await prisma.document.findUnique({
            where: { id },
            select: {
                id: true,
                title: true,
                filename: true,
                filePath: true,
                originalName: true,
                mimeType: true,
                ownerId: true,
                accessList: {
                    where: { userId: user.id },
                    select: { permission: true },
                },
            },
        });

        if (!document) {
            await writeAudit(
                user.id,
                id,
                null,
                ipAddress,
                false,
                'ACCESS_DENIED',
                'Attempted to download a nonexistent document.'
            ).catch((error) => {
                console.error('Audit logging failed:', error);
            });

            return NextResponse.json(
                { error: 'Document not found.' },
                { status: 404 }
            );
        }

        const isOwner = document.ownerId === user.id;
        const permission = document.accessList[0]?.permission;

        const canRead =
            isOwner ||
            permission === Permission.READ ||
            permission === Permission.EDIT;

        if (!canRead) {
            await writeAudit(
                user.id,
                document.id,
                document.id,
                ipAddress,
                false,
                'ACCESS_DENIED',
                'Attempted to download without document permission.'
            );

            return NextResponse.json(
                { error: 'Document not found.' },
                { status: 404 }
            );
        }

        // filePath is the private bucket object key, not a local disk path.
        const { supabase, bucket } = getSupabaseStorage();

        const { data: file, error: downloadError } = await supabase.storage
            .from(bucket)
            .download(document.filePath);

        if (downloadError || !file) {
            console.error(
                'Supabase Storage download failed:',
                downloadError?.message
            );

            return NextResponse.json(
                { error: 'The stored document could not be retrieved.' },
                { status: 502 }
            );
        }

        // Do not return document contents unless the audit record succeeds.
        await writeAudit(
            user.id,
            document.id,
            document.id,
            ipAddress,
            true,
            'DOWNLOAD',
            `Downloaded document: ${document.title}`
        );

        const fileBuffer = Buffer.from(await file.arrayBuffer());
        const safeFilename =
            (document.originalName || document.title)
                .replace(/[\r\n"\\/]/g, '_')
                .slice(0, 180) || 'document';

        const response = new NextResponse(new Uint8Array(fileBuffer), {
            status: 200,
            headers: {
                'Content-Type': document.mimeType || 'application/octet-stream',
                'Content-Disposition': `attachment; filename="${safeFilename}"`,
                'Content-Length': String(fileBuffer.length),
                'Cache-Control': 'private, no-store, no-cache, must-revalidate',
                Pragma: 'no-cache',
                'X-Content-Type-Options': 'nosniff',
            },
        });

        return response;
    } catch (error) {
        console.error('Document download error:', error);

        return NextResponse.json(
            { error: 'Unable to download the document.' },
            { status: 500 }
        );
    }
}
