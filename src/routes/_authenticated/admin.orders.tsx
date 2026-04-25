import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, CheckCircle2, XCircle, Loader2, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/orders")({
  component: AdminOrders,
});

type Order = {
  id: string;
  user_id: string;
  ff_uid: string;
  trx_id: string;
  payment_screenshot_url: string | null;
  status: "pending" | "approved" | "rejected" | "completed";
  likes_per_day: number;
  duration_days: number;
  days_completed: number;
  total_likes_sent: number;
  next_run_at: string | null;
  created_at: string;
  rejection_reason: string | null;
  packages: { name: string; price_bdt: number } | null;
  profiles: { email: string | null; full_name: string | null } | null;
};

function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"pending" | "approved" | "rejected" | "completed" | "all">("pending");
  const [view, setView] = useState<Order | null>(null);
  const [shotUrl, setShotUrl] = useState<string | null>(null);
  const [reject, setReject] = useState<Order | null>(null);
  const [reason, setReason] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("orders")
      .select("*, packages(name,price_bdt), profiles!orders_user_id_fkey(email,full_name)")
      .order("created_at", { ascending: false });
    setOrders((data ?? []) as unknown as Order[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function openShot(o: Order) {
    setView(o);
    setShotUrl(null);
    if (o.payment_screenshot_url) {
      const { data, error } = await supabase.storage.from("payment-screenshots").createSignedUrl(o.payment_screenshot_url, 600);
      if (!error && data) setShotUrl(data.signedUrl);
    }
  }

  async function approve(o: Order) {
    setBusyId(o.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/dispatch?order_id=${o.id}&first=1`, {
        method: "POST",
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Dispatch failed");
      toast.success("Approved & first like sent!");
      await load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusyId(null);
    }
  }

  async function doReject() {
    if (!reject) return;
    setBusyId(reject.id);
    try {
      const { error } = await supabase.from("orders").update({ status: "rejected", rejection_reason: reason || "Rejected by admin" }).eq("id", reject.id);
      if (error) throw error;
      toast.success("Order rejected");
      setReject(null);
      setReason("");
      await load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusyId(null);
    }
  }

  const filtered = tab === "all" ? orders : orders.filter((o) => o.status === tab);

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <h1 className="font-display font-bold text-2xl">Orders</h1>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Active</TabsTrigger>
          <TabsTrigger value="completed">Done</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
        <TabsContent value={tab} className="space-y-3 mt-4">
          {loading && <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary"/></div>}
          {!loading && filtered.length === 0 && (
            <Card className="bg-gradient-card border-border p-8 text-center text-muted-foreground">No orders here.</Card>
          )}
          {filtered.map((o) => (
            <Card key={o.id} className="bg-gradient-card border-border p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-mono font-bold">{o.ff_uid}</div>
                  <div className="text-xs text-muted-foreground truncate">{o.profiles?.email ?? "—"}</div>
                </div>
                <Badge variant="outline" className="capitalize">{o.status}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-muted-foreground">Pack:</span> {o.packages?.name} (৳{o.packages ? Number(o.packages.price_bdt) : "?"})</div>
                <div><span className="text-muted-foreground">TrxID:</span> <span className="font-mono">{o.trx_id}</span></div>
                <div><span className="text-muted-foreground">Plan:</span> {o.likes_per_day}/day × {o.duration_days}d</div>
                <div><span className="text-muted-foreground">Sent:</span> {o.total_likes_sent} likes ({o.days_completed}/{o.duration_days})</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => openShot(o)}><Eye className="w-3.5 h-3.5 mr-1"/>View</Button>
                {o.status === "pending" && (
                  <>
                    <Button size="sm" disabled={busyId === o.id} onClick={() => approve(o)} className="bg-success text-success-foreground hover:bg-success/90">
                      {busyId === o.id ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <><CheckCircle2 className="w-3.5 h-3.5 mr-1"/>Approve</>}
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => setReject(o)}><XCircle className="w-3.5 h-3.5 mr-1"/>Reject</Button>
                  </>
                )}
              </div>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {/* Screenshot view */}
      <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader><DialogTitle>Order #{view?.id.slice(0, 8)}</DialogTitle></DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div><div className="text-xs text-muted-foreground">UID</div><div className="font-mono">{view?.ff_uid}</div></div>
              <div><div className="text-xs text-muted-foreground">TrxID</div><div className="font-mono">{view?.trx_id}</div></div>
              <div><div className="text-xs text-muted-foreground">Email</div><div className="truncate">{view?.profiles?.email}</div></div>
              <div><div className="text-xs text-muted-foreground">Package</div><div>{view?.packages?.name}</div></div>
            </div>
            <div className="text-xs text-muted-foreground">Payment screenshot</div>
            <div className="rounded-md border border-border bg-background min-h-[180px] grid place-items-center overflow-hidden">
              {!view?.payment_screenshot_url && <ImageIcon className="w-8 h-8 text-muted-foreground"/>}
              {view?.payment_screenshot_url && !shotUrl && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground"/>}
              {shotUrl && <img src={shotUrl} alt="screenshot" className="w-full max-h-[400px] object-contain"/>}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={!!reject} onOpenChange={(o) => !o && setReject(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>Reject order</DialogTitle></DialogHeader>
          <Label>Reason (optional)</Label>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Invalid TrxID" />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setReject(null)}>Cancel</Button>
            <Button variant="destructive" disabled={busyId === reject?.id} onClick={doReject}>
              {busyId === reject?.id ? <Loader2 className="w-4 h-4 animate-spin"/> : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
