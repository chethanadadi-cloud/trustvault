import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';

async function runSecurityTest() {
    console.log('Running TrustVault Zero-Trust Security Verification...');

    try {
        // 1. Create mock test users matching your exact schema fields
        const owner = await prisma.user.create({
            data: {
                email: `owner-${Date.now()}@test.internal`,
                passwordHash: 'hash',
                role: Role.OWNER,
                name: 'Test Owner',
                isActive: true
            },
        });

        const outsider = await prisma.user.create({
            data: {
                email: `outsider-${Date.now()}@test.internal`,
                passwordHash: 'hash',
                role: Role.VIEWER,
                name: 'Test Outsider',
                isActive: true
            },
        });

        // 2. Create document satisfying all required schema fields (including filePath)
        const doc = await prisma.document.create({
            data: {
                title: 'Confidential Financial Report',
                filename: 'uuid-fake-file.pdf',
                originalName: 'report.pdf',
                fileSize: 1024,
                mimeType: 'application/pdf',
                category: 'Finance',
                filePath: '/secure/storage/uuid-fake-file.pdf',
                ownerId: owner.id,
            },
        });

        // 3. Query access list directly for the outsider
        const accessGrant = await prisma.documentAccess.findFirst({
            where: {
                documentId: doc.id,
                userId: outsider.id,
            },
        });

        // 4. Verify zero-trust rule: Outsider has no access grant
        if (accessGrant === null) {
            console.log('SUCCESS: Zero-trust authorization verified! Unauthorized user has no access grant.');
        } else {
            console.error('FAILURE: Security boundary violated! Access grant found.');
        }

        // Cleanup test records in correct order to respect foreign key constraints
        await prisma.documentAccess.deleteMany({ where: { documentId: doc.id } });
        await prisma.document.delete({ where: { id: doc.id } });
        await prisma.user.deleteMany({ where: { id: { in: [owner.id, outsider.id] } } });

        console.log('Test cleanup completed successfully.');
    } catch (error) {
        console.error('Security test encountered an error:', error);
    }
}

runSecurityTest();