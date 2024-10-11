import crypto from 'crypto';

export function generateState(): string {
    return crypto.randomBytes(16).toString('hex');
}