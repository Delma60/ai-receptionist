import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";
import { stripe } from "@/lib/stripe";
import { auth } from "@clerk/nextjs/server";

export async function POST(req: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    // Note: In production, verify admin role via Clerk publicMetadata or a custom 'admins' collection

    const { tenantId } = await req.json();
    if (!tenantId) return NextResponse.json({ message: "Tenant ID required" }, { status: 400 });

  const tenantRef = db.collection("tenants").doc(tenantId);
    const tenantSnap = await tenantRef.get();
    
    if (!tenantSnap.exists) return NextResponse.json({ message: "Tenant not found" }, { status: 404 });
    const tenant = tenantSnap.data()!;

    // Fetch dynamic rate from platform config
    const configSnap = await db.collection("platform").doc("config").get();
    const rate = configSnap.data()?.overageRate || 0.08;

    const overage = (tenant.minutesUsed || 0) - (tenant.minutesLimit || 0);
    if (overage <= 0) return NextResponse.json({ message: "No overage to bill" }, { status: 400 });

    const amountInCents = Math.round(overage * rate * 100);

    if (!tenant.stripeCustomerId) {
      return NextResponse.json({ message: "Tenant has no Stripe Customer ID" }, { status: 400 });
    }

    // 1. Create the pending line item
    await stripe.invoiceItems.create({
      customer: tenant.stripeCustomerId,
      amount: amountInCents,
      currency: "usd",
      description: `Overage Billing: ${overage.toLocaleString()} additional minutes at $${rate}/min`,
    });

    // 2. Create the invoice
    const invoice = await stripe.invoices.create({
      customer: tenant.stripeCustomerId,
      auto_advance: true, // Attempt to automatically finalize and pay
    });

    // 3. Finalize the invoice (makes it immutable and ready for payment)
    const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);

    // 4. Reset usage in Firestore and create audit log
    await tenantRef.update({ 
      minutesUsed: tenant.minutesLimit, // Reset usage to the limit
      lastBilledAt: new Date()
    });

    await db.collection("auditLog").add({
      adminId: userId,
      action: "plan_change", // Mapping to existing roadmap actions
      targetTenantId: tenantId,
      metadata: { invoiceId: finalizedInvoice.id, amount: overage * rate, overageMinutes: overage },
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true, invoiceId: finalizedInvoice.id });

  } catch (err: any) {
    console.error("[Overage Billing API Error]", err);
    return NextResponse.json({ message: err.message || "Internal server error" }, { status: 500 });
  }
}