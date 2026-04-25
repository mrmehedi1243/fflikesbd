import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ShoppingCart, Zap, BookOpen, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  component: Dashboard,
});

type Order = { id: string; status: string; ff_uid: string; likes_per_day: number; total_likes_sent: number; created_at: string };

function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ pending: 0, approved: 0, completed: 0, totalLikes: 0 });
  const [recent, setRecent] = useState<Order[]>([]);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data } = await supabase
        .from("orders")
        .select("id,status,ff_uid,likes_per_day,total_likes_sent,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      const list = (data ?? []) as Order[];
      setRecent(list.slice(0, 3));
      setStats({
        pending: list.filter((o) => o.status === "pending").length,
        approved: list.filter((o) => o.status === "approved").length,
        completed: list.filter((o) => o.status === "completed").length,
        totalLikes: list.reduce((a, b) => a + (b.total_likes_sent || 0), 0),
      });
    })();
  }, [user]);

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Welcome back, {user?.email?.split("@")[0]} 👋</p>
        </div>
      </div>

      {/* Hero CTA */}
      <Card className="bg-gradient-primary border-0 p-5 text-primary-foreground shadow-glow">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-background/20 grid place-items-center">
            <Sparkles className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <div className="font-display font-bold text-lg leading-tight">Boost your FF profile</div>
            <div className="text-sm opacity-90">Browse packages and start auto-liking today.</div>
          </div>
          <Link to="/dashboard/packages"><Button variant="secondary" size="sm">Buy <ChevronRight className="w-4 h-4"/></Button></Link>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Pending", val: stats.pending, color: "text-warning" },
          { label: "Active", val: stats.approved, color: "text-success" },
          { label: "Completed", val: stats.completed, color: "text-primary" },
          { label: "Total Likes", val: stats.totalLikes, color: "text-accent" },
        ].map((s) => (
          <Card key={s.label} className="bg-gradient-card border-border p-4">
            <div className="text-xs text-muted-foreground">{s.label}</div>
            <div className={`text-2xl font-display font-bold ${s.color}`}>{s.val}</div>
          </Card>
        ))}
      </div>

      {/* How it works */}
      <Card className="bg-gradient-card border-border p-5">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="w-4 h-4 text-primary" />
          <h2 className="font-display font-bold">How it works</h2>
        </div>
        <ol className="space-y-2 text-sm text-muted-foreground">
          <li className="flex gap-2"><span className="text-primary font-bold">1.</span> <span><b className="text-foreground">Packages</b> theke ekta package select korun.</span></li>
          <li className="flex gap-2"><span className="text-primary font-bold">2.</span> <span>Apnar <b className="text-foreground">Free Fire UID</b> dile profile banner dekha jabe.</span></li>
          <li className="flex gap-2"><span className="text-primary font-bold">3.</span> <span><b className="text-foreground">bKash Send Money</b> korun, TrxID + screenshot upload korun.</span></li>
          <li className="flex gap-2"><span className="text-primary font-bold">4.</span> <span>Admin approve korar sathe sathe like start hobe ar prati 24h por delivery hobe.</span></li>
          <li className="flex gap-2"><span className="text-primary font-bold">5.</span> <span><b className="text-foreground">My Orders</b> page e timer + per day delivery dekhte parben.</span></li>
        </ol>
      </Card>

      {/* Recent orders */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-display font-bold">Recent Orders</h2>
          <Link to="/dashboard/orders" className="text-xs text-primary">View all</Link>
        </div>
        {recent.length === 0 ? (
          <Card className="bg-gradient-card border-border p-6 text-center text-sm text-muted-foreground">
            <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-50" />
            No orders yet. Buy a package to get started.
          </Card>
        ) : (
          <div className="space-y-2">
            {recent.map((o) => (
              <Card key={o.id} className="bg-gradient-card border-border p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">UID</div>
                  <div className="font-mono font-semibold">{o.ff_uid}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={o.status === "approved" ? "default" : o.status === "pending" ? "secondary" : "outline"} className="capitalize">{o.status}</Badge>
                  <Zap className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold">{o.likes_per_day}/day</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
