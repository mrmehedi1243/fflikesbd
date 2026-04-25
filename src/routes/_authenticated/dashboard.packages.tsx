import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Zap, Calendar, Loader2, Upload, Copy, Check } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/packages")({
  component: PackagesPage,
});

type Pkg = { id: string; name: string; description: string | null; likes_per_day: number; duration_days: number; price_bdt: number; sort_order: number };
type Settings = { banner_api_url: string; like_api_url: string; bkash_number: string; payment_instructions: string };

function PackagesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pkgs, setPkgs] = useState<Pkg[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [selected, setSelected] = useState<Pkg | null>(null);
  const [uid, setUid] = useState("");
  const [bannerLoaded, setBannerLoaded] = useState(false);
  const [trxId, setTrxId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: p }, { data: s }] = await Promise.all([
        supabase.from("packages").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("app_settings").select("*").eq("id", 1).single(),
      ]);
      setPkgs((p ?? []) as Pkg[]);
      setSettings(s as Settings | null);
    })();
  }, []);

  function open(p: Pkg) {
    setSelected(p);
    setUid("");
    setTrxId("");
    setFile(null);
    setBannerLoaded(false);
  }

  const bannerUrl = uid && settings ? settings.banner_api_url.replace("{uid}", encodeURIComponent(uid)) : "";

  async function submit() {
    if (!user || !selected) return;
    if (!/^\d{6,}$/.test(uid)) return toast.error("Valid Free Fire UID din");
    if (!trxId.trim()) return toast.error("TrxID din");
    if (!file) return toast.error("Payment screenshot upload korun");
    setBusy(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("payment-screenshots").upload(path, file, { upsert: false, contentType: file.type });
      if (upErr) throw upErr;
      const { error: insErr } = await supabase.from("orders").insert({
        user_id: user.id,
        package_id: selected.id,
        ff_uid: uid.trim(),
        trx_id: trxId.trim(),
        payment_screenshot_url: path,
        likes_per_day: selected.likes_per_day,
        duration_days: selected.duration_days,
      });
      if (insErr) throw insErr;
      toast.success("Order submit hoyeche! Admin verify korar pore start hobe.");
      setSelected(null);
      navigate({ to: "/dashboard/orders" });
    } catch (e: any) {
      toast.error(e.message || "Order failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <div>
        <h1 className="font-display font-bold text-2xl">Packages</h1>
        <p className="text-sm text-muted-foreground">BD server only • Daily auto likes</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {pkgs.map((p) => (
          <Card key={p.id} className="bg-gradient-card border-border p-5 shadow-card">
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="font-display font-bold text-lg">{p.name}</div>
                {p.description && <div className="text-xs text-muted-foreground">{p.description}</div>}
              </div>
              <Badge className="bg-primary/15 text-primary border-0">৳{Number(p.price_bdt)}</Badge>
            </div>
            <div className="flex gap-3 my-3 text-sm">
              <div className="flex items-center gap-1.5"><Zap className="w-4 h-4 text-primary"/>{p.likes_per_day}/day</div>
              <div className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-accent"/>{p.duration_days} days</div>
            </div>
            <Button onClick={() => open(p)} className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90 font-semibold">Buy now</Button>
          </Card>
        ))}
        {pkgs.length === 0 && (
          <Card className="col-span-full bg-gradient-card border-border p-6 text-center text-sm text-muted-foreground">No packages available.</Card>
        )}
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="bg-card border-border max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">{selected?.name}</DialogTitle>
            <DialogDescription>
              {selected?.likes_per_day} likes/day × {selected?.duration_days} days = ৳{Number(selected?.price_bdt)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Free Fire UID</Label>
              <Input value={uid} onChange={(e) => { setUid(e.target.value); setBannerLoaded(false); }} placeholder="Enter your FF UID" inputMode="numeric" />
            </div>

            {uid && /^\d{6,}$/.test(uid) && (
              <div className="rounded-lg overflow-hidden border border-border bg-muted/30">
                <div className="px-3 py-2 text-xs text-muted-foreground bg-card border-b border-border">Profile preview</div>
                <div className="aspect-video grid place-items-center bg-background">
                  {!bannerLoaded && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}
                  <img src={bannerUrl} alt="FF profile banner" onLoad={() => setBannerLoaded(true)} onError={() => setBannerLoaded(true)} className={`w-full h-full object-contain ${bannerLoaded ? "" : "hidden"}`} />
                </div>
              </div>
            )}

            {settings && (
              <Card className="bg-secondary border-border p-3 space-y-2">
                <div className="text-xs text-muted-foreground">Send ৳{Number(selected?.price_bdt)} via bKash to:</div>
                <div className="flex items-center gap-2">
                  <div className="font-mono font-bold text-lg text-primary tracking-wider">{settings.bkash_number}</div>
                  <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(settings.bkash_number); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
                    {copied ? <Check className="w-4 h-4 text-success"/> : <Copy className="w-4 h-4"/>}
                  </Button>
                </div>
                <details className="text-xs text-muted-foreground">
                  <summary className="cursor-pointer text-foreground">How to pay (instructions)</summary>
                  <pre className="whitespace-pre-wrap mt-2 font-sans">{settings.payment_instructions.replace("{bkash}", settings.bkash_number)}</pre>
                </details>
              </Card>
            )}

            <div>
              <Label>bKash Transaction ID (TrxID)</Label>
              <Input value={trxId} onChange={(e) => setTrxId(e.target.value)} placeholder="e.g. 8N7A2B5C9X" />
            </div>

            <div>
              <Label>Payment screenshot</Label>
              <label className="flex items-center justify-center gap-2 border border-dashed border-border rounded-md py-4 cursor-pointer hover:bg-secondary/50 transition">
                <Upload className="w-4 h-4 text-muted-foreground"/>
                <span className="text-sm text-muted-foreground">{file ? file.name : "Tap to upload"}</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </label>
            </div>

            <Button disabled={busy} onClick={submit} className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90 font-semibold">
              {busy ? <Loader2 className="w-4 h-4 animate-spin"/> : "Submit order"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
