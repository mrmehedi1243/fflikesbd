import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Ticket, Loader2, Upload, Check, Copy, Smartphone, Receipt, Image as ImageIcon, Heart, Eye, KeyRound } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/coupons")({
  component: CouponsPage,
});

type CType = "like" | "visit" | "panel";
type Settings = {
  bkash_number: string;
  bkash_number_visit: string;
  payment_instructions: string;
  coupon_price_like: number;
  coupon_price_visit: number;
  coupon_price_panel: number;
};
type MyOrder = { id: string; type: CType; status: string; trx_id: string; delivered_code: string | null; price_bdt: number; created_at: string };

function CouponsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<CType>("like");
  const [settings, setSettings] = useState<Settings | null>(null);
  const [orders, setOrders] = useState<MyOrder[]>([]);
  const [trxId, setTrxId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function load() {
    if (!user) return;
    const [{ data: s }, { data: o }] = await Promise.all([
      supabase.from("app_settings").select("bkash_number,bkash_number_visit,payment_instructions,coupon_price_like,coupon_price_visit,coupon_price_panel").eq("id", 1).single(),
      supabase.from("coupon_orders").select("id,type,status,trx_id,delivered_code,price_bdt,created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
    ]);
    setSettings(s as Settings | null);
    setOrders((o ?? []) as MyOrder[]);
  }
  useEffect(() => { load(); }, [user]);

  const price = settings ? (tab === "like" ? settings.coupon_price_like : tab === "visit" ? settings.coupon_price_visit : settings.coupon_price_panel) : 0;
  const bkashNumber = settings ? (tab === "visit" ? (settings.bkash_number_visit || settings.bkash_number) : settings.bkash_number) : "";

  async function submit() {
    if (!user || !settings) return;
    if (!trxId.trim()) return toast.error("TrxID din");
    if (!file) return toast.error("Screenshot upload korun");
    setBusy(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/coupons/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("payment-screenshots").upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;
      const { error } = await supabase.from("coupon_orders").insert({
        user_id: user.id,
        type: tab,
        trx_id: trxId.trim(),
        payment_screenshot_url: path,
        price_bdt: price,
      });
      if (error) throw error;
      toast.success("Order submitted!");
      setTrxId(""); setFile(null);
      load();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  }

  const tIcon = tab === "like" ? Heart : tab === "visit" ? Eye : KeyRound;
  const Icon = tIcon;

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <div className="flex items-center gap-2">
        <Ticket className="w-5 h-5 text-primary" />
        <h1 className="font-display font-bold text-2xl">Coupons</h1>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as CType)}>
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="like" className="gap-1"><Heart className="w-4 h-4"/>Like</TabsTrigger>
          <TabsTrigger value="visit" className="gap-1"><Eye className="w-4 h-4"/>Visit</TabsTrigger>
          <TabsTrigger value="panel" className="gap-1"><KeyRound className="w-4 h-4"/>Panel</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card className="bg-gradient-card border-border p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/15 grid place-items-center"><Icon className="w-5 h-5 text-primary"/></div>
          <div>
            <div className="font-display font-bold capitalize">{tab} Coupon</div>
            <div className="text-xs text-muted-foreground">Admin verify korar pore code pabe</div>
          </div>
          <Badge className="ml-auto bg-primary/15 text-primary border-0">৳{Number(price)}</Badge>
        </div>

        {bkashNumber && (
          <div className="rounded-2xl p-4 space-y-3 border border-pink-300/50 dark:border-pink-400/30 shadow-lg"
               style={{ background: "linear-gradient(135deg, #ec4899 0%, #d946ef 50%, #a21caf 100%)" }}>
            <div className="flex items-center gap-2 text-white">
              <div className="w-8 h-8 rounded-lg bg-white/20 grid place-items-center"><Smartphone className="w-4 h-4 text-white"/></div>
              <div className="text-sm font-bold">bKash Payment</div>
              <Badge className="ml-auto bg-white text-pink-700 border-0 font-bold hover:bg-white">৳{Number(price)}</Badge>
            </div>
            <div className="rounded-xl bg-white/15 backdrop-blur border border-white/30 p-3">
              <div className="text-[10px] uppercase tracking-widest text-white/80 mb-1">Send Money to</div>
              <div className="flex items-center justify-between gap-2">
                <div className="font-mono font-bold text-2xl text-white tracking-wider drop-shadow">{bkashNumber}</div>
                <Button size="sm" className="bg-white text-pink-700 hover:bg-white/90 font-bold"
                  onClick={() => { navigator.clipboard.writeText(bkashNumber); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
                  {copied ? <><Check className="w-3.5 h-3.5 mr-1"/>Copied</> : <><Copy className="w-3.5 h-3.5 mr-1"/>Copy</>}
                </Button>
              </div>
            </div>
          </div>
        )}

        <div>
          <Label className="flex items-center gap-1.5"><Receipt className="w-3.5 h-3.5"/>bKash TrxID</Label>
          <Input value={trxId} onChange={(e) => setTrxId(e.target.value)} placeholder="e.g. 8N7A2B5C9X" className="font-mono"/>
        </div>
        <div>
          <Label className="flex items-center gap-1.5"><ImageIcon className="w-3.5 h-3.5"/>Payment screenshot</Label>
          <label className={`flex flex-col items-center justify-center gap-1 border-2 border-dashed rounded-lg py-5 cursor-pointer ${file ? "border-success/50 bg-success/5" : "border-border hover:border-primary/50"}`}>
            {file ? <Check className="w-5 h-5 text-success"/> : <Upload className="w-5 h-5 text-muted-foreground"/>}
            <span className="text-sm font-medium">{file ? file.name : "Tap to upload"}</span>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
        </div>
        <Button onClick={submit} disabled={busy} className="w-full bg-gradient-primary text-primary-foreground font-semibold">
          {busy ? <Loader2 className="w-4 h-4 animate-spin"/> : `Submit Order • ৳${Number(price)}`}
        </Button>
      </Card>

      <div>
        <h2 className="font-display font-bold mb-2">My coupon orders</h2>
        <div className="space-y-2">
          {orders.length === 0 && <Card className="bg-gradient-card border-border p-4 text-center text-muted-foreground text-sm">No orders yet</Card>}
          {orders.map((o) => (
            <Card key={o.id} className="bg-gradient-card border-border p-3 space-y-1">
              <div className="flex items-center justify-between">
                <div className="font-semibold capitalize">{o.type} • ৳{Number(o.price_bdt)}</div>
                <Badge variant="outline" className="capitalize">{o.status}</Badge>
              </div>
              <div className="text-xs text-muted-foreground">TrxID: <span className="font-mono">{o.trx_id}</span></div>
              {o.delivered_code && (
                <div className="rounded-md bg-success/10 border border-success/30 p-2 mt-1">
                  <div className="text-[10px] uppercase text-success mb-0.5">Your code</div>
                  <div className="font-mono text-sm break-all">{o.delivered_code}</div>
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}