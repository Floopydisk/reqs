import crypto from 'crypto';

// Generate random token
export const generateRandomToken = (): string => {
  return crypto.randomBytes(20).toString('hex');
};

// Hash token
export const hashToken = (token: string): string => {
  return crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
};