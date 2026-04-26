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

export const Route = createFileRoute("/_authenticated/admin/categories")({
  component: AdminCategories,
});

type Cat = { id: string; name: string; description: string | null; image_url: string | null; type: "like" | "visit"; sort_order: number; is_active: boolean };
const empty: Omit<Cat, "id"> = { name: "", description: "", image_url: null, type: "like", sort_order: 0, is_active: true };

function AdminCategories() {
  const [items, setItems] = useState<Cat[]>([]);
  const [edit, setEdit] = useState<Cat | null>(null);
  const [form, setForm] = useState<Omit<Cat, "id">>(empty);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function load() {
    const { data } = await supabase.from("categories").select("*").order("sort_order");
    setItems((data ?? []) as Cat[]);
  }
  useEffect(() => { load(); }, []);

  function open(c?: Cat) {
    if (c) { setEdit(c); setForm({ ...c }); }
    else { setEdit({ id: "" } as Cat); setForm(empty); }
  }

  async function uploadImg(file: File) {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `categories/${Date.now()}.${ext}`;
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
      if (edit?.id) {
        const { error } = await supabase.from("categories").update(form).eq("id", edit.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("categories").insert(form);
        if (error) throw error;
      }
      toast.success("Saved");
      setEdit(null);
      await load();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  }

  async function del(id: string) {
    if (!confirm("Delete this category?")) return;
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  }

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="font-display font-bold text-2xl">Categories</h1>
        <Button onClick={() => open()} className="bg-gradient-primary text-primary-foreground hover:opacity-90"><Plus className="w-4 h-4 mr-1"/>New</Button>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {items.map((c) => (
          <Card key={c.id} className="bg-gradient-card border-border overflow-hidden">
            <div className="aspect-video bg-secondary/40 grid place-items-center overflow-hidden">
              {c.image_url ? <img src={c.image_url} alt={c.name} className="w-full h-full object-cover" /> : <ImageIcon className="w-8 h-8 text-muted-foreground" />}
            </div>
            <div className="p-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="font-semibold truncate">{c.name} <span className="text-[10px] uppercase text-muted-foreground">({c.type})</span></div>
                {!c.is_active && <div className="text-xs text-warning">hidden</div>}
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => open(c)}><Pencil className="w-3.5 h-3.5"/></Button>
                <Button size="sm" variant="destructive" onClick={() => del(c.id)}><Trash2 className="w-3.5 h-3.5"/></Button>
              </div>
            </div>
          </Card>
        ))}
        {items.length === 0 && <Card className="col-span-full bg-gradient-card border-border p-6 text-center text-muted-foreground text-sm">No categories</Card>}
      </div>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="bg-card border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{edit?.id ? "Edit category" : "New category"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Description</Label><Input value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div>
              <Label>Type</Label>
              <div className="flex gap-2 mt-1">
                {(["like", "visit"] as const).map((t) => (
                  <button key={t} type="button" onClick={() => setForm({ ...form, type: t })}
                    className={`flex-1 py-2 rounded-md border text-sm font-medium capitalize ${form.type === t ? "border-primary bg-primary/15 text-primary" : "border-border bg-card"}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
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
