import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Calendar, Zap, Clock, CheckCircle2, XCircle, Hourglass, Eye, Heart, KeyRound, Copy, Check, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/orders")({
  component: OrdersPage,
});

type Order = {
  id: string;
  ff_uid: string;
  status: "pending" | "approved" | "rejected" | "completed";
  type: "like" | "visit";
  likes_per_day: number;
  duration_days: number;
  days_completed: number;
  total_likes_sent: number;
  visits_target: number;
  visits_delivered: number;
  next_run_at: string | null;
  approved_at: string | null;
  created_at: string;
  rejection_reason: string | null;
  packages: { name: string; price_bdt: number } | null;
};
type Log = { id: string; order_id: string; run_date?: string; likes_sent?: number; visits_sent?: number; success: boolean; error_message: string | null; created_at: string };
type PanelOrder = {
  id: string;
  status: "pending" | "approved" | "rejected" | "delivered";
  trx_id: string;
  delivered_key: string | null;
  apk_link: string | null;
  rejection_reason: string | null;
  created_at: string;
  panel_packages: { name: string; price_bdt: number; apk_link: string | null } | null;
};

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

function statusBadge(s: Order["status"]) {
  const map: Record<Order["status"], { label: string; icon: any; cls: string }> = {
    pending: { label: "Pending", icon: Hourglass, cls: "bg-warning/15 text-warning border-warning/30" },
    approved: { label: "Active", icon: CheckCircle2, cls: "bg-success/15 text-success border-success/30" },
    rejected: { label: "Rejected", icon: XCircle, cls: "bg-destructive/15 text-destructive border-destructive/30" },
    completed: { label: "Completed", icon: CheckCircle2, cls: "bg-primary/15 text-primary border-primary/30" },
  };
  const m = map[s];
  const Icon = m.icon;
  return <Badge className={`${m.cls} border gap-1`}><Icon className="w-3 h-3"/>{m.label}</Badge>;
}

function OrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [panelOrders, setPanelOrders] = useState<PanelOrder[]>([]);
  const [likeLogs, setLikeLogs] = useState<Record<string, Log[]>>({});
  const [visitLogs, setVisitLogs] = useState<Record<string, Log[]>>({});
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [tab, setTab] = useState<"all" | "pending" | "approved" | "completed" | "rejected">("all");

  useEffect(() => {
    if (!user) return;

    let alive = true;
    const load = async () => {
      const { data: settings } = await supabase.from("app_settings").select("banner_api_url").eq("id", 1).single();
      const { data } = await supabase
        .from("orders")
        .select("id,ff_uid,status,type,likes_per_day,duration_days,days_completed,total_likes_sent,visits_target,visits_delivered,next_run_at,approved_at,created_at,rejection_reason,packages(name,price_bdt)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!alive) return;

      setBannerUrl(settings?.banner_api_url || null);
      const list = (data ?? []) as unknown as Order[];
      setOrders(list);

      const { data: pos } = await supabase
        .from("panel_orders")
        .select("id,status,trx_id,delivered_key,apk_link,rejection_reason,created_at,panel_packages(name,price_bdt,apk_link)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (alive) setPanelOrders((pos ?? []) as unknown as PanelOrder[]);

      if (!list.length) {
        setLikeLogs({});
        setVisitLogs({});
        return;
      }

      const ids = list.map((o) => o.id);
      const [{ data: ll }, { data: vl }] = await Promise.all([
        supabase.from("like_logs").select("*").in("order_id", ids).order("created_at", { ascending: false }),
        supabase.from("visit_logs").select("*").in("order_id", ids).order("created_at", { ascending: false }),
      ]);

      if (!alive) return;

      const gL: Record<string, Log[]> = {};
      (ll ?? []).forEach((row: any) => { (gL[row.order_id] = gL[row.order_id] || []).push(row); });
      setLikeLogs(gL);
      const gV: Record<string, Log[]> = {};
      (vl ?? []).forEach((row: any) => { (gV[row.order_id] = gV[row.order_id] || []).push(row); });
      setVisitLogs(gV);
    };

    load();
    const interval = window.setInterval(load, 15000);
    return () => {
      alive = false;
      window.clearInterval(interval);
    };
  }, [user]);

  const filtered = tab === "all" ? orders : orders.filter((o) => o.status === tab);

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <h1 className="font-display font-bold text-2xl">My Orders</h1>

      {panelOrders.length > 0 && (
        <div className="space-y-3">
          <div className="text-sm font-semibold flex items-center gap-1.5"><KeyRound className="w-4 h-4 text-primary"/>Panel Orders</div>
          {panelOrders.map((p) => (
            <Card key={p.id} className="bg-gradient-card border-border p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-semibold truncate">{p.panel_packages?.name ?? "Panel"}</div>
                  <div className="text-xs text-muted-foreground">TrxID: <span className="font-mono">{p.trx_id}</span></div>
                </div>
                <Badge className={`border gap-1 ${p.status === "delivered" ? "bg-success/15 text-success border-success/30" : p.status === "rejected" ? "bg-destructive/15 text-destructive border-destructive/30" : "bg-warning/15 text-warning border-warning/30"}`}>
                  {p.status === "delivered" ? <CheckCircle2 className="w-3 h-3"/> : p.status === "rejected" ? <XCircle className="w-3 h-3"/> : <Hourglass className="w-3 h-3"/>}
                  {p.status}
                </Badge>
              </div>
              {p.status === "delivered" && p.delivered_key && (
                <div className="rounded-lg border border-success/30 bg-success/5 p-3 space-y-2">
                  <div className="text-xs text-muted-foreground">Your Key</div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 font-mono text-sm bg-background border border-border rounded px-2 py-1.5 break-all">{p.delivered_key}</code>
                    <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(p.delivered_key!); toast.success("Copied"); }}><Copy className="w-3.5 h-3.5"/></Button>
                  </div>
                  {(p.apk_link || p.panel_packages?.apk_link) && (
                    <a href={(p.apk_link || p.panel_packages?.apk_link)!} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
                      <Download className="w-3.5 h-3.5"/>Download latest APK
                    </a>
                  )}
                </div>
              )}
              {p.status === "rejected" && p.rejection_reason && <div className="text-sm text-destructive">Reason: {p.rejection_reason}</div>}
            </Card>
          ))}
        </div>
      )}

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Active</TabsTrigger>
          <TabsTrigger value="completed">Done</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>
        <TabsContent value={tab} className="mt-4 space-y-4">
          {filtered.length === 0 && (
            <Card className="bg-gradient-card border-border p-8 text-center text-muted-foreground">No orders here.</Card>
          )}
          {filtered.map((o) => {
            const showBanner = (o.status === "approved" || o.status === "pending") && bannerUrl;
            const isVisit = o.type === "visit";
            const logs = isVisit ? (visitLogs[o.id] || []) : (likeLogs[o.id] || []);
            return (
              <Card key={o.id} className="bg-gradient-card border-border overflow-hidden shadow-card">
                <div className="p-4 flex items-center justify-between border-b border-border gap-2">
                  <div className="min-w-0">
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      {isVisit ? <Eye className="w-3 h-3 text-accent"/> : <Heart className="w-3 h-3 text-primary"/>}
                      {o.packages?.name || (isVisit ? "Visit Package" : "Like Package")} • UID
                    </div>
                    <div className="font-mono font-bold text-base truncate">{o.ff_uid}</div>
                  </div>
                  {statusBadge(o.status)}
                </div>

                {showBanner && (
                  <div className="bg-background border-b border-border">
                    <img src={bannerUrl!.replace("{uid}", encodeURIComponent(o.ff_uid))} alt="FF profile" className="w-full max-h-[200px] object-contain" onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} />
                  </div>
                )}

                {/* Stats */}
                {isVisit ? (
                  <div className="p-4 grid grid-cols-3 gap-2">
                    <div className="bg-background/60 rounded-lg p-2.5 text-center">
                      <div className="text-[10px] text-muted-foreground">Target</div>
                      <div className="flex items-center justify-center gap-1 font-bold text-accent"><Eye className="w-3.5 h-3.5"/>{o.visits_target.toLocaleString()}</div>
                    </div>
                    <div className="bg-background/60 rounded-lg p-2.5 text-center">
                      <div className="text-[10px] text-muted-foreground">Delivered</div>
                      <div className="font-bold text-success">{o.visits_delivered.toLocaleString()}</div>
                    </div>
                    <div className="bg-background/60 rounded-lg p-2.5 text-center">
                      <div className="text-[10px] text-muted-foreground">Remaining</div>
                      <div className="font-bold text-primary">{Math.max(0, o.visits_target - o.visits_delivered).toLocaleString()}</div>
                    </div>
                  </div>
                ) : (
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
                )}

                {!isVisit && o.status === "approved" && o.next_run_at && (
                  <div className="px-4 pb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground"><Clock className="w-4 h-4"/>Next delivery in</div>
                    <Countdown to={o.next_run_at} />
                  </div>
                )}

                {o.status === "rejected" && o.rejection_reason && (
                  <div className="px-4 pb-3 text-sm text-destructive">Reason: {o.rejection_reason}</div>
                )}

                {logs.length > 0 && (
                  <div className="px-4 pb-4">
                    <div className="text-xs text-muted-foreground mb-2">Delivery history</div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {logs.map((lg) => {
                        const amount = isVisit ? (lg.visits_sent || 0) : (lg.likes_sent || 0);
                        return (
                          <div key={lg.id} className={`rounded-lg p-2.5 border ${lg.success ? "border-success/30 bg-success/10" : "border-destructive/30 bg-destructive/10"}`}>
                            <div className="text-[10px] text-muted-foreground">{new Date(lg.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</div>
                            <div className="text-[10px] text-muted-foreground">{new Date(lg.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</div>
                            <div className={`mt-1 font-bold flex items-center gap-1 ${lg.success ? "text-success" : "text-destructive"}`}>
                              {isVisit ? <Eye className="w-3.5 h-3.5"/> : <Zap className="w-3.5 h-3.5"/>}
                              {amount.toLocaleString()} {isVisit ? "visits" : "likes"}
                            </div>
                            {!lg.success && lg.error_message && <div className="text-[10px] text-destructive truncate mt-0.5">{lg.error_message}</div>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>
    </div>
  );
}
