import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Inbox, ShoppingCart, Eye, Heart } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminHome,
});

function AdminHome() {
  const [s, setS] = useState({ likePending: 0, likeActive: 0, visitPending: 0, visitActive: 0 });
  useEffect(() => {
    (async () => {
      const [{ count: lp }, { count: la }, { count: vp }, { count: va }] = await Promise.all([
        supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "pending").eq("type", "like"),
        supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "approved").eq("type", "like"),
        supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "pending").eq("type", "visit"),
        supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "approved").eq("type", "visit"),
      ]);
      setS({ likePending: lp ?? 0, likeActive: la ?? 0, visitPending: vp ?? 0, visitActive: va ?? 0 });
    })();
  }, []);

  const cards = [
    { label: "Pending Likes", val: s.likePending, icon: Heart, color: "text-warning", to: "/admin/orders" as const },
    { label: "Active Likes", val: s.likeActive, icon: Inbox, color: "text-success", to: "/admin/orders" as const },
    { label: "Pending Visits", val: s.visitPending, icon: Eye, color: "text-warning", to: "/admin/visit-orders" as const },
    { label: "Active Visits", val: s.visitActive, icon: ShoppingCart, color: "text-accent", to: "/admin/visit-orders" as const },
  ];

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <div>
        <h1 className="font-display font-bold text-2xl">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground">Manage everything from here</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {cards.map((st) => (
          <Link key={st.label} to={st.to}>
            <Card className="bg-gradient-card border-border p-4 hover:border-primary/50 transition">
              <st.icon className={`w-5 h-5 ${st.color} mb-2`} />
              <div className="text-xs text-muted-foreground">{st.label}</div>
              <div className={`text-2xl font-display font-bold ${st.color}`}>{st.val}</div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
