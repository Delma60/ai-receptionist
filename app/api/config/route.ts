import { getAppConfig } from "@/lib/config/app-config";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  const config = await getAppConfig();
  return NextResponse.json(config);
}
