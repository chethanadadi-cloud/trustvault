
import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { prisma } from '@/lib/prisma';
import { getCurrentSessionUser } from '@/lib/auth';
import { getSupabaseStorage } from '@/lib/supabaseStorage';
import { Role } from '@prisma/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_TYPES: Record<string, string> = {
    'application/pdf': '.pdf',
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'text/plain': '.txt',
};

function getClientIp(request: NextRequest): string {
    return (
        request.headers.get('x-real-ip') ??
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
        'unknown'
    );
}

export async function POST(request: NextRequest) {
    const user = await getCurrentSessionUser();

    if (!user) {
        return NextResponse.json(
            { error: 'Please log in to upload documents.' },
            { status: 401 }
        );
    }

    if (user.role !== Role.ADMIN && user.role !== Role.OWNER) {
        return NextResponse.json(
            { error: 'You do not have permission to upload documents.' },
            { status: 403 }
        );
    }

    let uploadedPath: string | null = null;

    try {
        const formData = await request.formData();
        const fileEntry = formData.get('file');
        const titleEntry = formData.get('title');
        const categoryEntry = formData.get('category');

        if (
            !(fileEntry instanceof File) ||
            typeof titleEntry !== 'string' ||
            typeof categoryEntry !== 'string'
        ) {
            return NextResponse.json(
                { error: 'Please provide a file, title, and category.' },
                { status: 400 }
            );
        }

        const title = titleEntry.trim();
        const category = categoryEntry.trim();
        const file = fileEntry;

        if (!title || !category || file.size === 0) {
            return NextResponse.json(
                { error: 'Please provide a valid file, title, and category.' },
                { status: 400 }
            );
        }

        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                { error: 'The maximum file size is 10 MB.' },
                { status: 413 }
            );
        }

        const extension = ALLOWED_TYPES[file.type];

        if (!extension) {
            return NextResponse.json(
                { error: 'Only PDF, PNG, JPG, JPEG, and TXT files are allowed.' },
                { status: 415 }
            );
        }

        const originalName = path.basename(file.name);

        if (!originalName || originalName === '.' || originalName === '..') {
            return NextResponse.json(
                { error: 'Invalid filename.' },
                { status: 400 }
            );
        }

        const filename = `${randomUUID()}${extension}`;
        const buffer = Buffer.from(await file.arrayBuffer());
        const { supabase, bucket } = getSupabaseStorage();

        const { error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(filename, buffer, {
                contentType: file.type,
                upsert: false,
            });

        if (uploadError) {
            console.error('Supabase Storage upload failed:', uploadError.message);

            return NextResponse.json(
                { error: 'Unable to store the uploaded file.' },
                { status: 502 }
            );
        }

        uploadedPath = filename;

        const document = await prisma.document.create({
            data: {
                title,
                filename,
                originalName,
                category,
                // This now stores the object key in the private bucket,
                // not a local filesystem path.
                filePath: uploadedPath,
                fileSize: buffer.length,
                mimeType: file.type,
                ownerId: user.id,
            },
        });

        try {
            await prisma.auditLog.create({
                data: {
                    userId: user.id,
                    action: 'DOCUMENT_UPLOADED',
                    entityType: 'DOCUMENT',
                    entityId: document.id,
                    documentId: document.id,
                    ipAddress: getClientIp(request),
                    success: true,
                    details: `Uploaded document: ${document.title}`,
                },
            });
        } catch (auditError) {
            console.error('Upload audit logging failed:', auditError);
            await prisma.document.delete({
                where: { id: document.id },
            });
            throw auditError;
        }

        return NextResponse.redirect(
            new URL('/dashboard?upload=success', request.url),
            303
        );
    } catch (error) {
        console.error('Document upload failed:', error);

        if (uploadedPath) {
            try {
                const { supabase, bucket } = getSupabaseStorage();
                await supabase.storage.from(bucket).remove([uploadedPath]);
            } catch (cleanupError) {
                console.error('Storage cleanup failed:', cleanupError);
            }
        }

        return NextResponse.json(
            { error: 'Unable to upload the document. Please try again.' },
            { status: 500 }
        );
    }
}
