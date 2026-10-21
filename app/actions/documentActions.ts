'use server';

import { prisma } from '@/lib/prisma';
import { getCurrentSessionUser } from '@/lib/auth';
import { Role, Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import fs from 'fs/promises';
import path from 'path';

const ALLOWED_MIME_TYPES = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/png',
    'image/jpeg',
];

const MAX_FILE_SIZE = 25 * 1024 * 1024;

export async function uploadDocument(formData: FormData) {
    const user = await getCurrentSessionUser();
    if (!user || (user.role !== Role.ADMIN && user.role !== Role.OWNER)) {
        throw new Error('Unauthorized: Only Owners and Admins can upload documents.');
    }

    const file = formData.get('file') as File;
    const title = formData.get('title') as string;
    const category = formData.get('category') as string;

    if (!file || !title || !category) {
        throw new Error('Missing required fields: file, title, or category.');
    }

    if (file.size > MAX_FILE_SIZE) {
        throw new Error('File size exceeds the 25MB limit.');
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        throw new Error(`Invalid file type (${file.type}). Only PDF, Word, Excel, and Images are allowed.`);
    }

    const uploadsDir = path.join(process.cwd(), 'secure_uploads');
    try {
        await fs.mkdir(uploadsDir, { recursive: true });
    } catch { }

    const uniqueFilename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filePath = path.join(uploadsDir, uniqueFilename);
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, buffer);

    const document = await prisma.document.create({
        data: {
            title,
            category,
            filePath: uniqueFilename,
            fileSize: file.size,
            mimeType: file.type,
            ownerId: user.userId,
        } as Prisma.DocumentUncheckedCreateInput,
    });

    await prisma.auditLog.create({
        data: {
            userId: user.userId,
            action: 'UPLOAD',
            documentId: document.id,
            ipAddress: '127.0.0.1',
            success: true,
            details: `Uploaded document: ${title} (${file.name})`,
        } as Prisma.AuditLogUncheckedCreateInput,
    });

    revalidatePath('/dashboard');
    return { success: true, documentId: document.id };
}

export async function getAccessibleDocuments(searchQuery?: {
    name?: string;
    category?: string;
    ownerId?: string;
    dateFrom?: string;
    dateTo?: string;
}) {
    const user = await getCurrentSessionUser();
    if (!user) throw new Error('Unauthorized');

    const whereClause: Prisma.DocumentWhereInput = {};

    if (searchQuery?.name) {
        whereClause.title = { contains: searchQuery.name, mode: 'insensitive' };
    }
    if (searchQuery?.category) {
        whereClause.category = searchQuery.category;
    }
    if (searchQuery?.ownerId) {
        whereClause.ownerId = searchQuery.ownerId;
    }
    if (searchQuery?.dateFrom || searchQuery?.dateTo) {
        whereClause.createdAt = {};
        if (searchQuery.dateFrom) whereClause.createdAt.gte = new Date(searchQuery.dateFrom);
        if (searchQuery.dateTo) whereClause.createdAt.lte = new Date(searchQuery.dateTo);
    }

    if (user.role === Role.ADMIN) {
        return prisma.document.findMany({
            where: whereClause,
            include: { owner: { select: { email: true, role: true } } },
            orderBy: { createdAt: 'desc' },
        });
    } else if (user.role === Role.OWNER) {
        whereClause.OR = [
            { ownerId: user.userId },
            { accessList: { some: { userId: user.userId } } },
        ];
    } else {
        whereClause.accessList = { some: { userId: user.userId } };
    }

    return prisma.document.findMany({
        where: whereClause,
        include: { owner: { select: { email: true, role: true } } },
        orderBy: { createdAt: 'desc' },
    });
}