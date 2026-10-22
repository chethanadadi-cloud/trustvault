
'use server';

import { prisma } from '@/lib/prisma';
import { getCurrentSessionUser } from '@/lib/auth';
import { Permission, Role } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import fs from 'fs/promises';
import path from 'path';

const ALLOWED_MIME_TYPES: Record<string, string> = {
    'application/pdf': '.pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        '.docx',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
        '.xlsx',
    'image/png': '.png',
    'image/jpeg': '.jpg',
};

const MAX_FILE_SIZE = 25 * 1024 * 1024;

export interface DocumentSearchOptions {
    title?: string;
    category?: string;
    ownerId?: string;
    dateFrom?: string;
    dateTo?: string;
}

export async function uploadDocument(formData: FormData) {
    const user = await getCurrentSessionUser();

    if (!user) {
        throw new Error('You must be logged in to upload documents.');
    }

    if (user.role !== Role.ADMIN && user.role !== Role.OWNER) {
        throw new Error('You do not have permission to upload documents.');
    }

    const fileEntry = formData.get('file');
    const titleEntry = formData.get('title');
    const categoryEntry = formData.get('category');

    if (
        !(fileEntry instanceof File) ||
        typeof titleEntry !== 'string' ||
        typeof categoryEntry !== 'string'
    ) {
        throw new Error('Please provide a file, title, and category.');
    }

    const title = titleEntry.trim();
    const category = categoryEntry.trim();
    const file = fileEntry;

    if (!title || !category || file.size === 0) {
        throw new Error('Please provide a valid file, title, and category.');
    }

    if (file.size > MAX_FILE_SIZE) {
        throw new Error('The file size must not exceed 25 MB.');
    }

    const fileExtension = ALLOWED_MIME_TYPES[file.type];

    if (!fileExtension) {
        throw new Error(
            'Unsupported file type. Upload a PDF, DOCX, XLSX, PNG, or JPEG file.'
        );
    }

    const storageDirectory = path.join(process.cwd(), 'secure_uploads');
    const uniqueFilename = `${crypto.randomUUID()}${fileExtension}`;
    const absoluteFilePath = path.join(storageDirectory, uniqueFilename);
    const relativeFilePath = path.join('secure_uploads', uniqueFilename);

    await fs.mkdir(storageDirectory, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());

    await fs.writeFile(absoluteFilePath, buffer, { flag: 'wx' });

    try {
        const document = await prisma.document.create({
            data: {
                title,
                filename: uniqueFilename,
                originalName: path.basename(file.name),
                category,
                filePath: relativeFilePath,
                fileSize: file.size,
                mimeType: file.type,
                ownerId: user.id,
            },
        });

        await prisma.auditLog.create({
            data: {
                userId: user.id,
                action: 'DOCUMENT_UPLOADED',
                entityType: 'Document',
                entityId: document.id,
                documentId: document.id,
                ipAddress: 'unknown',
                success: true,
                details: `Uploaded document: ${document.title}`,
            },
        });

        revalidatePath('/dashboard');

        return {
            success: true,
            message: 'Document uploaded successfully.',
            documentId: document.id,
        };
    } catch (error) {
        // Remove the saved file if creating the database record fails.
        await fs.unlink(absoluteFilePath).catch(() => undefined);
        throw error;
    }
}

export async function getAccessibleDocuments(
    searchOptions: DocumentSearchOptions = {}
) {
    const user = await getCurrentSessionUser();

    if (!user) {
        throw new Error('You must be logged in to view documents.');
    }

    const {
        title,
        category,
        ownerId,
        dateFrom,
        dateTo,
    } = searchOptions;

    const filters: Record<string, unknown>[] = [];

    if (title?.trim()) {
        filters.push({
            title: {
                contains: title.trim(),
                mode: 'insensitive',
            },
        });
    }

    if (category?.trim()) {
        filters.push({
            category: {
                contains: category.trim(),
                mode: 'insensitive',
            },
        });
    }

    if (ownerId?.trim()) {
        filters.push({ ownerId: ownerId.trim() });
    }

    if (dateFrom || dateTo) {
        const createdAt: { gte?: Date; lte?: Date } = {};

        if (dateFrom) {
            const from = new Date(dateFrom);

            if (Number.isNaN(from.getTime())) {
                throw new Error('The start date is invalid.');
            }

            createdAt.gte = from;
        }

        if (dateTo) {
            const to = new Date(dateTo);

            if (Number.isNaN(to.getTime())) {
                throw new Error('The end date is invalid.');
            }

            // Include the entire selected end date.
            to.setHours(23, 59, 59, 999);
            createdAt.lte = to;
        }

        filters.push({ createdAt });
    }

    const accessFilter =
        user.role === Role.ADMIN
            ? {}
            : user.role === Role.OWNER
                ? {
                    OR: [
                        { ownerId: user.id },
                        {
                            accessList: {
                                some: { userId: user.id },
                            },
                        },
                    ],
                }
                : {
                    accessList: {
                        some: { userId: user.id },
                    },
                };

    const where = {
        AND: [
            accessFilter,
            ...filters,
        ],
    };

    const documents = await prisma.document.findMany({
        where,
        include: {
            owner: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                },
            },
            accessList: {
                select: {
                    userId: true,
                    permission: true,
                },
            },
        },
        orderBy: {
            createdAt: 'desc',
        },
    });

    return documents;
}
