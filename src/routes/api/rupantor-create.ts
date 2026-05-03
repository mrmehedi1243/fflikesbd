import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

function json(d: any, s = 200) {
  return new Response(JSON.stringify(d), { status: s, headers: { "Content-Type": "application/json" } });
}

export const Route = createFileRoute("/api/rupantor-create")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const auth = request.headers.get("authorization") || "";
          const token = auth.replace(/^Bearer\s+/i, "");
          if (!token) return json({ error: "Unauthorized" }, 401);
          const { data: userRes, error: uErr } = await supabaseAdmin.auth.getUser(token);
          if (uErr || !userRes?.user) return json({ error: "Unauthorized" }, 401);
          const user = userRes.user;

          const body = await request.json().catch(() => ({}));
          const { package_id, ff_uid } = body as { package_id?: string; ff_uid?: string };
          if (!package_id || !ff_uid || !/^\d{6,}$/.test(ff_uid)) {
            return json({ error: "Invalid input" }, 400);
          }

          // Check enabled
          const { data: settings } = await supabaseAdmin
            .from("app_settings")
            .select("rupantor_enabled")
            .eq("id", 1)
            .single();
          if (!settings?.rupantor_enabled) return json({ error: "RupantorPay disabled" }, 400);

          const { data: pkg, error: pErr } = await supabaseAdmin
            .from("packages")
            .select("*")
            .eq("id", package_id)
            .single();
          if (pErr || !pkg) return json({ error: "Package not found" }, 404);
          if (!pkg.is_active) return json({ error: "Package inactive" }, 400);

          // Create pending order with placeholder trx
          const placeholderTrx = `RP-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
          const { data: order, error: oErr } = await supabaseAdmin
            .from("orders")
            .insert({
              user_id: user.id,
              package_id: pkg.id,
              ff_uid: ff_uid.trim(),
              trx_id: placeholderTrx,
              likes_per_day: pkg.likes_per_day,
              duration_days: pkg.duration_days,
              type: pkg.type,
              visits_target: pkg.type === "visit" ? pkg.visits_count : 0,
              status: "pending",
              payment_provider: "rupantorpay",
            })
            .select()
            .single();
          if (oErr || !order) return json({ error: oErr?.message || "Order create failed" }, 500);

          const apiKey = process.env.RUPANTORPAY_BRAND_KEY;
          if (!apiKey) return json({ error: "Payment gateway not configured" }, 500);

          const origin = new URL(request.url).origin;
          const host = new URL(request.url).host;

          const fullname = (user.user_metadata?.full_name as string) || user.email?.split("@")[0] || "Customer";
          const email = user.email || "noreply@example.com";

          const payload = {
            fullname,
            email,
            amount: String(Number(pkg.price_bdt)),
            success_url: `${origin}/api/public/rupantor-callback?order_id=${order.id}&kind=success`,
            cancel_url: `${origin}/api/public/rupantor-callback?order_id=${order.id}&kind=cancel`,
            webhook_url: `${origin}/api/public/rupantor-callback?order_id=${order.id}&kind=webhook`,
            metadata: { order_id: order.id, ff_uid: ff_uid.trim() },
          };

          const resp = await fetch("https://payment.rupantorpay.com/api/payment/checkout", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-API-KEY": apiKey,
              "X-CLIENT": host,
            },
            body: JSON.stringify(payload),
          });
          const result: any = await resp.json().catch(() => ({}));

          if (!resp.ok || !result?.payment_url) {
            await supabaseAdmin.from("orders").delete().eq("id", order.id);
            return json({ error: result?.message || "Failed to create payment" }, 502);
          }

          await supabaseAdmin
            .from("orders")
            .update({ payment_url: result.payment_url })
            .eq("id", order.id);

          return json({ payment_url: result.payment_url, order_id: order.id });
        } catch (e: any) {
          return json({ error: e?.message || "Server error" }, 500);
        }
      },
    },
  },
});