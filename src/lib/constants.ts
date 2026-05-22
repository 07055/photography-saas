// Platform takes 3% service fee on every transaction
export const PLATFORM_FEE_PERCENT = 3;

// Minimum payout threshold (KSh) before photographer can withdraw
export const MIN_PAYOUT_KES = 100;

export function generateToken(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
