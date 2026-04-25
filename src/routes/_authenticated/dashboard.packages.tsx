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
import { Zap, Calendar, Loader2, Upload, Copy, Check, Smartphone, Receipt, Image as ImageIcon, AlertCircle } from "lucide-react";
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
              <div className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-accent/5 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-primary/20 grid place-items-center">
                    <Smartphone className="w-4 h-4 text-primary" />
                  </div>
                  <div className="text-sm font-semibold">bKash Payment</div>
                  <Badge className="ml-auto bg-primary/20 text-primary border-0 font-bold">৳{Number(selected?.price_bdt)}</Badge>
                </div>

                <div className="rounded-lg bg-background/60 border border-border p-3">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Send Money to</div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-mono font-bold text-xl text-primary tracking-wider">{settings.bkash_number}</div>
                    <Button
                      size="sm"
                      variant={copied ? "secondary" : "default"}
                      className={copied ? "" : "bg-primary text-primary-foreground"}
                      onClick={() => {
                        navigator.clipboard.writeText(settings.bkash_number);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1500);
                      }}
                    >
                      {copied ? <><Check className="w-3.5 h-3.5 mr-1"/>Copied</> : <><Copy className="w-3.5 h-3.5 mr-1"/>Copy</>}
                    </Button>
                  </div>
                </div>

                <ol className="space-y-2 text-xs">
                  <li className="flex gap-2">
                    <span className="w-5 h-5 shrink-0 rounded-full bg-primary/20 text-primary grid place-items-center font-bold text-[10px]">1</span>
                    <span>bKash app khulun → <b>Send Money</b> select korun</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="w-5 h-5 shrink-0 rounded-full bg-primary/20 text-primary grid place-items-center font-bold text-[10px]">2</span>
                    <span>Upore deya number e <b className="text-primary">৳{Number(selected?.price_bdt)}</b> send korun</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="w-5 h-5 shrink-0 rounded-full bg-primary/20 text-primary grid place-items-center font-bold text-[10px]">3</span>
                    <span>Confirmation SMS theke <b>TrxID</b> niche bosan + <b>screenshot</b> upload korun</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="w-5 h-5 shrink-0 rounded-full bg-success/20 text-success grid place-items-center font-bold text-[10px]">✓</span>
                    <span>Submit korar pore admin verify korbe (usually 5-30 min)</span>
                  </li>
                </ol>

                {settings.payment_instructions && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> More details
                    </summary>
                    <pre className="whitespace-pre-wrap mt-2 font-sans text-muted-foreground bg-background/40 p-2 rounded border border-border">{settings.payment_instructions.replace("{bkash}", settings.bkash_number)}</pre>
                  </details>
                )}
              </div>
            )}

            <div>
              <Label className="flex items-center gap-1.5"><Receipt className="w-3.5 h-3.5"/> bKash Transaction ID</Label>
              <Input value={trxId} onChange={(e) => setTrxId(e.target.value)} placeholder="e.g. 8N7A2B5C9X" className="font-mono" />
            </div>

            <div>
              <Label className="flex items-center gap-1.5"><ImageIcon className="w-3.5 h-3.5"/> Payment screenshot</Label>
              <label className={`flex flex-col items-center justify-center gap-1 border-2 border-dashed rounded-lg py-5 cursor-pointer transition ${file ? "border-success/50 bg-success/5" : "border-border hover:border-primary/50 hover:bg-secondary/50"}`}>
                {file ? <Check className="w-5 h-5 text-success"/> : <Upload className="w-5 h-5 text-muted-foreground"/>}
                <span className="text-sm font-medium">{file ? file.name : "Tap to upload screenshot"}</span>
                <span className="text-[10px] text-muted-foreground">JPG / PNG • Max 5MB</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </label>
            </div>

            <Button disabled={busy} onClick={submit} className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90 font-semibold">
              {busy ? <Loader2 className="w-4 h-4 animate-spin"/> : `Submit Order • ৳${Number(selected?.price_bdt)}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
