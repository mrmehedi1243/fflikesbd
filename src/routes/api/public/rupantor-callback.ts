import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

function json(d: any, s = 200) {
  return new Response(JSON.stringify(d), { status: s, headers: { "Content-Type": "application/json" } });
}

async function verifyAndProcess(orderId: string, transactionId: string | null) {
  const apiKey = process.env.RUPANTORPAY_BRAND_KEY;
  if (!apiKey || !transactionId) return { ok: false, msg: "Missing config or txn" };

  const resp = await fetch("https://payment.rupantorpay.com/api/payment/verify-payment", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-KEY": apiKey },
    body: JSON.stringify({ transaction_id: transactionId }),
  });
  const data: any = await resp.json().catch(() => ({}));

  const status = String(data?.status || "").toUpperCase();
  const completed = status === "COMPLETED";

  const { data: order } = await supabaseAdmin
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();
  if (!order) return { ok: false, msg: "Order not found" };

  if (completed && order.status === "pending") {
    const updates: any = {
      status: "approved",
      trx_id: data?.trx_id || transactionId,
      payment_ref: transactionId,
      approved_at: new Date().toISOString(),
    };
    if (order.type === "like") {
      updates.next_run_at = new Date().toISOString();
    }
    await supabaseAdmin.from("orders").update(updates).eq("id", orderId);
  } else if (status === "ERROR") {
    await supabaseAdmin
      .from("orders")
      .update({ status: "rejected", rejection_reason: "Payment failed at gateway", payment_ref: transactionId })
      .eq("id", orderId);
  }
  return { ok: completed, status };
}

export const Route = createFileRoute("/api/public/rupantor-callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const orderId = url.searchParams.get("order_id");
        const kind = url.searchParams.get("kind") || "success";
        const transactionId = url.searchParams.get("transactionId");
        if (!orderId) return new Response("Missing order_id", { status: 400 });

        if (kind === "success") {
          await verifyAndProcess(orderId, transactionId);
          throw redirect({ to: "/dashboard/orders" });
        }
        if (kind === "cancel") {
          await supabaseAdmin
            .from("orders")
            .update({ status: "rejected", rejection_reason: "Payment cancelled by user" })
            .eq("id", orderId)
            .eq("status", "pending");
          throw redirect({ to: "/dashboard/orders" });
        }
        // webhook GET fallback
        const r = await verifyAndProcess(orderId, transactionId);
        return json({ ok: r.ok });
      },
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const orderId = url.searchParams.get("order_id");
        if (!orderId) return json({ error: "Missing order_id" }, 400);
        const body = await request.json().catch(() => ({} as any));
        const transactionId = body?.transaction_id || body?.transactionId || url.searchParams.get("transactionId");
        const r = await verifyAndProcess(orderId, transactionId);
        return json({ ok: r.ok, status: r.status });
      },
    },
  },
});