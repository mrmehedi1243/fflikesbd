import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { deliverLike } from "../dispatch";

// Public cron endpoint — runs every X minutes, processes all orders whose next_run_at <= now.
// Optional: protect with CRON_SECRET header.
export const Route = createFileRoute("/api/public/cron-likes")({
  server: {
    handlers: {
      GET: handler,
      POST: handler,
    },
  },
});

async function handler({ request }: { request: Request }) {
  const expected = process.env.CRON_SECRET;
  if (expected) {
    const got = request.headers.get("x-cron-secret") || new URL(request.url).searchParams.get("secret");
    if (got !== expected) return json({ error: "Unauthorized" }, 401);
  }

  const nowIso = new Date().toISOString();
  const { data: due, error } = await supabaseAdmin
    .from("orders")
    .select("*")
    .eq("status", "approved")
    .not("next_run_at", "is", null)
    .lte("next_run_at", nowIso)
    .limit(50);
  if (error) return json({ error: error.message }, 500);

  const results: any[] = [];
  for (const o of due ?? []) {
    try {
      const r = await deliverLike(o);
      results.push({ id: o.id, ...r });
    } catch (e: any) {
      results.push({ id: o.id, success: false, error: e.message });
    }
  }
  return json({ processed: results.length, results });
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
