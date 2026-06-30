import crypto from "crypto";

// Client pays this % on top (covers platform fee + part of Paystack)
export const PLATFORM_FEE_PERCENT = 2;

// Deducted from photographer's payout (covers remaining Paystack cost)
export const PHOTOGRAPHER_FEE_PERCENT = 0.5;

// Maximum upload file size in bytes (20MB)
export const MAX_UPLOAD_SIZE = 20 * 1024 * 1024;

export function generateToken(): string {
  return crypto.randomUUID();
}

export function generateShareToken(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
}

export function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_BASE_URL) return process.env.NEXT_PUBLIC_BASE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  if (process.env.NEXT_PUBLIC_VERCEL_URL) return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL;
  return "http://localhost:3000";
}

// Convert Kenya phone (e.g. 0712345678) to international format for Paystack (254712345678)
export function formatPhoneToInternational(phone: string): string {
  const cleaned = phone.replace(/[\s\+\-\(\)]/g, "");
  if (cleaned.startsWith("0")) return "254" + cleaned.slice(1);
  if (cleaned.startsWith("254")) return cleaned;
  if (cleaned.startsWith("+254")) return cleaned.slice(1);
  return "254" + cleaned;
}
