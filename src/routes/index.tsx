import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Flame, Zap, ShieldCheck, Clock, Wallet, Trophy } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GS STORE — Free Fire BD Auto Like Service" },
      { name: "description", content: "Buy auto likes for your Free Fire BD account. Daily delivery via secure API. Cheapest packages, instant approval." },
      { property: "og:title", content: "GS STORE" },
      { property: "og:description", content: "Free Fire BD auto like service. Daily delivery for 3-30 days." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate({ to: isAdmin ? "/admin" : "/dashboard" });
    }
  }, [user, isAdmin, loading, navigate]);

  return (
    <div className="min-h-screen bg-gradient-hero">
      <header className="px-5 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-gradient-primary grid place-items-center shadow-glow">
            <Flame className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-display font-bold text-lg">GS STORE</span>
        </Link>
        <Link to="/auth">
          <Button size="sm" className="bg-gradient-primary text-primary-foreground hover:opacity-90">Login</Button>
        </Link>
      </header>

      <section className="px-5 pt-10 pb-16 max-w-6xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-3 py-1 text-xs text-muted-foreground mb-5">
          <span className="w-2 h-2 rounded-full bg-success animate-pulse" /> BD Server • Live
        </div>
        <h1 className="text-4xl sm:text-6xl font-display font-extrabold leading-tight">
          <span className="text-gradient">Free Fire</span> Auto Likes<br/>Daily, Direct, Done.
        </h1>
        <p className="mt-5 text-muted-foreground max-w-xl mx-auto">
          Bangladesh server e Free Fire UID e prati din auto like. Ekbar order, 24 ghonta por por automatic delivery.
        </p>
        <div className="mt-7 flex justify-center gap-3">
          <Link to="/auth">
            <Button size="lg" className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90 font-semibold">
              Get Started
            </Button>
          </Link>
        </div>
      </section>

      <section className="px-5 py-10 max-w-6xl mx-auto">
        <h2 className="text-2xl font-display font-bold text-center mb-8">How it works</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: ShieldCheck, t: "1. Sign up", d: "Email diye ekta account khulun, sathe sathe approved." },
            { icon: Trophy, t: "2. Package select", d: "Apnar dorkar moto package + apnar Free Fire UID din." },
            { icon: Wallet, t: "3. bKash payment", d: "bKash e Send Money korun, TrxID + screenshot upload korun." },
            { icon: Zap, t: "4. Auto delivery", d: "Admin approve korar sathe sathe like start, prati 24h por delivery." },
          ].map((s) => (
            <Card key={s.t} className="bg-gradient-card border-border p-5 shadow-card">
              <div className="w-10 h-10 rounded-lg bg-primary/15 grid place-items-center mb-3">
                <s.icon className="w-5 h-5 text-primary" />
              </div>
              <div className="font-semibold mb-1">{s.t}</div>
              <div className="text-sm text-muted-foreground">{s.d}</div>
            </Card>
          ))}
        </div>
      </section>

      <section className="px-5 py-10 max-w-6xl mx-auto">
        <Card className="bg-gradient-card border-border p-6 shadow-card">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-accent/20 grid place-items-center shrink-0">
              <Clock className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg">Why GS STORE?</h3>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground list-disc list-inside">
                <li>BD server only, real likes via secure API</li>
                <li>24h timer countdown apnar dashboard e</li>
                <li>Prati dine ki perfect like dise full history</li>
                <li>Live banner — apnar FF profile dekhabe</li>
              </ul>
            </div>
          </div>
        </Card>
      </section>

      <footer className="px-5 py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} GS STORE. For BD server only.
      </footer>
    </div>
  );
}
