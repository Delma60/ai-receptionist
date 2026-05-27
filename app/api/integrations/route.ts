import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

// GET /api/integrations - List all available integrations
export async function GET(req: NextRequest) {
  try {
    const snapshot = await db.collection('available_integrations').get();
    const integrations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return NextResponse.json({ integrations });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch integrations.' }, { status: 500 });
  }
}

// POST /api/integrations - Add a new integration (admin only, extend as needed)
export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    if (!data.id || !data.name) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }
    await db.collection('available_integrations').doc(data.id).set(data, { merge: true });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to add integration.' }, { status: 500 });
  }
}
