import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

@Injectable()
export class PasswordService {
    private readonly saltRounds = 10;

    /**
     * Hash a password using bcrypt
     */
    async hashPassword(password: string): Promise<string> {
        return bcrypt.hash(password, this.saltRounds);
    }

    /**
     * Compare a plain password with a hashed password
     * Supports both bcrypt and legacy SHA-256 hashes
     */
    async comparePasswords(plainPassword: string, hashedPassword: string): Promise<boolean> {
        // Check if it's a bcrypt hash
        if (hashedPassword.startsWith('$2b$') || hashedPassword.startsWith('$2a$')) {
            return bcrypt.compare(plainPassword, hashedPassword);
        }

        // Legacy SHA-256 comparison
        const crypto = require('crypto');
        const sha256Hash = crypto.createHash('sha256').update(plainPassword).digest('hex');
        return sha256Hash === hashedPassword;
    }

    /**
     * Check if a password hash is in legacy SHA-256 format
     */
    isLegacyHash(password: string): boolean {
        return /^[a-f0-9]{64}$/i.test(password);
    }

    /**
     * Validate password strength
     * Returns null if valid, error message if invalid
     */
    validatePasswordStrength(password: string): string | null {
        if (password.length < 8) {
            return 'Password must be at least 8 characters';
        }
        if (password.length > 72) {
            return 'Password must not exceed 72 characters';
        }
        if (!/\d/.test(password)) {
            return 'Password must contain at least one number';
        }
        if (!/[a-zA-Z]/.test(password)) {
            return 'Password must contain at least one letter';
        }
        return null;
    }
}
