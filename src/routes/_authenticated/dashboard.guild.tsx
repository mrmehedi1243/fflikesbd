import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Users, Loader2, Upload, Copy, Check, Crown, Star, Rocket, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { getGuildInfo } from "@/server/guild.functions";
import gsLogo from "@/assets/gs-logo.jpg";

export const Route = createFileRoute("/_authenticated/dashboard/guild")({
  component: GuildPage,
});

type GPkg = { id: string; name: string; price_bdt: number; duration_label: string | null; bot_count: number; image_url: string | null; description: string | null };
type GOrder = {
  id: string; guild_id: string; status: string; trx_id: string;
  guild_package_id: string; created_at: string; expires_at: string | null;
  last_synced_guild: any | null;
  guild_packages: { name: string; price_bdt: number; bot_count: number } | null;
};

function GuildPage() {
  const { user } = useAuth();
  const [pkgs, setPkgs] = useState<GPkg[]>([]);
  const [orders, setOrders] = useState<GOrder[]>([]);
  const [bkash, setBkash] = useState("");
  const [selectedPkg, setSelectedPkg] = useState<string>("");
  const [guildId, setGuildId] = useState("");
  const [trxId, setTrxId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState<any>(null);

  async function load() {
    if (!user) return;
    const [{ data: p }, { data: o }, { data: s }] = await Promise.all([
      supabase.from("guild_packages").select("id,name,price_bdt,duration_label,bot_count,image_url,description").eq("is_active", true).order("sort_order"),
      supabase.from("guild_orders").select("id,guild_id,status,trx_id,guild_package_id,created_at,expires_at,last_synced_guild,guild_packages(name,price_bdt,bot_count)").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("app_settings").select("bkash_number,bkash_number_guild").eq("id", 1).maybeSingle(),
    ]);
    setPkgs((p ?? []) as GPkg[]);
    setOrders((o ?? []) as unknown as GOrder[]);
    setBkash((s as any)?.bkash_number_guild || (s as any)?.bkash_number || "");
    if (!selectedPkg && p && p.length) setSelectedPkg(p[0].id);
  }
  useEffect(() => { load(); }, [user]);

  // Auto-refresh guild info for approved/running orders
  useEffect(() => {
    const live = orders.filter((o) => o.status === "approved" || o.status === "running");
    if (live.length === 0) return;
    let cancelled = false;
    async function tick() {
      for (const o of live) {
        try {
          const { info } = await getGuildInfo({ data: { guildId: o.guild_id } });
          if (cancelled || !info) continue;
          await supabase.from("guild_orders").update({ last_synced_guild: info as any, last_synced_at: new Date().toISOString() }).eq("id", o.id);
        } catch {}
      }
      if (!cancelled) load();
    }
    tick();
    const t = setInterval(tick, 60000);
    return () => { cancelled = true; clearInterval(t); };
  }, [orders.map((o) => o.id + o.status).join(",")]);

  const pkg = pkgs.find((p) => p.id === selectedPkg);

  async function preCheck() {
    if (!guildId.trim()) return toast.error("Guild ID din");
    setPreviewing(true);
    try {
      const { info } = await getGuildInfo({ data: { guildId: guildId.trim() } });
      if (!info) return toast.error("Guild khuje pawa jay nai");
      setPreview(info);
    } catch (e: any) { toast.error(e.message); }
    finally { setPreviewing(false); }
  }

  async function submit() {
    if (!user || !pkg) return;
    if (!guildId.trim()) return toast.error("Guild ID din");
    if (!trxId.trim()) return toast.error("TrxID din");
    if (!file) return toast.error("Screenshot upload korun");
    setBusy(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/guild/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("payment-screenshots").upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;
      const { error } = await supabase.from("guild_orders").insert({
        user_id: user.id,
        guild_package_id: pkg.id,
        guild_id: guildId.trim(),
        trx_id: trxId.trim(),
        payment_screenshot_url: path,
      });
      if (error) throw error;
      toast.success("Order submitted! Admin approval er opekkhay.");
      setTrxId(""); setFile(null); setGuildId(""); setPreview(null);
      load();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  }

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <div className="flex items-center gap-2">
        <Users className="w-5 h-5 text-primary" />
        <h1 className="font-display font-bold text-2xl">Guild Bots</h1>
      </div>

      {/* Active instances */}
      {orders.filter((o) => o.status === "approved" || o.status === "running").map((o) => (
        <BotInstanceCard key={o.id} order={o} />
      ))}

      {/* Order form */}
      <Card className="bg-gradient-card border-border p-4 space-y-3">
        <div className="font-display font-bold text-sm">Notun Bot Order</div>
        <div>
          <Label>Package</Label>
          <select className="w-full h-10 px-3 mt-1 rounded-md bg-background border border-input text-sm" value={selectedPkg} onChange={(e) => setSelectedPkg(e.target.value)}>
            {pkgs.map((p) => <option key={p.id} value={p.id}>{p.name} — ৳{Number(p.price_bdt)} ({p.bot_count} bot{p.bot_count > 1 ? "s" : ""}{p.duration_label ? `, ${p.duration_label}` : ""})</option>)}
          </select>
          {pkgs.length === 0 && <div className="text-xs text-muted-foreground mt-1">Akhono kono guild bot package nei.</div>}
        </div>

        <div>
          <Label>Guild ID</Label>
          <div className="flex gap-2 mt-1">
            <Input value={guildId} onChange={(e) => setGuildId(e.target.value)} placeholder="e.g. 3097225950" />
            <Button type="button" variant="outline" onClick={preCheck} disabled={previewing}>
              {previewing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Check"}
            </Button>
          </div>
        </div>

        {preview && (
          <Card className="bg-background/60 border-primary/30 p-3 text-xs space-y-1">
            <div className="font-bold text-primary">{preview.GuildName} <span className="text-muted-foreground font-normal">Lv{preview.GuildLevel}</span></div>
            <div>Members: {preview.CurrentMembers}/{preview.MaxMembers} • Glory: {preview.TotalActivityPoints}</div>
            {preview.GuildLeader && <div>Leader: {preview.GuildLeader.Name}</div>}
          </Card>
        )}

        {pkg && bkash && (
          <div className="rounded-md bg-primary/10 border border-primary/30 p-3 text-sm">
            <div className="text-xs text-muted-foreground">bKash Send Money korun:</div>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-mono font-bold text-base">{bkash}</span>
              <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(bkash); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              </Button>
            </div>
            <div className="text-xs mt-1">Amount: <span className="font-bold">৳{Number(pkg.price_bdt)}</span></div>
          </div>
        )}

        <div>
          <Label>bKash TrxID</Label>
          <Input value={trxId} onChange={(e) => setTrxId(e.target.value)} placeholder="e.g. 9F8K2XYZ" className="mt-1" />
        </div>

        <div>
          <Label>Payment Screenshot</Label>
          <label className="mt-1 flex items-center justify-center gap-2 p-3 rounded-md border border-dashed border-border bg-secondary/30 cursor-pointer text-sm">
            <Upload className="w-4 h-4" />
            <span className="truncate">{file ? file.name : "Screenshot select korun"}</span>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
        </div>

        <Button onClick={submit} disabled={busy || !pkg} className="w-full bg-gradient-primary text-primary-foreground font-semibold">
          {busy ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Rocket className="w-4 h-4 mr-1" />} Submit Order
        </Button>
      </Card>

      {/* History */}
      <div className="space-y-2">
        <div className="font-display font-bold text-sm">Order History</div>
        {orders.length === 0 && <Card className="bg-gradient-card border-border p-6 text-center text-sm text-muted-foreground">No orders yet</Card>}
        {orders.map((o) => (
          <Card key={o.id} className="bg-gradient-card border-border p-3 flex items-center justify-between">
            <div className="min-w-0">
              <div className="font-semibold truncate">{o.guild_packages?.name ?? "Guild Bot"}</div>
              <div className="text-xs text-muted-foreground">Guild ID: {o.guild_id}</div>
            </div>
            <Badge variant="outline" className="capitalize">{o.status}</Badge>
          </Card>
        ))}
      </div>
    </div>
  );
}

function BotInstanceCard({ order }: { order: GOrder }) {
  const g = order.last_synced_guild;
  const [refreshing, setRefreshing] = useState(false);
  async function refresh() {
    setRefreshing(true);
    try {
      const { info } = await getGuildInfo({ data: { guildId: order.guild_id } });
      if (info) {
        await supabase.from("guild_orders").update({ last_synced_guild: info as any, last_synced_at: new Date().toISOString() }).eq("id", order.id);
        toast.success("Refreshed");
      } else toast.error("Guild not found");
    } finally { setRefreshing(false); }
  }
  const startMs = new Date(order.created_at).getTime();
  const uptimeMs = Date.now() - startMs;
  const h = Math.floor(uptimeMs / 3600000); const m = Math.floor((uptimeMs % 3600000) / 60000);
  const goalPct = g?.WeeklyActivityPoints ? Math.min(100, Math.round((g.WeeklyActivityPoints / 1000000) * 100)) : 0;

  return (
    <Card className="bg-gradient-card border-primary/40 p-4 space-y-3 shadow-glow">
      <div className="flex items-center gap-3">
        <div className="w-16 h-16 rounded-xl overflow-hidden ring-2 ring-primary/40 bg-secondary grid place-items-center shrink-0">
          <img src={gsLogo} alt="" className="w-full h-full object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <div className="font-display font-bold text-base truncate">{g?.GuildName ?? "Loading…"}</div>
          </div>
          <div className="text-[11px] text-muted-foreground">ID: {order.guild_id} • 🇧🇩 BD • {order.guild_packages?.bot_count ?? 1} BOTS</div>
          {g?.GuildSlogan && <div className="text-[11px] italic text-muted-foreground truncate">"{g.GuildSlogan}"</div>}
        </div>
        <Badge className="bg-success/20 text-success border-success/40">● RUNNING</Badge>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-md bg-background/50 p-2">
          <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-1"><Users className="w-3 h-3" />MEMBERS</div>
          <div className="font-bold text-sm">{g?.CurrentMembers ?? "—"}<span className="text-muted-foreground">/{g?.MaxMembers ?? "—"}</span></div>
        </div>
        <div className="rounded-md bg-background/50 p-2">
          <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-1"><Crown className="w-3 h-3" />LEADER</div>
          <div className="font-bold text-sm truncate" title={g?.GuildLeader?.Name}>{g?.GuildLeader?.Name ?? "—"}</div>
        </div>
        <div className="rounded-md bg-background/50 p-2">
          <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-1"><Star className="w-3 h-3" />GLORY</div>
          <div className="font-bold text-sm text-primary">{(g?.TotalActivityPoints ?? 0).toLocaleString()}</div>
        </div>
      </div>

      <div>
        <div className="flex justify-between text-[10px] mb-1">
          <span className="text-muted-foreground">WEEKLY</span>
          <span className="text-primary font-bold">{goalPct}%</span>
        </div>
        <div className="h-1.5 bg-background/60 rounded-full overflow-hidden"><div className="h-full bg-gradient-primary" style={{ width: `${goalPct}%` }} /></div>
      </div>

      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>Uptime: <span className="text-foreground font-bold">{h}h {m}m</span></span>
        <span>Powered by GS STORE</span>
      </div>

      <Button onClick={refresh} disabled={refreshing} variant="outline" size="sm" className="w-full">
        {refreshing ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <RefreshCcw className="w-3.5 h-3.5 mr-1" />} Refresh Instance
      </Button>
    </Card>
  );
}