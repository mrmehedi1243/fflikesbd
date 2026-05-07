import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, Loader2, Users, CheckCircle2, XCircle, Eye, Upload } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/guild")({
  component: AdminGuild,
});

type Pkg = { id: string; name: string; description: string | null; price_bdt: number; image_url: string | null; duration_label: string | null; bot_count: number; is_active: boolean; sort_order: number };
type Order = { id: string; user_id: string; guild_id: string; trx_id: string; payment_screenshot_url: string | null; status: string; expires_at: string | null; created_at: string; guild_packages: { name: string; price_bdt: number } | null; user_email?: string | null };

const empty: Omit<Pkg, "id"> = { name: "", description: "", price_bdt: 100, image_url: null, duration_label: "30 days", bot_count: 1, is_active: true, sort_order: 0 };

function AdminGuild() {
  const [tab, setTab] = useState<"orders" | "packages">("orders");
  const [pkgs, setPkgs] = useState<Pkg[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [edit, setEdit] = useState<Pkg | null>(null);
  const [form, setForm] = useState<Omit<Pkg, "id">>(empty);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<Order | null>(null);
  const [shotUrl, setShotUrl] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function load() {
    const [{ data: p }, { data: o }] = await Promise.all([
      supabase.from("guild_packages").select("*").order("sort_order"),
      supabase.from("guild_orders").select("*, guild_packages(name,price_bdt)").order("created_at", { ascending: false }),
    ]);
    setPkgs((p ?? []) as Pkg[]);
    const list = (o ?? []) as unknown as Order[];
    if (list.length) {
      const ids = Array.from(new Set(list.map((x) => x.user_id)));
      const { data: profs } = await supabase.from("profiles").select("user_id,email").in("user_id", ids);
      const map = new Map((profs ?? []).map((p: any) => [p.user_id, p.email]));
      list.forEach((x) => { x.user_email = map.get(x.user_id) ?? null; });
    }
    setOrders(list);
  }
  useEffect(() => { load(); }, []);

  async function uploadImage(f: File) {
    setUploading(true);
    try {
      const ext = f.name.split(".").pop() || "jpg";
      const path = `guild/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("package-images").upload(path, f, { contentType: f.type });
      if (error) throw error;
      const { data } = supabase.storage.from("package-images").getPublicUrl(path);
      setForm((s) => ({ ...s, image_url: data.publicUrl }));
    } catch (e: any) { toast.error(e.message); } finally { setUploading(false); }
  }

  async function save() {
    if (!form.name.trim()) return toast.error("Name din");
    setBusy(true);
    try {
      const payload = { ...form, price_bdt: Number(form.price_bdt), bot_count: Number(form.bot_count) };
      if (edit?.id) await supabase.from("guild_packages").update(payload).eq("id", edit.id).throwOnError();
      else await supabase.from("guild_packages").insert(payload).throwOnError();
      toast.success("Saved"); setEdit(null); load();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  }
  async function del(id: string) { if (!confirm("Delete?")) return; await supabase.from("guild_packages").delete().eq("id", id); load(); }
  async function toggle(p: Pkg, v: boolean) { await supabase.from("guild_packages").update({ is_active: v }).eq("id", p.id); load(); }

  async function openOrder(o: Order) {
    setView(o); setShotUrl(null);
    if (o.payment_screenshot_url) {
      const { data } = await supabase.storage.from("payment-screenshots").createSignedUrl(o.payment_screenshot_url, 600);
      if (data) setShotUrl(data.signedUrl);
    }
  }
  async function approve(o: Order) {
    setBusyId(o.id);
    try {
      const expires = new Date(); expires.setDate(expires.getDate() + 30);
      await supabase.from("guild_orders").update({ status: "approved", approved_at: new Date().toISOString(), expires_at: expires.toISOString() }).eq("id", o.id).throwOnError();
      toast.success("Approved"); setView(null); load();
    } catch (e: any) { toast.error(e.message); } finally { setBusyId(null); }
  }
  async function reject(o: Order) {
    const reason = prompt("Reject reason?") || "Rejected by admin";
    setBusyId(o.id);
    try {
      await supabase.from("guild_orders").update({ status: "rejected", rejection_reason: reason }).eq("id", o.id).throwOnError();
      toast.success("Rejected"); setView(null); load();
    } catch (e: any) { toast.error(e.message); } finally { setBusyId(null); }
  }

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <div className="flex items-center gap-2"><Users className="w-5 h-5 text-primary" /><h1 className="font-display font-bold text-2xl">Guild Bots</h1></div>
      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="packages">Packages</TabsTrigger>
        </TabsList>
        <TabsContent value="orders" className="space-y-3 mt-4">
          {orders.length === 0 && <Card className="bg-gradient-card border-border p-8 text-center text-muted-foreground">No orders.</Card>}
          {orders.map((o) => (
            <Card key={o.id} className="bg-gradient-card border-border p-4 space-y-3">
              <div className="flex justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold truncate">{o.guild_packages?.name ?? "—"} <span className="text-xs text-muted-foreground">৳{o.guild_packages ? Number(o.guild_packages.price_bdt) : "?"}</span></div>
                  <div className="text-xs text-muted-foreground truncate">{o.user_email}</div>
                  <div className="text-xs">Guild ID: <span className="font-mono">{o.guild_id}</span> • TrxID: <span className="font-mono">{o.trx_id}</span></div>
                </div>
                <Badge variant="outline" className="capitalize h-fit">{o.status}</Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => openOrder(o)}><Eye className="w-3.5 h-3.5 mr-1" />View</Button>
                {o.status === "pending" && (<>
                  <Button size="sm" disabled={busyId === o.id} onClick={() => approve(o)} className="bg-success text-success-foreground"><CheckCircle2 className="w-3.5 h-3.5 mr-1" />Approve</Button>
                  <Button size="sm" variant="destructive" onClick={() => reject(o)}><XCircle className="w-3.5 h-3.5 mr-1" />Reject</Button>
                </>)}
              </div>
            </Card>
          ))}
        </TabsContent>
        <TabsContent value="packages" className="space-y-3 mt-4">
          <div className="flex justify-end"><Button onClick={() => { setEdit({ id: "" } as Pkg); setForm(empty); }} className="bg-gradient-primary text-primary-foreground"><Plus className="w-4 h-4 mr-1" />New Package</Button></div>
          {pkgs.map((p) => (
            <Card key={p.id} className="bg-gradient-card border-border p-3 flex items-center gap-3">
              <div className="w-14 h-14 rounded-md bg-secondary/40 grid place-items-center overflow-hidden">{p.image_url ? <img src={p.image_url} className="w-full h-full object-cover" /> : <Users className="w-5 h-5 text-muted-foreground" />}</div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{p.name}</div>
                <div className="text-xs text-muted-foreground">৳{Number(p.price_bdt)} • {p.bot_count} bots • {p.duration_label || "—"}</div>
              </div>
              <Switch checked={p.is_active} onCheckedChange={(v) => toggle(p, v)} />
              <Button size="sm" variant="outline" onClick={() => { setEdit(p); setForm({ ...p }); }}><Pencil className="w-3.5 h-3.5" /></Button>
              <Button size="sm" variant="destructive" onClick={() => del(p.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="bg-card border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{edit?.id ? "Edit" : "New"} guild package</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Description</Label><Textarea value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="grid grid-cols-3 gap-2">
              <div><Label>Price ৳</Label><Input type="number" value={form.price_bdt} onChange={(e) => setForm({ ...form, price_bdt: Number(e.target.value) })} /></div>
              <div><Label>Bots</Label><Input type="number" value={form.bot_count} onChange={(e) => setForm({ ...form, bot_count: Number(e.target.value) })} /></div>
              <div><Label>Duration</Label><Input value={form.duration_label ?? ""} onChange={(e) => setForm({ ...form, duration_label: e.target.value })} /></div>
            </div>
            <div>
              <Label>Image</Label>
              <div className="mt-1 rounded-md border border-border overflow-hidden">
                {form.image_url ? <img src={form.image_url} className="w-full aspect-video object-cover" /> : <div className="aspect-video grid place-items-center text-xs text-muted-foreground">No image</div>}
                <label className="flex items-center justify-center gap-2 p-2 border-t border-border bg-secondary/30 cursor-pointer text-sm">
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  <span>{uploading ? "Uploading…" : "Upload image"}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])} />
                </label>
              </div>
            </div>
            <Button onClick={save} disabled={busy} className="w-full bg-gradient-primary text-primary-foreground">
              {busy && <Loader2 className="w-4 h-4 animate-spin mr-1" />} Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>Order details</DialogTitle></DialogHeader>
          {view && (
            <div className="space-y-2 text-sm">
              <div>Package: <b>{view.guild_packages?.name}</b></div>
              <div>User: {view.user_email}</div>
              <div>Guild ID: <span className="font-mono">{view.guild_id}</span></div>
              <div>TrxID: <span className="font-mono">{view.trx_id}</span></div>
              {shotUrl && <img src={shotUrl} alt="" className="w-full rounded border border-border" />}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}