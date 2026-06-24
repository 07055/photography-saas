import crypto from "crypto";

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY!;
const PAYSTACK_API = "https://api.paystack.co";

export async function paystackFetch(
  path: string,
  options: RequestInit = {}
) {
  const res = await fetch(`${PAYSTACK_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  return res.json();
}

export async function initializeTransaction({
  email,
  amount,
  metadata,
  callbackUrl,
  phone,
}: {
  email: string;
  amount: number;
  metadata?: Record<string, unknown>;
  callbackUrl?: string;
  phone?: string;
}) {
  const body: Record<string, unknown> = {
    email,
    amount,
    currency: "KES",
    channels: phone ? ["mpesa"] : ["card", "bank_transfer", "mobile_money"],
    callback_url: callbackUrl,
    metadata,
  };

  if (phone) body.phone = phone;

  const res = await fetch(`${PAYSTACK_API}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  return res.json() as Promise<{
    status: boolean;
    message: string;
    data: { authorization_url: string; access_code: string; reference: string };
  }>;
}

export async function verifyTransaction(reference: string) {
  const res = await fetch(
    `${PAYSTACK_API}/transaction/verify/${reference}`,
    {
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      },
    }
  );

  return res.json() as Promise<{
    status: boolean;
    message: string;
    data: {
      id: number;
      status: string;
      reference: string;
      amount: number;
      paid_at: string;
      email: string;
      metadata: Record<string, unknown>;
    };
  }>;
}

export function verifyWebhookSignature(
  body: string,
  signature: string
): boolean {
  const hash = crypto
    .createHmac("sha512", PAYSTACK_SECRET_KEY)
    .update(body)
    .digest("hex");
  return hash === signature;
}

// Create a transfer recipient for M-Pesa payouts
export async function createTransferRecipient({
  name,
  phone,
}: {
  name: string;
  phone: string;
}) {
  const res = await fetch(`${PAYSTACK_API}/transferrecipient`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: "mobile_money",
      name,
      account_number: phone,
      bank_code: "MPESA",
      currency: "KES",
    }),
  });

  return res.json() as Promise<{
    status: boolean;
    message: string;
    data: { recipient_code: string; active: boolean };
  }>;
}

// Initiate a transfer to an M-Pesa recipient
export async function initiateTransfer({
  amount,
  recipient,
  reason,
}: {
  amount: number; // in KES cents
  recipient: string; // recipient code
  reason?: string;
}) {
  const res = await fetch(`${PAYSTACK_API}/transfer`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      source: "balance",
      amount,
      recipient,
      reason: reason ?? "Photo sale payout",
      currency: "KES",
    }),
  });

  return res.json() as Promise<{
    status: boolean;
    message: string;
    data: {
      id: number;
      status: string;
      amount: number;
      recipient: { recipient_code: string };
    };
  }>;
}

export async function listBanks() {
  return paystackFetch("/bank?country=kenya&currency=KES");
}
