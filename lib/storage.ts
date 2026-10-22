
import 'server-only';

import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const UPLOAD_DIR = path.join(
    process.cwd(),
    'storage',
    'documents'
);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const ALLOWED_TYPES: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.txt': 'text/plain',
};

export async function ensureUploadDir(): Promise<void> {
    await fs.mkdir(UPLOAD_DIR, {
        recursive: true,
        mode: 0o700,
    });
}

export async function saveFileToDisk(
    file: File
): Promise<{
    filename: string;
    fileSize: number;
    mimeType: string;
}> {
    if (!(file instanceof File) || file.size <= 0) {
        throw new Error('An empty or invalid file was provided.');
    }

    if (file.size > MAX_FILE_SIZE) {
        throw new Error('File exceeds the 10 MB limit.');
    }

    const extension = path.extname(file.name).toLowerCase();
    const expectedMimeType = ALLOWED_TYPES[extension];

    if (!expectedMimeType) {
        throw new Error('This file extension is not allowed.');
    }

    if (file.type && file.type !== expectedMimeType) {
        throw new Error('File extension and declared type do not match.');
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Basic signature checks for formats with recognizable headers.
    if (extension === '.pdf' && !buffer.subarray(0, 5).equals(Buffer.from('%PDF-'))) {
        throw new Error('The file does not have a valid PDF signature.');
    }

    if (
        extension === '.png' &&
        !buffer.subarray(0, 8).equals(
            Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
        )
    ) {
        throw new Error('The file does not have a valid PNG signature.');
    }

    if (
        (extension === '.jpg' || extension === '.jpeg') &&
        !(buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff)
    ) {
        throw new Error('The file does not have a valid JPEG signature.');
    }

    const filename = `${randomUUID()}${extension}`;

    await ensureUploadDir();

    const fullPath = path.join(UPLOAD_DIR, filename);

    // wx prevents overwriting an existing file.
    await fs.writeFile(fullPath, buffer, {
        flag: 'wx',
        mode: 0o600,
    });

    return {
        filename,
        fileSize: buffer.length,
        mimeType: expectedMimeType,
    };
}

export async function getFilePath(
    secureFilename: string
): Promise<string> {
    // Accept only server-generated UUID filenames and known extensions.
    if (
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(pdf|png|jpg|jpeg|txt)$/i.test(
            secureFilename
        )
    ) {
        throw new Error('Invalid stored filename.');
    }

    return path.join(UPLOAD_DIR, secureFilename);
}
