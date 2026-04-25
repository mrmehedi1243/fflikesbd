import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Zap, Clock, CheckCircle2, XCircle, Hourglass } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/orders")({
  component: OrdersPage,
});

type Order = {
  id: string;
  ff_uid: string;
  status: "pending" | "approved" | "rejected" | "completed";
  likes_per_day: number;
  duration_days: number;
  days_completed: number;
  total_likes_sent: number;
  next_run_at: string | null;
  approved_at: string | null;
  created_at: string;
  rejection_reason: string | null;
  packages: { name: string; price_bdt: number } | null;
};
type Log = { id: string; order_id: string; run_date: string; likes_sent: number; success: boolean; error_message: string | null; created_at: string };

function Countdown({ to }: { to: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const diff = Math.max(0, new Date(to).getTime() - now);
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return (
    <div className="flex gap-1.5 font-mono">
      {[["H", h], ["M", m], ["S", s]].map(([l, v]) => (
        <div key={l as string} className="bg-background border border-border rounded px-2 py-1 text-center min-w-[42px]">
          <div className="text-base font-bold text-primary leading-none">{String(v).padStart(2, "0")}</div>
          <div className="text-[9px] text-muted-foreground">{l}</div>
        </div>
      ))}
    </div>
  );
}

function OrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [logs, setLogs] = useState<Record<string, Log[]>>({});
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data: settings } = await supabase.from("app_settings").select("banner_api_url").eq("id", 1).single();
      const tpl = settings?.banner_api_url || "";
      setBannerUrl(tpl);
      const { data } = await supabase
        .from("orders")
        .select("id,ff_uid,status,likes_per_day,duration_days,days_completed,total_likes_sent,next_run_at,approved_at,created_at,rejection_reason,packages(name,price_bdt)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      const list = (data ?? []) as unknown as Order[];
      setOrders(list);
      if (list.length) {
        const { data: l } = await supabase
          .from("like_logs")
          .select("*")
          .in("order_id", list.map((o) => o.id))
          .order("created_at", { ascending: false });
        const grouped: Record<string, Log[]> = {};
        (l ?? []).forEach((row: any) => {
          (grouped[row.order_id] = grouped[row.order_id] || []).push(row as Log);
        });
        setLogs(grouped);
      }
    })();
  }, [user]);

  const statusBadge = (s: Order["status"]) => {
    const map = {
      pending: { label: "Pending", icon: Hourglass, cls: "bg-warning/15 text-warning border-warning/30" },
      approved: { label: "Active", icon: CheckCircle2, cls: "bg-success/15 text-success border-success/30" },
      rejected: { label: "Rejected", icon: XCircle, cls: "bg-destructive/15 text-destructive border-destructive/30" },
      completed: { label: "Completed", icon: CheckCircle2, cls: "bg-primary/15 text-primary border-primary/30" },
    }[s];
    const Icon = map.icon;
    return <Badge className={`${map.cls} border gap-1`}><Icon className="w-3 h-3"/>{map.label}</Badge>;
  };

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <h1 className="font-display font-bold text-2xl">My Orders</h1>

      {orders.length === 0 && (
        <Card className="bg-gradient-card border-border p-8 text-center text-muted-foreground">No orders yet.</Card>
      )}

      <div className="space-y-4">
        {orders.map((o) => {
          const showBanner = (o.status === "approved" || o.status === "pending") && bannerUrl;
          const orderLogs = logs[o.id] || [];
          return (
            <Card key={o.id} className="bg-gradient-card border-border overflow-hidden shadow-card">
              {/* Header */}
              <div className="p-4 flex items-center justify-between border-b border-border">
                <div>
                  <div className="text-xs text-muted-foreground">UID</div>
                  <div className="font-mono font-bold text-base">{o.ff_uid}</div>
                </div>
                {statusBadge(o.status)}
              </div>

              {/* Banner */}
              {showBanner && (
                <div className="bg-background border-b border-border">
                  <img src={bannerUrl!.replace("{uid}", encodeURIComponent(o.ff_uid))} alt="FF profile" className="w-full max-h-[200px] object-contain" onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} />
                </div>
              )}

              {/* Stats */}
              <div className="p-4 grid grid-cols-3 gap-2">
                <div className="bg-background/60 rounded-lg p-2.5 text-center">
                  <div className="text-[10px] text-muted-foreground">Per day</div>
                  <div className="flex items-center justify-center gap-1 font-bold text-primary"><Zap className="w-3.5 h-3.5"/>{o.likes_per_day}</div>
                </div>
                <div className="bg-background/60 rounded-lg p-2.5 text-center">
                  <div className="text-[10px] text-muted-foreground">Days</div>
                  <div className="flex items-center justify-center gap-1 font-bold text-accent"><Calendar className="w-3.5 h-3.5"/>{o.days_completed}/{o.duration_days}</div>
                </div>
                <div className="bg-background/60 rounded-lg p-2.5 text-center">
                  <div className="text-[10px] text-muted-foreground">Total likes</div>
                  <div className="font-bold text-success">{o.total_likes_sent}</div>
                </div>
              </div>

              {/* Timer */}
              {o.status === "approved" && o.next_run_at && (
                <div className="px-4 pb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground"><Clock className="w-4 h-4"/>Next delivery in</div>
                  <Countdown to={o.next_run_at} />
                </div>
              )}

              {/* Rejected reason */}
              {o.status === "rejected" && o.rejection_reason && (
                <div className="px-4 pb-3 text-sm text-destructive">Reason: {o.rejection_reason}</div>
              )}

              {/* Like history boxes */}
              {orderLogs.length > 0 && (
                <div className="px-4 pb-4">
                  <div className="text-xs text-muted-foreground mb-2">Delivery history</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {orderLogs.map((lg) => (
                      <div key={lg.id} className={`rounded-lg p-2.5 border ${lg.success ? "border-success/30 bg-success/10" : "border-destructive/30 bg-destructive/10"}`}>
                        <div className="text-[10px] text-muted-foreground">{new Date(lg.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</div>
                        <div className="text-[10px] text-muted-foreground">{new Date(lg.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</div>
                        <div className={`mt-1 font-bold flex items-center gap-1 ${lg.success ? "text-success" : "text-destructive"}`}>
                          <Zap className="w-3.5 h-3.5"/>{lg.likes_sent} likes
                        </div>
                        {!lg.success && lg.error_message && <div className="text-[10px] text-destructive truncate mt-0.5">{lg.error_message}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
