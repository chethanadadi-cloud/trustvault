import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import bcrypt from 'bcrypt';

const secretKey = process.env.JWT_SECRET || 'trustvault-super-secret-key-change-in-production';
const JWT_SECRET = new TextEncoder().encode(secretKey);

export async function encryptSession(payload: Record<string, unknown>) {
    return await new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('8h')
        .sign(JWT_SECRET);
}

export async function decryptSession(token: string) {
    if (!token) return null;
    try {
        const { payload } = await jwtVerify(token, JWT_SECRET, {
            algorithms: ['HS256'],
        });
        return payload;
    } catch {
        // Gracefully handle invalid or old tokens by clearing the bad cookie
        try {
            const cookieStore = await cookies();
            cookieStore.delete('trustvault_session');
        } catch { }
        return null;
    }
}

export async function getCurrentSessionUser() {
    const cookieStore = await cookies();
    const token = cookieStore.get('trustvault_session')?.value;
    if (!token) return null;
    return decryptSession(token);
}

export async function setSessionCookie(token: string) {
    const cookieStore = await cookies();
    cookieStore.set({
        name: 'trustvault_session',
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 60 * 60 * 8, // 8 hours
    });
}

export async function clearSessionCookie() {
    const cookieStore = await cookies();
    cookieStore.delete('trustvault_session');
}

export async function verifyPassword(plainTextPassword: string, hashedPassword: string) {
    return await bcrypt.compare(plainTextPassword, hashedPassword);
}