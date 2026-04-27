import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
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
};

function AdminSettings() {
  const [s, setS] = useState<S | null>(null);
  const [busy, setBusy] = useState(false);

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

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      <h1 className="font-display font-bold text-2xl">Settings</h1>
      <Card className="bg-gradient-card border-border p-5 space-y-4">
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
          <Label>Payment Instructions <span className="text-xs text-muted-foreground">(use {"{bkash}"} placeholder)</span></Label>
          <Textarea rows={6} value={s.payment_instructions} onChange={(e) => setS({ ...s, payment_instructions: e.target.value })} />
        </div>
        <Button onClick={save} disabled={busy} className="bg-gradient-primary text-primary-foreground hover:opacity-90 w-full">
          {busy ? <Loader2 className="w-4 h-4 animate-spin"/> : "Save settings"}
        </Button>
      </Card>
    </div>
  );
}
