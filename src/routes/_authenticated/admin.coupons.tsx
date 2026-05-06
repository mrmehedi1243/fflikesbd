import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Loader2, Ticket, CheckCircle2, XCircle, Eye, Copy, Check } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/coupons")({
  component: AdminCoupons,
});

type CType = "like" | "visit" | "panel";
type Coupon = { id: string; type: CType; code: string; is_used: boolean; created_at: string };
type Order = {
  id: string; user_id: string; type: CType; trx_id: string;
  payment_screenshot_url: string | null; price_bdt: number;
  status: "pending" | "delivered" | "rejected";
  delivered_code: string | null; rejection_reason: string | null;
  created_at: string; user_email?: string | null;
};

function AdminCoupons() {
  const [tab, setTab] = useState<"orders" | "stock">("orders");
  const [orders, setOrders] = useState<Order[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [orderTab, setOrderTab] = useState<"pending" | "delivered" | "rejected" | "all">("pending");
  const [stockType, setStockType] = useState<CType>("like");
  const [bulk, setBulk] = useState("");

  const [view, setView] = useState<Order | null>(null);
  const [shotUrl, setShotUrl] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reject, setReject] = useState<Order | null>(null);
  const [reason, setReason] = useState("");
  const [showCode, setShowCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function load() {
    const [{ data: c }, { data: o }] = await Promise.all([
      supabase.from("coupons").select("*").order("created_at", { ascending: false }),
      supabase.from("coupon_orders").select("*").order("created_at", { ascending: false }),
    ]);
    setCoupons((c ?? []) as Coupon[]);
    const list = (o ?? []) as Order[];
    if (list.length) {
      const ids = Array.from(new Set(list.map((x) => x.user_id)));
      const { data: profs } = await supabase.from("profiles").select("user_id,email").in("user_id", ids);
      const map = new Map((profs ?? []).map((p: any) => [p.user_id, p.email]));
      list.forEach((x) => { x.user_email = map.get(x.user_id) ?? null; });
    }
    setOrders(list);
  }
  useEffect(() => { load(); }, []);

  async function addBulk() {
    const lines = bulk.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    if (!lines.length) return toast.error("Code din");
    const rows = lines.map((code) => ({ type: stockType, code }));
    const { error } = await supabase.from("coupons").insert(rows);
    if (error) return toast.error(error.message);
    toast.success(`${lines.length} coupons added`);
    setBulk("");
    load();
  }

  async function delCoupon(id: string) {
    if (!confirm("Delete coupon?")) return;
    const { error } = await supabase.from("coupons").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  }

  async function openOrder(o: Order) {
    setView(o); setShotUrl(null); setManualCode("");
    if (o.payment_screenshot_url) {
      const { data } = await supabase.storage.from("payment-screenshots").createSignedUrl(o.payment_screenshot_url, 600);
      if (data) setShotUrl(data.signedUrl);
    }
  }

  async function approve(o: Order, manual?: string) {
    setBusyId(o.id);
    try {
      const args: { _order_id: string; _manual_code?: string } = { _order_id: o.id };
      if (manual?.trim()) args._manual_code = manual.trim();
      const { data, error } = await supabase.rpc("approve_coupon_order", args);
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row?.success) throw new Error(row?.message || "Failed");
      toast.success("Delivered");
      setShowCode(row.code_value as string);
      setView(null);
      await load();
    } catch (e: any) { toast.error(e.message); } finally { setBusyId(null); }
  }

  async function doReject() {
    if (!reject) return;
    setBusyId(reject.id);
    try {
      const { error } = await supabase.from("coupon_orders").update({ status: "rejected", rejection_reason: reason || "Rejected" }).eq("id", reject.id);
      if (error) throw error;
      toast.success("Rejected"); setReject(null); setReason(""); await load();
    } catch (e: any) { toast.error(e.message); } finally { setBusyId(null); }
  }

  const filteredOrders = orderTab === "all" ? orders : orders.filter((o) => o.status === orderTab);
  const stock = coupons.filter((c) => c.type === stockType);
  const stockCount = (t: CType) => coupons.filter((c) => c.type === t && !c.is_used).length;

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <div className="flex items-center gap-2">
        <Ticket className="w-5 h-5 text-primary" />
        <h1 className="font-display font-bold text-2xl">Coupons</h1>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="stock">Stock</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-3 mt-4">
          <Tabs value={orderTab} onValueChange={(v) => setOrderTab(v as typeof orderTab)}>
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="delivered">Delivered</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
          </Tabs>
          {filteredOrders.length === 0 && <Card className="bg-gradient-card border-border p-8 text-center text-muted-foreground">No orders.</Card>}
          {filteredOrders.map((o) => (
            <Card key={o.id} className="bg-gradient-card border-border p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold capitalize">{o.type} coupon <span className="text-xs text-muted-foreground">৳{Number(o.price_bdt)}</span></div>
                  <div className="text-xs text-muted-foreground truncate">{o.user_email ?? "—"}</div>
                </div>
                <Badge variant="outline" className="capitalize">{o.status}</Badge>
              </div>
              <div className="grid grid-cols-1 gap-2 text-xs">
                <div><span className="text-muted-foreground">TrxID:</span> <span className="font-mono">{o.trx_id}</span></div>
                {o.delivered_code && <div><span className="text-muted-foreground">Code:</span> <span className="font-mono break-all">{o.delivered_code}</span></div>}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => openOrder(o)}><Eye className="w-3.5 h-3.5 mr-1"/>View</Button>
                {o.status === "pending" && (
                  <>
                    <Button size="sm" disabled={busyId === o.id} onClick={() => approve(o)} className="bg-success text-success-foreground hover:bg-success/90">
                      {busyId === o.id ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <><CheckCircle2 className="w-3.5 h-3.5 mr-1"/>Auto-deliver</>}
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => setReject(o)}><XCircle className="w-3.5 h-3.5 mr-1"/>Reject</Button>
                  </>
                )}
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="stock" className="space-y-3 mt-4">
          <Card className="bg-gradient-card border-border p-4 space-y-3">
            <div>
              <Label>Type</Label>
              <div className="flex gap-2 mt-1">
                {(["like", "visit", "panel"] as const).map((t) => (
                  <button key={t} type="button" onClick={() => setStockType(t)}
                    className={`flex-1 py-2 rounded-md border text-sm font-medium capitalize ${stockType === t ? "border-primary bg-primary/15 text-primary" : "border-border bg-card"}`}>
                    {t} ({stockCount(t)})
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Bulk add codes (one per line)</Label>
              <Textarea value={bulk} onChange={(e) => setBulk(e.target.value)} rows={5} placeholder={"CODE-AAAA\nCODE-BBBB"} className="font-mono"/>
            </div>
            <Button onClick={addBulk} className="bg-gradient-primary text-primary-foreground"><Plus className="w-4 h-4 mr-1"/>Add codes</Button>
          </Card>
          <div className="space-y-2">
            {stock.map((k) => (
              <Card key={k.id} className="bg-gradient-card border-border p-3 flex items-center gap-2">
                <div className="font-mono text-xs flex-1 truncate">{k.code}</div>
                <Badge variant={k.is_used ? "outline" : "default"}>{k.is_used ? "used" : "available"}</Badge>
                {!k.is_used && <Button size="sm" variant="destructive" onClick={() => delCoupon(k.id)}><Trash2 className="w-3.5 h-3.5"/></Button>}
              </Card>
            ))}
            {stock.length === 0 && <Card className="bg-gradient-card border-border p-4 text-center text-muted-foreground text-sm">No coupons for this type</Card>}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent className="bg-card border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Order details</DialogTitle></DialogHeader>
          {view && (
            <div className="space-y-3 text-sm">
              <div><span className="text-muted-foreground">Type:</span> <span className="capitalize font-semibold">{view.type}</span></div>
              <div><span className="text-muted-foreground">User:</span> {view.user_email ?? "—"}</div>
              <div><span className="text-muted-foreground">TrxID:</span> <span className="font-mono">{view.trx_id}</span></div>
              <div><span className="text-muted-foreground">Price:</span> ৳{Number(view.price_bdt)}</div>
              {shotUrl && <img src={shotUrl} alt="receipt" className="w-full rounded-lg border border-border" />}
              {view.status === "pending" && (
                <>
                  <div>
                    <Label>Manual code (optional)</Label>
                    <Input value={manualCode} onChange={(e) => setManualCode(e.target.value)} placeholder="Leave empty to auto-pull from stock" />
                  </div>
                  <Button onClick={() => approve(view, manualCode)} disabled={busyId === view.id} className="bg-success text-success-foreground w-full">
                    {busyId === view.id ? <Loader2 className="w-4 h-4 animate-spin"/> : "Approve & deliver"}
                  </Button>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!reject} onOpenChange={(o) => !o && setReject(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>Reject order</DialogTitle></DialogHeader>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason" rows={3} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setReject(null)}>Cancel</Button>
            <Button variant="destructive" onClick={doReject} disabled={!!busyId}>{busyId ? <Loader2 className="w-4 h-4 animate-spin"/> : "Reject"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!showCode} onOpenChange={(o) => !o && setShowCode(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>Coupon delivered</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <div className="font-mono text-sm break-all bg-secondary/30 p-3 rounded">{showCode}</div>
            <Button onClick={() => { if (showCode) { navigator.clipboard.writeText(showCode); setCopied(true); setTimeout(() => setCopied(false), 1500); } }} className="w-full bg-gradient-primary text-primary-foreground">
              {copied ? <><Check className="w-4 h-4 mr-1"/>Copied</> : <><Copy className="w-4 h-4 mr-1"/>Copy code</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}