import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const UPLOAD_DIR = path.join(process.cwd(), 'storage', 'documents');

export async function ensureUploadDir() {
    try {
        await fs.mkdir(UPLOAD_DIR, { recursive: true });
    } catch {
        // Directory already exists or error handled
    }
}

export async function saveFileToDisk(file: File): Promise<{ filename: string; fileSize: number; mimeType: string }> {
    await ensureUploadDir();

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileExtension = path.extname(file.name);
    const secureFilename = `${uuidv4()}${fileExtension}`;
    const filePath = path.join(UPLOAD_DIR, secureFilename);

    await fs.writeFile(filePath, buffer);

    return {
        filename: secureFilename,
        fileSize: file.size,
        mimeType: file.type || 'application/octet-stream',
    };
}

export async function getFilePath(secureFilename: string): Promise<string> {
    return path.join(UPLOAD_DIR, secureFilename);
}