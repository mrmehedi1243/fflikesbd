import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Inbox, ShoppingCart, Users, Zap } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminHome,
});

function AdminHome() {
  const [s, setS] = useState({ pending: 0, active: 0, totalOrders: 0, totalLikes: 0 });
  useEffect(() => {
    (async () => {
      const [{ count: pending }, { count: active }, { count: totalOrders }, { data: likes }] = await Promise.all([
        supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "approved"),
        supabase.from("orders").select("*", { count: "exact", head: true }),
        supabase.from("orders").select("total_likes_sent"),
      ]);
      setS({
        pending: pending ?? 0,
        active: active ?? 0,
        totalOrders: totalOrders ?? 0,
        totalLikes: (likes ?? []).reduce((a: number, b: any) => a + (b.total_likes_sent || 0), 0),
      });
    })();
  }, []);

  const stats = [
    { label: "Pending Orders", val: s.pending, icon: Inbox, color: "text-warning", to: "/admin/orders" },
    { label: "Active Orders", val: s.active, icon: Zap, color: "text-success", to: "/admin/orders" },
    { label: "Total Orders", val: s.totalOrders, icon: ShoppingCart, color: "text-primary", to: "/admin/orders" },
    { label: "Total Likes Sent", val: s.totalLikes, icon: Users, color: "text-accent", to: "/admin/orders" },
  ];

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <div>
        <h1 className="font-display font-bold text-2xl">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground">Manage everything from here</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {stats.map((st) => (
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
