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

export const Route = createFileRoute("/_authenticated/admin/slider")({
  component: AdminSlider,
});

type Slide = {
  id: string;
  image_url: string;
  link_url: string | null;
  title: string | null;
  sort_order: number;
  is_active: boolean;
};
const empty: Omit<Slide, "id"> = { image_url: "", link_url: "", title: "", sort_order: 0, is_active: true };

function AdminSlider() {
  const [items, setItems] = useState<Slide[]>([]);
  const [edit, setEdit] = useState<Slide | null>(null);
  const [form, setForm] = useState<Omit<Slide, "id">>(empty);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function load() {
    const { data } = await supabase.from("hero_slides").select("*").order("sort_order");
    setItems((data ?? []) as Slide[]);
  }
  useEffect(() => { load(); }, []);

  function open(s?: Slide) {
    if (s) { setEdit(s); setForm({ ...s, link_url: s.link_url ?? "", title: s.title ?? "" }); }
    else { setEdit({ id: "" } as Slide); setForm(empty); }
  }

  async function uploadImg(file: File) {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `slides/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("package-images").upload(path, file, { contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from("package-images").getPublicUrl(path);
      setForm((f) => ({ ...f, image_url: data.publicUrl }));
      toast.success("Image uploaded");
    } catch (e: any) { toast.error(e.message); } finally { setUploading(false); }
  }

  async function save() {
    if (!form.image_url) return toast.error("Image upload korun");
    setBusy(true);
    try {
      const payload = { ...form, link_url: form.link_url || null, title: form.title || null };
      if (edit?.id) {
        const { error } = await supabase.from("hero_slides").update(payload).eq("id", edit.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("hero_slides").insert(payload);
        if (error) throw error;
      }
      toast.success("Saved");
      setEdit(null);
      await load();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  }

  async function del(id: string) {
    if (!confirm("Delete slide?")) return;
    const { error } = await supabase.from("hero_slides").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  }

  async function toggle(s: Slide, v: boolean) {
    setItems((p) => p.map((x) => x.id === s.id ? { ...x, is_active: v } : x));
    const { error } = await supabase.from("hero_slides").update({ is_active: v }).eq("id", s.id);
    if (error) toast.error(error.message);
  }

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="font-display font-bold text-2xl">Slider</h1>
        <Button onClick={() => open()} className="bg-gradient-primary text-primary-foreground"><Plus className="w-4 h-4 mr-1"/>New slide</Button>
      </div>

      <div className="space-y-3">
        {items.map((s) => (
          <Card key={s.id} className="bg-gradient-card border-border p-3 flex items-center gap-3">
            <div className="w-24 h-14 rounded-md bg-secondary/40 grid place-items-center overflow-hidden shrink-0">
              {s.image_url ? <img src={s.image_url} alt="" className="w-full h-full object-cover"/> : <ImageIcon className="w-5 h-5 text-muted-foreground"/>}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate">{s.title || "Untitled"}</div>
              <div className="text-xs text-muted-foreground truncate">{s.link_url || "no link"}</div>
            </div>
            <div className="flex gap-2 items-center">
              <Switch checked={s.is_active} onCheckedChange={(v) => toggle(s, v)} />
              <Button size="sm" variant="outline" onClick={() => open(s)}><Pencil className="w-3.5 h-3.5"/></Button>
              <Button size="sm" variant="destructive" onClick={() => del(s.id)}><Trash2 className="w-3.5 h-3.5"/></Button>
            </div>
          </Card>
        ))}
        {items.length === 0 && <Card className="bg-gradient-card border-border p-6 text-center text-muted-foreground text-sm">No slides yet</Card>}
      </div>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="bg-card border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{edit?.id ? "Edit slide" : "New slide"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Slide Image</Label>
              <div className="mt-1 rounded-lg border border-border overflow-hidden">
                {form.image_url
                  ? <div className="aspect-video bg-secondary/40"><img src={form.image_url} alt="" className="w-full h-full object-cover"/></div>
                  : <div className="aspect-video grid place-items-center text-muted-foreground text-xs">No image</div>}
                <label className="flex items-center justify-center gap-2 p-2 border-t border-border bg-secondary/30 cursor-pointer text-sm">
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Upload className="w-4 h-4"/>}
                  <span>{uploading ? "Uploading..." : "Upload image"}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadImg(e.target.files[0])} />
                </label>
              </div>
            </div>
            <div><Label>Title (optional)</Label><Input value={form.title ?? ""} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>Link URL (optional)</Label><Input value={form.link_url ?? ""} onChange={(e) => setForm({ ...form, link_url: e.target.value })} placeholder="https://..." /></div>
            <div><Label>Sort order</Label><Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} /></div>
            <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })}/><Label>Active</Label></div>
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