import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Upload, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  component: AdminSettings,
});

type S = {
  banner_api_url: string;
  like_api_url: string;
  visit_api_url: string;
  bkash_number: string;
  bkash_number_visit: string;
  payment_instructions: string;
  admin_telegram: string;
  logo_url: string | null;
  coupon_price_like: number;
  coupon_price_visit: number;
  coupon_price_panel: number;
};

function AdminSettings() {
  const [s, setS] = useState<S | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    supabase.from("app_settings").select("*").eq("id", 1).single().then(({ data }) => setS(data as S));
  }, []);

  async function save() {
    if (!s) return;
    setBusy(true);
    const { error } = await supabase.from("app_settings").update(s).eq("id", 1);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Settings saved");
  }

  if (!s) return <div className="grid place-items-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary"/></div>;

  async function uploadLogo(file: File) {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `logo/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("package-images").upload(path, file, { contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from("package-images").getPublicUrl(path);
      setS((prev) => prev ? { ...prev, logo_url: data.publicUrl } : prev);
      toast.success("Logo uploaded");
    } catch (e: any) { toast.error(e.message); } finally { setUploading(false); }
  }

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      <h1 className="font-display font-bold text-2xl">Settings</h1>
      <Card className="bg-gradient-card border-border p-5 space-y-4">
        <div>
          <Label>Site Logo</Label>
          <div className="mt-1 rounded-lg border border-border overflow-hidden">
            {s.logo_url ? <div className="aspect-[3/1] bg-secondary/40 grid place-items-center"><img src={s.logo_url} alt="logo" className="max-h-24 object-contain"/></div>
              : <div className="aspect-[3/1] grid place-items-center text-muted-foreground text-xs"><ImageIcon className="w-5 h-5 mr-1"/>No logo</div>}
            <label className="flex items-center justify-center gap-2 p-2 border-t border-border bg-secondary/30 cursor-pointer text-sm">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Upload className="w-4 h-4"/>}
              <span>{uploading ? "Uploading..." : "Upload logo"}</span>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])} />
            </label>
          </div>
        </div>
        <div>
          <Label>Banner API URL <span className="text-xs text-muted-foreground">(use {"{uid}"} placeholder)</span></Label>
          <Input value={s.banner_api_url} onChange={(e) => setS({ ...s, banner_api_url: e.target.value })} />
        </div>
        <div>
          <Label>Like API URL <span className="text-xs text-muted-foreground">(use {"{uid}"} placeholder)</span></Label>
          <Input value={s.like_api_url} onChange={(e) => setS({ ...s, like_api_url: e.target.value })} />
        </div>
        <div>
          <Label>Visit API URL <span className="text-xs text-muted-foreground">(use {"{uid}"} placeholder, returns ~10k visits per call)</span></Label>
          <Input value={s.visit_api_url} onChange={(e) => setS({ ...s, visit_api_url: e.target.value })} placeholder="https://your-domain.com/visit?uid={uid}&region=bd" />
        </div>
        <div>
          <Label>bKash Number (Likes)</Label>
          <Input value={s.bkash_number} onChange={(e) => setS({ ...s, bkash_number: e.target.value })} />
        </div>
        <div>
          <Label>bKash Number (Visits)</Label>
          <Input value={s.bkash_number_visit} onChange={(e) => setS({ ...s, bkash_number_visit: e.target.value })} placeholder="Separate bKash number for visit packages" />
        </div>
        <div>
          <Label>Admin Telegram <span className="text-xs text-muted-foreground">(shown as a Contact Admin button to users)</span></Label>
          <Input value={s.admin_telegram} onChange={(e) => setS({ ...s, admin_telegram: e.target.value })} placeholder="@proxaura" />
        </div>
        <div>
          <Label>Payment Instructions <span className="text-xs text-muted-foreground">(use {"{bkash}"} placeholder)</span></Label>
          <Textarea rows={6} value={s.payment_instructions} onChange={(e) => setS({ ...s, payment_instructions: e.target.value })} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div><Label>Coupon ৳ (Like)</Label><Input type="number" value={s.coupon_price_like} onChange={(e) => setS({ ...s, coupon_price_like: Number(e.target.value) })} /></div>
          <div><Label>Coupon ৳ (Visit)</Label><Input type="number" value={s.coupon_price_visit} onChange={(e) => setS({ ...s, coupon_price_visit: Number(e.target.value) })} /></div>
          <div><Label>Coupon ৳ (Panel)</Label><Input type="number" value={s.coupon_price_panel} onChange={(e) => setS({ ...s, coupon_price_panel: Number(e.target.value) })} /></div>
        </div>
        <Button onClick={save} disabled={busy} className="bg-gradient-primary text-primary-foreground hover:opacity-90 w-full">
          {busy ? <Loader2 className="w-4 h-4 animate-spin"/> : "Save settings"}
        </Button>
      </Card>
    </div>
  );
}
