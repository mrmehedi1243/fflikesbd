import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { KeyRound, Loader2, Upload, Copy, Check, Smartphone, Receipt, Image as ImageIcon, AlertCircle, Volume2, VolumeX, Play } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/panels")({
  component: PanelsPage,
});

type Panel = {
  id: string;
  name: string;
  description: string | null;
  price_bdt: number;
  video_url: string | null;
  image_url: string | null;
  apk_link: string | null;
  duration_label: string | null;
};
type Settings = {
  bkash_number: string;
  bkash_number_visit: string;
  payment_instructions: string;
};

function PanelCard({ p, onBuy }: { p: Panel; onBuy: () => void }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  return (
    <Card className="bg-gradient-card border-border overflow-hidden shadow-card flex flex-col">
      <div className="relative aspect-video bg-secondary/30 overflow-hidden">
        {p.video_url ? (
          <>
            <video
              ref={ref}
              src={p.video_url}
              poster={p.image_url ?? undefined}
              muted={muted}
              loop
              playsInline
              autoPlay
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setMuted((m) => !m); }}
              className="absolute bottom-2 right-2 w-9 h-9 rounded-full bg-black/60 backdrop-blur grid place-items-center text-white hover:bg-black/80 transition"
              aria-label={muted ? "Unmute" : "Mute"}
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </>
        ) : p.image_url ? (
          <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full grid place-items-center"><Play className="w-8 h-8 text-muted-foreground" /></div>
        )}
      </div>
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="font-display font-bold text-lg flex items-center gap-1.5"><KeyRound className="w-4 h-4 text-primary" />{p.name}</div>
            {p.description && <div className="text-xs text-muted-foreground mt-1">{p.description}</div>}
          </div>
          <Badge className="bg-primary/15 text-primary border-0">৳{Number(p.price_bdt)}</Badge>
        </div>
        {p.duration_label && <div className="text-xs text-muted-foreground mb-3">⏱ {p.duration_label}</div>}
        <Button onClick={onBuy} className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90 font-semibold mt-auto">Buy Panel</Button>
      </div>
    </Card>
  );
}

function PanelsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [panels, setPanels] = useState<Panel[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [selected, setSelected] = useState<Panel | null>(null);
  const [trxId, setTrxId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: p }, { data: s }] = await Promise.all([
        supabase.from("panel_packages").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("app_settings").select("bkash_number,bkash_number_visit,payment_instructions").eq("id", 1).single(),
      ]);
      setPanels((p ?? []) as Panel[]);
      setSettings(s as Settings | null);
    })();
  }, []);

  const bkash = settings?.bkash_number || settings?.bkash_number_visit || "";

  async function submit() {
    if (!user || !selected) return;
    if (!trxId.trim()) return toast.error("TrxID din");
    if (!file) return toast.error("Payment screenshot upload korun");
    setBusy(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/panel-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("payment-screenshots").upload(path, file, { upsert: false, contentType: file.type });
      if (upErr) throw upErr;
      const { error: insErr } = await supabase.from("panel_orders").insert({
        user_id: user.id,
        panel_package_id: selected.id,
        trx_id: trxId.trim(),
        payment_screenshot_url: path,
      });
      if (insErr) throw insErr;
      toast.success("Order submit hoyeche! Admin approve korle key paben.");
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
        <h1 className="font-display font-bold text-2xl flex items-center gap-2"><KeyRound className="w-6 h-6 text-primary"/>Panels</h1>
        <p className="text-sm text-muted-foreground">Buy panel key, instant delivery after admin approval</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {panels.map((p) => <PanelCard key={p.id} p={p} onBuy={() => { setSelected(p); setTrxId(""); setFile(null); }} />)}
        {panels.length === 0 && <Card className="col-span-full bg-gradient-card border-border p-6 text-center text-sm text-muted-foreground">No panels available yet.</Card>}
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="bg-card border-border max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2"><KeyRound className="w-4 h-4 text-primary" />{selected?.name}</DialogTitle>
            <DialogDescription>৳{Number(selected?.price_bdt)} {selected?.duration_label ? `• ${selected.duration_label}` : ""}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {settings && bkash && (
              <div className="rounded-2xl p-4 space-y-3 border border-pink-300/50 dark:border-pink-400/30 shadow-lg"
                   style={{ background: "linear-gradient(135deg, #ec4899 0%, #d946ef 50%, #a21caf 100%)" }}>
                <div className="flex items-center gap-2 text-white">
                  <div className="w-8 h-8 rounded-lg bg-white/20 grid place-items-center backdrop-blur"><Smartphone className="w-4 h-4 text-white" /></div>
                  <div className="text-sm font-bold">bKash Payment</div>
                  <Badge className="ml-auto bg-white text-pink-700 border-0 font-bold hover:bg-white">৳{Number(selected?.price_bdt)}</Badge>
                </div>
                <div className="rounded-xl bg-white/15 backdrop-blur border border-white/30 p-3">
                  <div className="text-[10px] uppercase tracking-widest text-white/80 mb-1">Send Money to</div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-mono font-bold text-2xl text-white tracking-wider drop-shadow">{bkash}</div>
                    <Button size="sm" className="bg-white text-pink-700 hover:bg-white/90 font-bold"
                      onClick={() => { navigator.clipboard.writeText(bkash); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
                      {copied ? <><Check className="w-3.5 h-3.5 mr-1"/>Copied</> : <><Copy className="w-3.5 h-3.5 mr-1"/>Copy</>}
                    </Button>
                  </div>
                </div>
                {settings.payment_instructions && (
                  <details className="text-xs text-white/95">
                    <summary className="cursor-pointer flex items-center gap-1 opacity-90"><AlertCircle className="w-3 h-3" /> More details</summary>
                    <pre className="whitespace-pre-wrap mt-2 font-sans bg-white/10 p-2 rounded border border-white/20">{settings.payment_instructions.replace("{bkash}", bkash)}</pre>
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
