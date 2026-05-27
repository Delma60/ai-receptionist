import { NextRequest, NextResponse } from 'next/server';

// GET /api/integrations/hubspot - Get HubSpot integration status/info
export async function GET(req: NextRequest) {
  // TODO: Implement logic to fetch HubSpot integration status/info
  return NextResponse.json({ message: 'HubSpot integration endpoint' });
}

// POST /api/integrations/hubspot - Connect HubSpot
export async function POST(req: NextRequest) {
  // TODO: Implement logic to connect HubSpot (OAuth flow)
  return NextResponse.json({ message: 'HubSpot connect endpoint' });
}
