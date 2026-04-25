import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ShoppingCart, Zap, BookOpen, ChevronRight, Clock, CheckCircle2, Flame, Calendar, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  component: Dashboard,
});

type Order = {
  id: string;
  status: string;
  ff_uid: string;
  likes_per_day: number;
  duration_days: number;
  days_completed: number;
  total_likes_sent: number;
  created_at: string;
  next_run_at: string | null;
};

function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ pending: 0, approved: 0, completed: 0, totalLikes: 0 });
  const [pending, setPending] = useState<Order[]>([]);
  const [active, setActive] = useState<Order[]>([]);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data } = await supabase
        .from("orders")
        .select("id,status,ff_uid,likes_per_day,duration_days,days_completed,total_likes_sent,created_at,next_run_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      const list = (data ?? []) as Order[];
      setPending(list.filter((o) => o.status === "pending").slice(0, 3));
      setActive(list.filter((o) => o.status === "approved").slice(0, 3));
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
      {/* Greeting */}
      <div>
        <h1 className="font-display font-bold text-2xl">Hi, {user?.email?.split("@")[0]} 👋</h1>
        <p className="text-sm text-muted-foreground">Welcome to GS Auto Likes</p>
      </div>

      {/* Hero CTA */}
      <Card className="relative overflow-hidden border-0 p-0 shadow-glow">
        <div className="absolute inset-0 bg-gradient-primary opacity-95" />
        <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -left-6 -bottom-6 w-32 h-32 rounded-full bg-accent/30 blur-2xl" />
        <div className="relative p-5 text-primary-foreground">
          <div className="flex items-center gap-2 mb-1">
            <Flame className="w-4 h-4" />
            <span className="text-[11px] uppercase tracking-widest opacity-90">BD Server • Auto Like</span>
          </div>
          <div className="font-display font-bold text-xl leading-tight mb-1">Boost your Free Fire profile</div>
          <div className="text-sm opacity-90 mb-4">24h por por auto like delivery. Apnar UID din, pakage select korun, bas!</div>
          <Link to="/dashboard/packages">
            <Button variant="secondary" size="sm" className="font-semibold">
              <Sparkles className="w-4 h-4 mr-1" /> Browse Packages <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Pending", val: stats.pending, color: "text-warning", icon: Clock },
          { label: "Active", val: stats.approved, color: "text-success", icon: Zap },
          { label: "Completed", val: stats.completed, color: "text-primary", icon: CheckCircle2 },
          { label: "Total Likes", val: stats.totalLikes, color: "text-accent", icon: Flame },
        ].map((s) => (
          <Card key={s.label} className="bg-gradient-card border-border p-4">
            <div className="flex items-center justify-between mb-1">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{s.label}</div>
              <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
            </div>
            <div className={`text-2xl font-display font-bold ${s.color}`}>{s.val}</div>
          </Card>
        ))}
      </div>

      {/* Pending orders highlight */}
      {pending.length > 0 && (
        <Card className="border-warning/40 bg-warning/5 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-warning" />
            <h2 className="font-display font-bold text-warning">Awaiting Admin Approval</h2>
            <Badge className="bg-warning/20 text-warning border-0 ml-auto">{pending.length}</Badge>
          </div>
          <div className="space-y-2">
            {pending.map((o) => (
              <div key={o.id} className="flex items-center justify-between bg-card rounded-lg p-3 border border-border">
                <div className="min-w-0">
                  <div className="text-[11px] text-muted-foreground">UID</div>
                  <div className="font-mono font-semibold text-sm truncate">{o.ff_uid}</div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] text-muted-foreground">Plan</div>
                  <div className="text-sm font-semibold">{o.likes_per_day} × {o.duration_days}d</div>
                </div>
                <Badge variant="secondary" className="ml-3 bg-warning/15 text-warning border-warning/30">Pending</Badge>
              </div>
            ))}
          </div>
          <Link to="/dashboard/orders" className="mt-3 inline-flex items-center text-xs text-primary font-semibold">
            View all orders <ArrowRight className="w-3 h-3 ml-1" />
          </Link>
        </Card>
      )}

      {/* Active orders */}
      {active.length > 0 && (
        <Card className="bg-gradient-card border-border p-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-success" />
            <h2 className="font-display font-bold">Active Deliveries</h2>
          </div>
          <div className="space-y-2">
            {active.map((o) => (
              <Link key={o.id} to="/dashboard/orders" className="block">
                <div className="flex items-center justify-between bg-secondary/40 rounded-lg p-3 border border-border hover:border-primary/40 transition">
                  <div>
                    <div className="font-mono font-semibold text-sm">{o.ff_uid}</div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3 h-3" /> Day {o.days_completed}/{o.duration_days}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <div className="text-[11px] text-muted-foreground">Sent</div>
                      <div className="text-sm font-bold text-primary">{o.total_likes_sent}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}

      {/* How it works */}
      <Card className="bg-gradient-card border-border p-5">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="w-4 h-4 text-primary" />
          <h2 className="font-display font-bold">How it works</h2>
        </div>
        <div className="space-y-3">
          {[
            { t: "Package select korun", d: "Apnar pochonder package beche nin" },
            { t: "Free Fire UID din", d: "UID dile profile preview dekha jabe" },
            { t: "bKash Send Money", d: "TrxID + screenshot upload korun" },
            { t: "Admin approve", d: "Approve hole sathe sathe 1st like jabe" },
            { t: "24h por por delivery", d: "My Orders e timer + history dekhun" },
          ].map((s, i) => (
            <div key={i} className="flex gap-3 items-start">
              <div className="w-7 h-7 shrink-0 rounded-full bg-gradient-primary text-primary-foreground grid place-items-center text-xs font-bold">{i + 1}</div>
              <div>
                <div className="text-sm font-semibold">{s.t}</div>
                <div className="text-xs text-muted-foreground">{s.d}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {pending.length === 0 && active.length === 0 && stats.completed === 0 && (
        <Card className="bg-gradient-card border-border p-6 text-center">
          <ShoppingCart className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-50" />
          <div className="font-semibold mb-1">No orders yet</div>
          <div className="text-sm text-muted-foreground mb-4">Buy your first package to start auto-liking.</div>
          <Link to="/dashboard/packages">
            <Button className="bg-gradient-primary text-primary-foreground hover:opacity-90 font-semibold">Get Started</Button>
          </Link>
        </Card>
      )}
    </div>
  );
}
