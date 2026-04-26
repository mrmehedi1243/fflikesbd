import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Dispatch delivery for a single order (like or visit). Used by admin Approve action.
// Auth: requires the authenticated user to be admin.
export const Route = createFileRoute("/api/dispatch")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          // Verify admin via bearer token from Supabase auth
          const auth = request.headers.get("authorization") || "";
          const token = auth.replace(/^Bearer\s+/i, "");
          if (!token) return json({ error: "Unauthorized" }, 401);
          const { data: userRes, error: uErr } = await supabaseAdmin.auth.getUser(token);
          if (uErr || !userRes?.user) return json({ error: "Unauthorized" }, 401);
          const { data: roles } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userRes.user.id);
          if (!roles?.some((r) => r.role === "admin")) return json({ error: "Forbidden" }, 403);

          const url = new URL(request.url);
          const orderId = url.searchParams.get("order_id");
          if (!orderId) return json({ error: "order_id required" }, 400);

          const { data: order, error } = await supabaseAdmin
            .from("orders")
            .select("*")
            .eq("id", orderId)
            .single();
          if (error || !order) return json({ error: "Order not found" }, 404);
          if (order.status !== "pending" && order.status !== "approved") return json({ error: "Order not active" }, 400);

          const result =
            order.type === "visit" ? await deliverAllVisits(order) : await deliverLike(order);
          return json(result, result.success ? 200 : 500);
        } catch (e: any) {
          return json({ error: e.message || "Dispatch error" }, 500);
        }
      },
    },
  },
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

async function deliverLike(order: any) {
  const { data: settings } = await supabaseAdmin.from("app_settings").select("like_api_url").eq("id", 1).single();
  const apiTpl = settings?.like_api_url || "";
  const apiUrl = apiTpl.replace("{uid}", encodeURIComponent(order.ff_uid));

  let apiResponse: any = null;
  let success = false;
  let errorMessage: string | null = null;
  let likesSent = 0;

  try {
    const res = await fetch(apiUrl, { method: "GET" });
    const text = await res.text();
    try { apiResponse = JSON.parse(text); } catch { apiResponse = { raw: text }; }
    success = res.ok;
    if (!res.ok) errorMessage = `HTTP ${res.status}`;
    // Use configured per-day count (admin-controlled) regardless of API echo
    likesSent = success ? order.likes_per_day : 0;
  } catch (e: any) {
    errorMessage = e.message;
    apiResponse = { error: e.message };
  }

  // Insert log
  await supabaseAdmin.from("like_logs").insert({
    order_id: order.id,
    likes_sent: likesSent,
    api_response: apiResponse,
    success,
    error_message: errorMessage,
  });

  if (success) {
    const newDays = (order.days_completed || 0) + 1;
    const newTotal = (order.total_likes_sent || 0) + likesSent;
    const completed = newDays >= order.duration_days;
    const next = completed ? null : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await supabaseAdmin
      .from("orders")
      .update({
        status: completed ? "completed" : "approved",
        approved_at: order.approved_at ?? new Date().toISOString(),
        days_completed: newDays,
        total_likes_sent: newTotal,
        next_run_at: next,
      })
      .eq("id", order.id);
  } else if (order.status === "pending") {
    // First-time approval failed — still mark approved so admin sees it scheduled
    await supabaseAdmin
      .from("orders")
      .update({
        status: "approved",
        approved_at: new Date().toISOString(),
        next_run_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // retry in 1h
      })
      .eq("id", order.id);
  }

  return { success, likesSent, errorMessage };
}

// ---- VISIT DELIVERY ----
// Visit API gives a fixed batch (e.g. 10k) per call. We loop until package target is met.
const VISITS_PER_CALL = 10000;

async function deliverAllVisits(order: any) {
  const { data: settings } = await supabaseAdmin
    .from("app_settings")
    .select("visit_api_url")
    .eq("id", 1)
    .single();
  const apiTpl = settings?.visit_api_url || "";
  if (!apiTpl) return { success: false, errorMessage: "Visit API URL not configured" };

  const target = order.visits_target || 0;
  if (!target) return { success: false, errorMessage: "Package has no visits target" };

  // Mark approved immediately so user sees movement
  await supabaseAdmin
    .from("orders")
    .update({
      status: "approved",
      approved_at: order.approved_at ?? new Date().toISOString(),
    })
    .eq("id", order.id);

  let delivered = order.visits_delivered || 0;
  const callsNeeded = Math.ceil((target - delivered) / VISITS_PER_CALL);
  let lastError: string | null = null;
  let anySuccess = false;

  for (let i = 0; i < callsNeeded; i++) {
    const apiUrl = apiTpl.replace("{uid}", encodeURIComponent(order.ff_uid));
    let success = false;
    let errorMessage: string | null = null;
    let apiResponse: any = null;
    let visitsThisCall = 0;
    try {
      // Visit API can be slow — wait up to 90s
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 90_000);
      const res = await fetch(apiUrl, { method: "GET", signal: ctrl.signal });
      clearTimeout(timer);
      const text = await res.text();
      try { apiResponse = JSON.parse(text); } catch { apiResponse = { raw: text }; }
      success = res.ok;
      if (!res.ok) errorMessage = `HTTP ${res.status}`;
      if (success) {
        // Cap at remaining target so we never exceed package size
        const remaining = target - delivered;
        visitsThisCall = Math.min(VISITS_PER_CALL, remaining);
        delivered += visitsThisCall;
        anySuccess = true;
      }
    } catch (e: any) {
      errorMessage = e.name === "AbortError" ? "Visit API timeout (90s)" : e.message;
      apiResponse = { error: errorMessage };
    }

    await supabaseAdmin.from("visit_logs").insert({
      order_id: order.id,
      visits_sent: visitsThisCall,
      success,
      error_message: errorMessage,
      api_response: apiResponse,
    });

    if (!success) { lastError = errorMessage; break; }
  }

  const completed = delivered >= target;
  await supabaseAdmin
    .from("orders")
    .update({
      visits_delivered: delivered,
      status: completed ? "completed" : "approved",
      next_run_at: null,
    })
    .eq("id", order.id);

  return {
    success: anySuccess,
    visitsDelivered: delivered,
    target,
    completed,
    errorMessage: lastError,
  };
}

export { deliverLike, deliverAllVisits };
