export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000').replace(/\/$/, '');
export const BUSINESS_SLUG = process.env.NEXT_PUBLIC_BUSINESS_SLUG ?? 'lumen-clinic';
export const MAX_MESSAGE_LENGTH = 1000;
export const TOKEN_STORAGE_KEY = 'slotwise.token';
