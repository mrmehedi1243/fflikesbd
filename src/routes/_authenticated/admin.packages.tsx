import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Loader2, Upload, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/packages")({
  component: AdminPackages,
});

type Pkg = {
  id: string;
  name: string;
  description: string | null;
  type: "like" | "visit";
  likes_per_day: number;
  duration_days: number;
  visits_count: number;
  price_bdt: number;
  is_active: boolean;
  sort_order: number;
  image_url: string | null;
  category_id: string | null;
};
type Cat = { id: string; name: string; type: "like" | "visit" };

const empty: Omit<Pkg, "id"> = {
  name: "",
  description: "",
  type: "like",
  likes_per_day: 100,
  duration_days: 7,
  visits_count: 10000,
  price_bdt: 60,
  is_active: true,
  sort_order: 0,
  image_url: null,
  category_id: null,
};

function AdminPackages() {
  const [items, setItems] = useState<Pkg[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [edit, setEdit] = useState<Pkg | null>(null);
  const [form, setForm] = useState<Omit<Pkg, "id">>(empty);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function load() {
    const [{ data: p }, { data: c }] = await Promise.all([
      supabase.from("packages").select("*").order("sort_order"),
      supabase.from("categories").select("id,name,type").order("sort_order"),
    ]);
    setItems((p ?? []) as Pkg[]);
    setCats((c ?? []) as Cat[]);
  }
  useEffect(() => { load(); }, []);

  function open(p?: Pkg) {
    if (p) { setEdit(p); setForm({ ...p, description: p.description ?? "" }); }
    else { setEdit({ id: "" } as Pkg); setForm(empty); }
  }

  async function uploadImg(file: File) {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `packages/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("package-images").upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from("package-images").getPublicUrl(path);
      setForm((f) => ({ ...f, image_url: data.publicUrl }));
      toast.success("Image uploaded");
    } catch (e: any) { toast.error(e.message); } finally { setUploading(false); }
  }

  async function save() {
    if (!form.name.trim()) return toast.error("Name din");
    setBusy(true);
    try {
      const payload = { ...form, price_bdt: Number(form.price_bdt) };
      if (edit?.id) {
        const { error } = await supabase.from("packages").update(payload).eq("id", edit.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("packages").insert(payload);
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

  const matchingCats = cats.filter((c) => c.type === form.type);

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="font-display font-bold text-2xl">Packages</h1>
        <Button onClick={() => open()} className="bg-gradient-primary text-primary-foreground hover:opacity-90"><Plus className="w-4 h-4 mr-1"/>New</Button>
      </div>

      <div className="space-y-3">
        {items.map((p) => (
          <Card key={p.id} className="bg-gradient-card border-border p-3 flex items-center gap-3">
            <div className="w-16 h-16 rounded-md bg-secondary/40 grid place-items-center overflow-hidden shrink-0">
              {p.image_url ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" /> : <ImageIcon className="w-5 h-5 text-muted-foreground" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate">
                {p.name} <span className="text-[10px] uppercase text-muted-foreground">({p.type})</span>
                {!p.is_active && <span className="text-xs text-muted-foreground ml-1">(hidden)</span>}
              </div>
              <div className="text-xs text-muted-foreground">
                {p.type === "like"
                  ? `${p.likes_per_day}/day × ${p.duration_days}d`
                  : `${p.visits_count.toLocaleString()} visits`} • ৳{Number(p.price_bdt)}
              </div>
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
        <DialogContent className="bg-card border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{edit?.id ? "Edit package" : "New package"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Type</Label>
              <div className="flex gap-2 mt-1">
                {(["like", "visit"] as const).map((t) => (
                  <button key={t} type="button" onClick={() => setForm({ ...form, type: t, category_id: null })}
                    className={`flex-1 py-2 rounded-md border text-sm font-medium capitalize ${form.type === t ? "border-primary bg-primary/15 text-primary" : "border-border bg-card"}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Description</Label><Input value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>

            <div>
              <Label>Category</Label>
              <select className="w-full h-10 px-3 rounded-md bg-background border border-input text-sm"
                value={form.category_id ?? ""}
                onChange={(e) => setForm({ ...form, category_id: e.target.value || null })}>
                <option value="">— None —</option>
                {matchingCats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            {form.type === "like" ? (
              <div className="grid grid-cols-3 gap-2">
                <div><Label>Likes/day</Label><Input type="number" value={form.likes_per_day} onChange={(e) => setForm({ ...form, likes_per_day: Number(e.target.value) })} /></div>
                <div><Label>Days</Label><Input type="number" value={form.duration_days} onChange={(e) => setForm({ ...form, duration_days: Number(e.target.value) })} /></div>
                <div><Label>Price ৳</Label><Input type="number" value={form.price_bdt} onChange={(e) => setForm({ ...form, price_bdt: Number(e.target.value) })} /></div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Visits</Label><Input type="number" step="1000" value={form.visits_count} onChange={(e) => setForm({ ...form, visits_count: Number(e.target.value) })} /></div>
                <div><Label>Price ৳</Label><Input type="number" value={form.price_bdt} onChange={(e) => setForm({ ...form, price_bdt: Number(e.target.value) })} /></div>
              </div>
            )}

            <div>
              <Label>Image</Label>
              <div className="mt-1 rounded-lg border border-border overflow-hidden">
                {form.image_url ? (
                  <div className="aspect-video bg-secondary/40"><img src={form.image_url} alt="" className="w-full h-full object-cover"/></div>
                ) : (
                  <div className="aspect-video grid place-items-center text-muted-foreground text-xs">No image</div>
                )}
                <label className="flex items-center justify-center gap-2 p-2 border-t border-border bg-secondary/30 cursor-pointer text-sm">
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Upload className="w-4 h-4"/>}
                  <span>{uploading ? "Uploading..." : "Upload image"}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadImg(e.target.files[0])} />
                </label>
              </div>
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
