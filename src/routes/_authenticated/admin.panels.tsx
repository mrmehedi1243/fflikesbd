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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, Loader2, Upload, KeyRound, CheckCircle2, XCircle, Eye, Image as ImageIcon, Copy, Check } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/panels")({
  component: AdminPanels,
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
  is_active: boolean;
  sort_order: number;
};
type Key = { id: string; panel_package_id: string; key_value: string; is_used: boolean; created_at: string };
type Order = {
  id: string; user_id: string; panel_package_id: string; trx_id: string;
  payment_screenshot_url: string | null;
  status: "pending" | "approved" | "rejected" | "delivered";
  delivered_key: string | null; apk_link: string | null; rejection_reason: string | null;
  created_at: string;
  panel_packages: { name: string; price_bdt: number } | null;
  user_email?: string | null;
};

const emptyPanel: Omit<Panel, "id"> = {
  name: "", description: "", price_bdt: 100, video_url: null, image_url: null,
  apk_link: "", duration_label: "30 days", is_active: true, sort_order: 0,
};

function AdminPanels() {
  const [tab, setTab] = useState<"packages" | "keys" | "orders">("orders");
  const [panels, setPanels] = useState<Panel[]>([]);
  const [keys, setKeys] = useState<Key[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderTab, setOrderTab] = useState<"pending" | "delivered" | "rejected" | "all">("pending");

  const [edit, setEdit] = useState<Panel | null>(null);
  const [form, setForm] = useState<Omit<Panel, "id">>(emptyPanel);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState<"video" | "image" | null>(null);

  const [keyPanelId, setKeyPanelId] = useState<string>("");
  const [bulkKeys, setBulkKeys] = useState("");

  const [view, setView] = useState<Order | null>(null);
  const [shotUrl, setShotUrl] = useState<string | null>(null);
  const [manualKey, setManualKey] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reject, setReject] = useState<Order | null>(null);
  const [reason, setReason] = useState("");
  const [showKey, setShowKey] = useState<{ key: string; apk: string | null } | null>(null);
  const [copied, setCopied] = useState(false);

  async function loadAll() {
    const [{ data: p }, { data: k }, { data: o }] = await Promise.all([
      supabase.from("panel_packages").select("*").order("sort_order"),
      supabase.from("panel_keys").select("*").order("created_at", { ascending: false }),
      supabase.from("panel_orders").select("*, panel_packages(name,price_bdt)").order("created_at", { ascending: false }),
    ]);
    setPanels((p ?? []) as Panel[]);
    setKeys((k ?? []) as Key[]);
    const list = (o ?? []) as unknown as Order[];
    if (list.length) {
      const ids = Array.from(new Set(list.map((x) => x.user_id)));
      const { data: profs } = await supabase.from("profiles").select("user_id,email").in("user_id", ids);
      const map = new Map((profs ?? []).map((pp: any) => [pp.user_id, pp.email]));
      list.forEach((x) => { x.user_email = map.get(x.user_id) ?? null; });
    }
    setOrders(list);
    if (!keyPanelId && p && p.length) setKeyPanelId(p[0].id);
  }
  useEffect(() => { loadAll(); }, []);

  function openPanel(p?: Panel) {
    if (p) { setEdit(p); setForm({ ...p, description: p.description ?? "", apk_link: p.apk_link ?? "", duration_label: p.duration_label ?? "" }); }
    else { setEdit({ id: "" } as Panel); setForm(emptyPanel); }
  }

  async function uploadFile(file: File, kind: "video" | "image") {
    setUploading(kind);
    try {
      const ext = file.name.split(".").pop() || (kind === "video" ? "mp4" : "jpg");
      const path = `panels/${kind}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("package-images").upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from("package-images").getPublicUrl(path);
      setForm((f) => ({ ...f, [kind === "video" ? "video_url" : "image_url"]: data.publicUrl }));
      toast.success(`${kind} uploaded`);
    } catch (e: any) { toast.error(e.message); } finally { setUploading(null); }
  }

  async function savePanel() {
    if (!form.name.trim()) return toast.error("Name din");
    setBusy(true);
    try {
      const payload = { ...form, price_bdt: Number(form.price_bdt) };
      if (edit?.id) {
        const { error } = await supabase.from("panel_packages").update(payload).eq("id", edit.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("panel_packages").insert(payload);
        if (error) throw error;
      }
      toast.success("Saved");
      setEdit(null);
      await loadAll();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  }

  async function deletePanel(id: string) {
    if (!confirm("Delete this panel?")) return;
    const { error } = await supabase.from("panel_packages").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted"); loadAll();
  }
  async function togglePanel(p: Panel, v: boolean) {
    setPanels((prev) => prev.map((x) => x.id === p.id ? { ...x, is_active: v } : x));
    const { error } = await supabase.from("panel_packages").update({ is_active: v }).eq("id", p.id);
    if (error) toast.error(error.message);
  }

  async function addKeys() {
    if (!keyPanelId) return toast.error("Panel select korun");
    const lines = bulkKeys.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    if (!lines.length) return toast.error("Key din (per line)");
    const rows = lines.map((k) => ({ panel_package_id: keyPanelId, key_value: k }));
    const { error } = await supabase.from("panel_keys").insert(rows);
    if (error) return toast.error(error.message);
    toast.success(`${lines.length} keys added`);
    setBulkKeys("");
    loadAll();
  }
  async function deleteKey(id: string) {
    if (!confirm("Delete key?")) return;
    const { error } = await supabase.from("panel_keys").delete().eq("id", id);
    if (error) return toast.error(error.message);
    loadAll();
  }

  async function openOrder(o: Order) {
    setView(o); setShotUrl(null); setManualKey("");
    if (o.payment_screenshot_url) {
      const { data } = await supabase.storage.from("payment-screenshots").createSignedUrl(o.payment_screenshot_url, 600);
      if (data) setShotUrl(data.signedUrl);
    }
  }

  async function approveOrder(o: Order, manual?: string) {
    setBusyId(o.id);
    try {
      const args: { _order_id: string; _manual_key?: string } = { _order_id: o.id };
      if (manual && manual.trim()) args._manual_key = manual.trim();
      const { data, error } = await supabase.rpc("approve_panel_order", args);
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row?.success) throw new Error(row?.message || "Failed");
      toast.success("Delivered");
      setShowKey({ key: row.key_value as string, apk: o.panel_packages ? (panels.find((p) => p.id === o.panel_package_id)?.apk_link ?? null) : null });
      setView(null);
      await loadAll();
    } catch (e: any) { toast.error(e.message); } finally { setBusyId(null); }
  }

  async function doReject() {
    if (!reject) return;
    setBusyId(reject.id);
    try {
      const { error } = await supabase.from("panel_orders").update({ status: "rejected", rejection_reason: reason || "Rejected by admin" }).eq("id", reject.id);
      if (error) throw error;
      toast.success("Rejected"); setReject(null); setReason(""); await loadAll();
    } catch (e: any) { toast.error(e.message); } finally { setBusyId(null); }
  }

  const filteredOrders = orderTab === "all" ? orders : orders.filter((o) => orderTab === "delivered" ? (o.status === "delivered" || o.status === "approved") : o.status === orderTab);
  const filteredKeys = keys.filter((k) => !keyPanelId || k.panel_package_id === keyPanelId);
  const stockCount = (pkgId: string) => keys.filter((k) => k.panel_package_id === pkgId && !k.is_used).length;

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <div className="flex items-center gap-2">
        <KeyRound className="w-5 h-5 text-primary" />
        <h1 className="font-display font-bold text-2xl">Panels</h1>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="packages">Packages</TabsTrigger>
          <TabsTrigger value="keys">Key Stock</TabsTrigger>
        </TabsList>

        {/* ORDERS */}
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
                  <div className="font-semibold truncate">{o.panel_packages?.name ?? "—"} <span className="text-xs text-muted-foreground">৳{o.panel_packages ? Number(o.panel_packages.price_bdt) : "?"}</span></div>
                  <div className="text-xs text-muted-foreground truncate">{o.user_email ?? "—"}</div>
                </div>
                <Badge variant="outline" className="capitalize">{o.status}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-muted-foreground">TrxID:</span> <span className="font-mono">{o.trx_id}</span></div>
                {o.delivered_key && <div className="col-span-2"><span className="text-muted-foreground">Key:</span> <span className="font-mono break-all">{o.delivered_key}</span></div>}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => openOrder(o)}><Eye className="w-3.5 h-3.5 mr-1"/>View</Button>
                {o.status === "pending" && (
                  <>
                    <Button size="sm" disabled={busyId === o.id} onClick={() => approveOrder(o)} className="bg-success text-success-foreground hover:bg-success/90">
                      {busyId === o.id ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <><CheckCircle2 className="w-3.5 h-3.5 mr-1"/>Auto-deliver</>}
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => setReject(o)}><XCircle className="w-3.5 h-3.5 mr-1"/>Reject</Button>
                  </>
                )}
              </div>
            </Card>
          ))}
        </TabsContent>

        {/* PACKAGES */}
        <TabsContent value="packages" className="space-y-3 mt-4">
          <div className="flex justify-end"><Button onClick={() => openPanel()} className="bg-gradient-primary text-primary-foreground"><Plus className="w-4 h-4 mr-1"/>New Panel</Button></div>
          {panels.map((p) => (
            <Card key={p.id} className="bg-gradient-card border-border p-3 flex items-center gap-3">
              <div className="w-16 h-16 rounded-md bg-secondary/40 grid place-items-center overflow-hidden shrink-0">
                {p.image_url ? <img src={p.image_url} alt="" className="w-full h-full object-cover"/> : <ImageIcon className="w-5 h-5 text-muted-foreground"/>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{p.name} {!p.is_active && <span className="text-xs text-muted-foreground">(hidden)</span>}</div>
                <div className="text-xs text-muted-foreground">৳{Number(p.price_bdt)} • {p.duration_label || "—"} • Stock: {stockCount(p.id)}</div>
              </div>
              <div className="flex gap-2 items-center">
                <Switch checked={p.is_active} onCheckedChange={(v) => togglePanel(p, v)} />
                <Button size="sm" variant="outline" onClick={() => openPanel(p)}><Pencil className="w-3.5 h-3.5"/></Button>
                <Button size="sm" variant="destructive" onClick={() => deletePanel(p.id)}><Trash2 className="w-3.5 h-3.5"/></Button>
              </div>
            </Card>
          ))}
          {panels.length === 0 && <Card className="bg-gradient-card border-border p-6 text-center text-muted-foreground text-sm">No panels yet</Card>}
        </TabsContent>

        {/* KEYS */}
        <TabsContent value="keys" className="space-y-3 mt-4">
          <Card className="bg-gradient-card border-border p-4 space-y-3">
            <div>
              <Label>Panel</Label>
              <select className="w-full h-10 px-3 rounded-md bg-background border border-input text-sm mt-1" value={keyPanelId} onChange={(e) => setKeyPanelId(e.target.value)}>
                {panels.map((p) => <option key={p.id} value={p.id}>{p.name} (stock: {stockCount(p.id)})</option>)}
              </select>
            </div>
            <div>
              <Label>Bulk add keys (one per line)</Label>
              <Textarea value={bulkKeys} onChange={(e) => setBulkKeys(e.target.value)} rows={5} placeholder={"KEY-AAAA-BBBB\nKEY-CCCC-DDDD"} className="font-mono"/>
            </div>
            <Button onClick={addKeys} className="bg-gradient-primary text-primary-foreground"><Plus className="w-4 h-4 mr-1"/>Add keys</Button>
          </Card>

          <div className="space-y-2">
            {filteredKeys.map((k) => (
              <Card key={k.id} className="bg-gradient-card border-border p-3 flex items-center gap-2">
                <div className="font-mono text-xs flex-1 truncate">{k.key_value}</div>
                <Badge variant={k.is_used ? "outline" : "default"}>{k.is_used ? "used" : "available"}</Badge>
                {!k.is_used && <Button size="sm" variant="destructive" onClick={() => deleteKey(k.id)}><Trash2 className="w-3.5 h-3.5"/></Button>}
              </Card>
            ))}
            {filteredKeys.length === 0 && <Card className="bg-gradient-card border-border p-4 text-center text-muted-foreground text-sm">No keys for this panel</Card>}
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit panel dialog */}
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="bg-card border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{edit?.id ? "Edit panel" : "New panel"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Description</Label><Input value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Price ৳</Label><Input type="number" value={form.price_bdt} onChange={(e) => setForm({ ...form, price_bdt: Number(e.target.value) })} /></div>
              <div><Label>Duration label</Label><Input value={form.duration_label ?? ""} onChange={(e) => setForm({ ...form, duration_label: e.target.value })} placeholder="30 days" /></div>
            </div>
            <div><Label>APK download link</Label><Input value={form.apk_link ?? ""} onChange={(e) => setForm({ ...form, apk_link: e.target.value })} placeholder="https://..." /></div>

            <div>
              <Label>Video</Label>
              <div className="mt-1 rounded-lg border border-border overflow-hidden">
                {form.video_url ? <video src={form.video_url} controls className="w-full aspect-video bg-black"/> : <div className="aspect-video grid place-items-center text-muted-foreground text-xs">No video</div>}
                <label className="flex items-center justify-center gap-2 p-2 border-t border-border bg-secondary/30 cursor-pointer text-sm">
                  {uploading === "video" ? <Loader2 className="w-4 h-4 animate-spin"/> : <Upload className="w-4 h-4"/>}
                  <span>{uploading === "video" ? "Uploading..." : "Upload video"}</span>
                  <input type="file" accept="video/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0], "video")} />
                </label>
              </div>
            </div>

            <div>
              <Label>Thumbnail / fallback image</Label>
              <div className="mt-1 rounded-lg border border-border overflow-hidden">
                {form.image_url ? <img src={form.image_url} alt="" className="w-full aspect-video object-cover"/> : <div className="aspect-video grid place-items-center text-muted-foreground text-xs">No image</div>}
                <label className="flex items-center justify-center gap-2 p-2 border-t border-border bg-secondary/30 cursor-pointer text-sm">
                  {uploading === "image" ? <Loader2 className="w-4 h-4 animate-spin"/> : <Upload className="w-4 h-4"/>}
                  <span>{uploading === "image" ? "Uploading..." : "Upload image"}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0], "image")} />
                </label>
              </div>
            </div>

            <div><Label>Sort order</Label><Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} /></div>
            <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /> <Label>Active</Label></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEdit(null)}>Cancel</Button>
            <Button onClick={savePanel} disabled={busy} className="bg-gradient-primary text-primary-foreground">{busy ? <Loader2 className="w-4 h-4 animate-spin"/> : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View order dialog */}
      <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Panel order</DialogTitle></DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div><div className="text-xs text-muted-foreground">Panel</div><div>{view?.panel_packages?.name}</div></div>
              <div><div className="text-xs text-muted-foreground">TrxID</div><div className="font-mono">{view?.trx_id}</div></div>
              <div className="col-span-2"><div className="text-xs text-muted-foreground">Email</div><div className="truncate">{view?.user_email ?? "—"}</div></div>
            </div>
            <div className="rounded-md border border-border bg-background min-h-[180px] grid place-items-center overflow-hidden">
              {!view?.payment_screenshot_url && <ImageIcon className="w-8 h-8 text-muted-foreground"/>}
              {view?.payment_screenshot_url && !shotUrl && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground"/>}
              {shotUrl && <img src={shotUrl} alt="" className="w-full max-h-[300px] object-contain"/>}
            </div>
            {view?.status === "pending" && (
              <div className="space-y-2 pt-2 border-t border-border">
                <Label>Manual key (optional - leave empty for auto from stock)</Label>
                <Input value={manualKey} onChange={(e) => setManualKey(e.target.value)} placeholder="KEY-XXXX-YYYY" className="font-mono"/>
                <Button onClick={() => view && approveOrder(view, manualKey)} disabled={busyId === view?.id} className="w-full bg-gradient-primary text-primary-foreground">
                  {busyId === view?.id ? <Loader2 className="w-4 h-4 animate-spin"/> : "Deliver key"}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={!!reject} onOpenChange={(o) => !o && setReject(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>Reject panel order</DialogTitle></DialogHeader>
          <Label>Reason</Label>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Invalid TrxID" />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setReject(null)}>Cancel</Button>
            <Button variant="destructive" onClick={doReject} disabled={busyId === reject?.id}>
              {busyId === reject?.id ? <Loader2 className="w-4 h-4 animate-spin"/> : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Show delivered key */}
      <Dialog open={!!showKey} onOpenChange={(o) => !o && setShowKey(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>Key delivered</DialogTitle></DialogHeader>
          <div className="space-y-2 text-sm">
            <Label>Key</Label>
            <div className="flex gap-2">
              <Input value={showKey?.key ?? ""} readOnly className="font-mono"/>
              <Button onClick={() => { if (showKey) { navigator.clipboard.writeText(showKey.key); setCopied(true); setTimeout(() => setCopied(false), 1500); } }}>
                {copied ? <Check className="w-4 h-4"/> : <Copy className="w-4 h-4"/>}
              </Button>
            </div>
            {showKey?.apk && <div className="text-xs text-muted-foreground">APK: <a href={showKey.apk} className="underline" target="_blank" rel="noreferrer">{showKey.apk}</a></div>}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
