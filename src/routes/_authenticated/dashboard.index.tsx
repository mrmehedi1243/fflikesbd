import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, ShoppingCart, BookOpen, ChevronRight, Flame, ArrowRight, Heart, Eye, Send, TrendingUp } from "lucide-react";
import gsLogo from "@/assets/gs-logo.jpg";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  component: Dashboard,
});

type Cat = { id: string; name: string; description: string | null; image_url: string | null; type: "like" | "visit" };

function Dashboard() {
  const { user } = useAuth();
  const [cats, setCats] = useState<Cat[]>([]);
  const [orderCount, setOrderCount] = useState(0);
  const [tg, setTg] = useState<string>("@proxaura");
  const [todayLikes, setTodayLikes] = useState(0);
  const [todayVisits, setTodayVisits] = useState(0);

  useEffect(() => {
    (async () => {
      const [{ data: c }, { count }, { data: settings }] = await Promise.all([
        supabase.from("categories").select("id,name,description,image_url,type").eq("is_active", true).order("sort_order"),
        user ? supabase.from("orders").select("*", { count: "exact", head: true }).eq("user_id", user.id) : Promise.resolve({ count: 0 } as any),
        supabase.from("app_settings").select("admin_telegram").eq("id", 1).single(),
      ]);
      setCats((c ?? []) as Cat[]);
      setOrderCount(count ?? 0);
      if (settings?.admin_telegram) setTg(settings.admin_telegram);

      // Today's totals across this user's orders
      if (user) {
        const { data: myOrders } = await supabase.from("orders").select("id").eq("user_id", user.id);
        const ids = (myOrders ?? []).map((o: any) => o.id);
        if (ids.length) {
          const since = new Date(); since.setHours(0,0,0,0);
          const sinceIso = since.toISOString();
          const [{ data: ll }, { data: vl }] = await Promise.all([
            supabase.from("like_logs").select("likes_sent,success,api_response,created_at").in("order_id", ids).gte("created_at", sinceIso),
            supabase.from("visit_logs").select("visits_sent,success,api_response,created_at").in("order_id", ids).gte("created_at", sinceIso),
          ]);
          // Real API counts: read from api_response when available, fallback to stored counter
          const realLikes = (n: any) => {
            const r = n?.api_response || {};
            const diff = (typeof r.LikesAfterCommand === "number" && typeof r.LikesbeforeCommand === "number")
              ? r.LikesAfterCommand - r.LikesbeforeCommand
              : null;
            const v = r.LikesGivenByAPI ?? r.likes_added ?? r.likes ?? diff ?? r.added ?? n.likes_sent ?? 0;
            return Number(v) || (n.likes_sent || 0);
          };
          const realVisits = (n: any) => {
            const r = n?.api_response || {};
            return Number(r.visits_added ?? r.visits ?? r.added ?? r.count ?? n.visits_sent ?? 0) || (n.visits_sent || 0);
          };
          setTodayLikes((ll ?? []).filter((r:any)=>r.success).reduce((s:number,r:any)=>s+realLikes(r),0));
          setTodayVisits((vl ?? []).filter((r:any)=>r.success).reduce((s:number,r:any)=>s+realVisits(r),0));
        }
      }
    })();
  }, [user]);

  const tgHandle = tg.replace(/^@/, "");

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <div>
        <h1 className="font-display font-bold text-2xl">Hi, {user?.email?.split("@")[0]} 👋</h1>
        <p className="text-sm text-muted-foreground">Welcome to GS STORE</p>
      </div>

      {/* Hero */}
      <Card className="relative overflow-hidden border-0 p-0 shadow-glow">
        <div className="absolute inset-0 bg-gradient-primary opacity-95" />
        <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -left-6 -bottom-6 w-32 h-32 rounded-full bg-accent/30 blur-2xl" />
        <div className="relative p-5 text-primary-foreground">
          <div className="flex items-center gap-4">
            <img src={gsLogo} alt="GS STORE" className="w-20 h-20 rounded-xl object-cover shrink-0 ring-2 ring-white/30 shadow-[0_0_24px_rgba(255,140,0,0.45)]" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Flame className="w-4 h-4" />
                <span className="text-[11px] uppercase tracking-widest opacity-90">BD Server • Free Fire</span>
              </div>
              <div className="font-display font-bold text-xl leading-tight mb-1">Boost your FF profile</div>
              <div className="text-sm opacity-90 mb-3">Auto Likes ar Profile Visits — apnar UID din, package select korun!</div>
              <Link to="/dashboard/packages">
                <Button variant="secondary" size="sm" className="font-semibold">
                  <Sparkles className="w-4 h-4 mr-1" /> Browse <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </Card>

      {/* Today's delivery */}
      <Card className="bg-gradient-card border-border p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-success" />
          <h2 className="font-display font-bold text-sm">Aaj ki delivery hoyeche</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg p-3 bg-background/60 border border-primary/20">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><Heart className="w-3 h-3 text-primary"/>Likes today</div>
            <div className="font-display font-bold text-2xl text-primary mt-1">{todayLikes.toLocaleString()}</div>
          </div>
          <div className="rounded-lg p-3 bg-background/60 border border-accent/20">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><Eye className="w-3 h-3 text-accent"/>Visits today</div>
            <div className="font-display font-bold text-2xl text-accent mt-1">{todayVisits.toLocaleString()}</div>
          </div>
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

      {/* Floating Telegram Contact Button */}
      <a
        href={`https://t.me/${tgHandle}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Contact admin on Telegram"
        title={`Contact admin: ${tg}`}
        className="fixed bottom-24 right-4 z-50 w-14 h-14 rounded-full grid place-items-center bg-[#229ED9] text-white shadow-[0_0_24px_rgba(34,158,217,0.6)] ring-2 ring-[#229ED9]/40 hover:scale-110 active:scale-95 transition"
      >
        <Send className="w-6 h-6" />
        <span className="absolute inset-0 rounded-full animate-ping bg-[#229ED9]/30 -z-10" />
      </a>

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
