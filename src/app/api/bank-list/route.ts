import { NextResponse } from "next/server";
import { paystackFetch } from "@/lib/paystack";

export async function GET() {
  try {
    const result = await paystackFetch("/bank?country=kenya&currency=KES");
    if (result.status) {
      return NextResponse.json({ banks: result.data });
    }
    return NextResponse.json({ banks: [] });
  } catch {
    return NextResponse.json({ banks: [] });
  }
}
