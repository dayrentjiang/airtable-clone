import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET() {
  return NextResponse.json({
    region: process.env.VERCEL_REGION ?? "local",
    env: process.env.VERCEL_ENV ?? "development",
  });
}
