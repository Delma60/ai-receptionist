import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { INTEGRATIONS_CATALOG } from '@/lib/integrations-catalog';

// GET /api/integrations - List all available integrations
export async function GET(req: NextRequest) {
  try {
    // Fetch available integrations from Firestore
    const availablePromise = adminDb.collection('available_integrations').get();
    // Static catalog (could also be loaded from config/app.json)
    const catalogPromise = Promise.resolve(INTEGRATIONS_CATALOG);

    const [snapshot, catalog] = await Promise.all([availablePromise, catalogPromise]);
    const available = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

    // Merge: for each catalog item, if not in available, mark as comingSoon
    const availableIds = new Set(available.map((i: any) => i.id));
    const merged = catalog.map((item: any) => {
      const found = available.find((i: any) => i.id === item.id);
      if (found) return { ...item, ...found, comingSoon: !!item.comingSoon };
      return { ...item, comingSoon: true };
    });

    // Optionally, add any available integrations not in catalog
    available.forEach((av: any) => {
      if (!catalog.find((c: any) => c.id === av.id)) {
        merged.push({ ...av, comingSoon: false });
      }
    });

    return NextResponse.json({ integrations: merged });
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
    await adminDb.collection('available_integrations').doc(data.id).set(data, { merge: true });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to add integration.' }, { status: 500 });
  }
}
