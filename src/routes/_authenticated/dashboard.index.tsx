import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, ShoppingCart, BookOpen, ChevronRight, Flame, ArrowRight, Heart, Eye } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  component: Dashboard,
});

type Cat = { id: string; name: string; description: string | null; image_url: string | null; type: "like" | "visit" };

function Dashboard() {
  const { user } = useAuth();
  const [cats, setCats] = useState<Cat[]>([]);
  const [orderCount, setOrderCount] = useState(0);

  useEffect(() => {
    (async () => {
      const [{ data: c }, { count }] = await Promise.all([
        supabase.from("categories").select("id,name,description,image_url,type").eq("is_active", true).order("sort_order"),
        user ? supabase.from("orders").select("*", { count: "exact", head: true }).eq("user_id", user.id) : Promise.resolve({ count: 0 } as any),
      ]);
      setCats((c ?? []) as Cat[]);
      setOrderCount(count ?? 0);
    })();
  }, [user]);

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <div>
        <h1 className="font-display font-bold text-2xl">Hi, {user?.email?.split("@")[0]} 👋</h1>
        <p className="text-sm text-muted-foreground">Welcome to GS Auto Likes Store</p>
      </div>

      {/* Hero */}
      <Card className="relative overflow-hidden border-0 p-0 shadow-glow">
        <div className="absolute inset-0 bg-gradient-primary opacity-95" />
        <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -left-6 -bottom-6 w-32 h-32 rounded-full bg-accent/30 blur-2xl" />
        <div className="relative p-5 text-primary-foreground">
          <div className="flex items-center gap-2 mb-1">
            <Flame className="w-4 h-4" />
            <span className="text-[11px] uppercase tracking-widest opacity-90">BD Server • Free Fire</span>
          </div>
          <div className="font-display font-bold text-xl leading-tight mb-1">Boost your FF profile</div>
          <div className="text-sm opacity-90 mb-4">Auto Likes ar Profile Visits — apnar UID din, package select korun, bas!</div>
          <Link to="/dashboard/packages">
            <Button variant="secondary" size="sm" className="font-semibold">
              <Sparkles className="w-4 h-4 mr-1" /> Browse Packages <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </Card>

      {/* Categories */}
      <div>
        <h2 className="font-display font-bold mb-3 flex items-center gap-2">Categories</h2>
        <div className="grid grid-cols-2 gap-3">
          {cats.map((c) => {
            const Icon = c.type === "visit" ? Eye : Heart;
            return (
              <Link key={c.id} to="/dashboard/packages" search={{ type: c.type } as any}>
                <Card className="bg-gradient-card border-border overflow-hidden hover:border-primary/60 transition shadow-card h-full">
                  <div className="aspect-video bg-secondary/40 grid place-items-center overflow-hidden relative">
                    {c.image_url ? (
                      <img src={c.image_url} alt={c.name} className="w-full h-full object-cover" />
                    ) : (
                      <Icon className={`w-10 h-10 ${c.type === "visit" ? "text-accent" : "text-primary"} opacity-70`} />
                    )}
                    <div className="absolute top-2 left-2 text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full bg-background/80 backdrop-blur border border-border">{c.type}</div>
                  </div>
                  <div className="p-3">
                    <div className="font-display font-bold text-sm">{c.name}</div>
                    {c.description && <div className="text-[11px] text-muted-foreground line-clamp-2">{c.description}</div>}
                  </div>
                </Card>
              </Link>
            );
          })}
          {cats.length === 0 && (
            <Card className="col-span-full bg-gradient-card border-border p-6 text-center text-sm text-muted-foreground">
              No categories yet.
            </Card>
          )}
        </div>
      </div>

      {/* My Orders button */}
      <Link to="/dashboard/orders">
        <Card className="bg-gradient-card border-border p-4 flex items-center justify-between hover:border-primary/60 transition">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/15 grid place-items-center">
              <ShoppingCart className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="font-semibold">My Orders</div>
              <div className="text-xs text-muted-foreground">Pending, active ar completed sob ekhane</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold bg-primary/15 text-primary px-2 py-1 rounded-md">{orderCount}</span>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
          </div>
        </Card>
      </Link>

      {/* How it works */}
      <Card className="bg-gradient-card border-border p-5">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="w-4 h-4 text-primary" />
          <h2 className="font-display font-bold">How it works</h2>
        </div>
        <div className="space-y-3">
          {[
            { t: "Category select korun", d: "Like ba Visit — pochonder mato beche nin" },
            { t: "Package select", d: "Apnar budget mato package nin" },
            { t: "Free Fire UID + bKash payment", d: "TrxID + screenshot upload korun" },
            { t: "Admin approve", d: "Approve hole shathe shathe delivery start hobe" },
            { t: "My Orders e progress", d: "Live progress ar history dekhun" },
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
    </div>
  );
}
