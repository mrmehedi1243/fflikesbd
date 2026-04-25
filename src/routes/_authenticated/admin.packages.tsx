import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/packages")({
  component: AdminPackages,
});

type Pkg = { id: string; name: string; description: string | null; likes_per_day: number; duration_days: number; price_bdt: number; is_active: boolean; sort_order: number };

const empty: Omit<Pkg, "id"> = { name: "", description: "", likes_per_day: 100, duration_days: 7, price_bdt: 60, is_active: true, sort_order: 0 };

function AdminPackages() {
  const [items, setItems] = useState<Pkg[]>([]);
  const [edit, setEdit] = useState<Pkg | null>(null);
  const [form, setForm] = useState<Omit<Pkg, "id">>(empty);
  const [busy, setBusy] = useState(false);

  async function load() {
    const { data } = await supabase.from("packages").select("*").order("sort_order");
    setItems((data ?? []) as Pkg[]);
  }
  useEffect(() => { load(); }, []);

  function open(p?: Pkg) {
    if (p) {
      setEdit(p);
      setForm({ name: p.name, description: p.description ?? "", likes_per_day: p.likes_per_day, duration_days: p.duration_days, price_bdt: Number(p.price_bdt), is_active: p.is_active, sort_order: p.sort_order });
    } else {
      setEdit({ id: "" } as Pkg);
      setForm(empty);
    }
  }

  async function save() {
    setBusy(true);
    try {
      if (edit?.id) {
        const { error } = await supabase.from("packages").update(form).eq("id", edit.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("packages").insert(form);
        if (error) throw error;
      }
      toast.success("Saved");
      setEdit(null);
      await load();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  }

  async function del(id: string) {
    if (!confirm("Delete this package?")) return;
    const { error } = await supabase.from("packages").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  }

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="font-display font-bold text-2xl">Packages</h1>
        <Button onClick={() => open()} className="bg-gradient-primary text-primary-foreground hover:opacity-90"><Plus className="w-4 h-4 mr-1"/>New</Button>
      </div>

      <div className="space-y-3">
        {items.map((p) => (
          <Card key={p.id} className="bg-gradient-card border-border p-4 flex items-center justify-between">
            <div>
              <div className="font-semibold">{p.name} {!p.is_active && <span className="text-xs text-muted-foreground">(hidden)</span>}</div>
              <div className="text-xs text-muted-foreground">{p.likes_per_day}/day × {p.duration_days}d • ৳{Number(p.price_bdt)}</div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => open(p)}><Pencil className="w-3.5 h-3.5"/></Button>
              <Button size="sm" variant="destructive" onClick={() => del(p.id)}><Trash2 className="w-3.5 h-3.5"/></Button>
            </div>
          </Card>
        ))}
        {items.length === 0 && <Card className="bg-gradient-card border-border p-6 text-center text-muted-foreground text-sm">No packages</Card>}
      </div>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>{edit?.id ? "Edit package" : "New package"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Description</Label><Input value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="grid grid-cols-3 gap-2">
              <div><Label>Likes/day</Label><Input type="number" value={form.likes_per_day} onChange={(e) => setForm({ ...form, likes_per_day: Number(e.target.value) })} /></div>
              <div><Label>Days</Label><Input type="number" value={form.duration_days} onChange={(e) => setForm({ ...form, duration_days: Number(e.target.value) })} /></div>
              <div><Label>Price ৳</Label><Input type="number" value={form.price_bdt} onChange={(e) => setForm({ ...form, price_bdt: Number(e.target.value) })} /></div>
            </div>
            <div><Label>Sort order</Label><Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} /></div>
            <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /> <Label>Active</Label></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEdit(null)}>Cancel</Button>
            <Button onClick={save} disabled={busy} className="bg-gradient-primary text-primary-foreground">{busy ? <Loader2 className="w-4 h-4 animate-spin"/> : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
