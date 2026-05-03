import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Flame, ShoppingCart, Settings as SettingsIcon, User as UserIcon,
  ShieldCheck, Rocket, Headphones, Heart, Eye, KeyRound,
  Volume2, VolumeX, ChevronLeft, ChevronRight, BadgeCheck, Tag, Sparkles,
} from "lucide-react";
import gsLogo from "@/assets/gs-logo.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GS STORE — Free Fire BD Likes, Visits & Panels" },
      { name: "description", content: "Buy Free Fire BD auto likes, profile visits and premium panels. Instant key delivery, secure bKash payment." },
      { property: "og:title", content: "GS STORE" },
      { property: "og:description", content: "Free Fire BD likes, visits & panels — instant delivery." },
    ],
  }),
  component: Landing,
});

type Pkg = {
  id: string;
  name: string;
  description: string | null;
  price_bdt: number;
  type: "like" | "visit";
  image_url: string | null;
};
type Panel = {
  id: string;
  name: string;
  description: string | null;
  price_bdt: number;
  video_url: string | null;
  image_url: string | null;
  apk_link: string | null;
  duration_label: string | null;
};

function Landing() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [pkgs, setPkgs] = useState<Pkg[]>([]);
  const [panels, setPanels] = useState<Panel[]>([]);

  useEffect(() => {
    if (!loading && user) {
      navigate({ to: isAdmin ? "/admin" : "/dashboard" });
    }
  }, [user, isAdmin, loading, navigate]);

  useEffect(() => {
    (async () => {
      const [{ data: p }, { data: pn }] = await Promise.all([
        supabase.from("packages").select("id,name,description,price_bdt,type,image_url").eq("is_active", true).order("sort_order"),
        supabase.from("panel_packages").select("id,name,description,price_bdt,video_url,image_url,apk_link,duration_label").eq("is_active", true).order("sort_order"),
      ]);
      setPkgs((p ?? []) as Pkg[]);
      setPanels((pn ?? []) as Panel[]);
    })();
  }, []);

  const likes = pkgs.filter((p) => p.type === "like");
  const visits = pkgs.filter((p) => p.type === "visit");

  // Hero carousel slides — built from real panels (fallback static)
  const slides = panels.slice(0, 5).map((p) => ({
    id: p.id,
    title: p.name,
    image: p.image_url,
    video: p.video_url,
  }));
  const heroSlides = slides.length > 0 ? slides : [{ id: "fallback", title: "Free Fire APKMOD & Panels", image: null, video: null }];

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/70 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 min-w-0">
            <img src={gsLogo} alt="GS STORE" className="w-9 h-9 rounded-lg object-cover ring-1 ring-primary/40" />
            <div className="font-display font-bold text-base sm:text-lg truncate">GS STORE</div>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/auth">
              <Button size="icon" className="bg-gradient-primary text-primary-foreground h-9 w-9 rounded-lg">
                <UserIcon className="w-4 h-4" />
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="icon" variant="secondary" className="h-9 w-9 rounded-lg">
                <SettingsIcon className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero carousel */}
      <section className="px-4 pt-4 max-w-6xl mx-auto">
        <HeroCarousel slides={heroSlides} />
      </section>

      {/* Our Products */}
      <section className="px-4 mt-8 max-w-6xl mx-auto">
        <h2 className="text-center font-display font-extrabold text-2xl sm:text-3xl">
          <span className="text-foreground">Our </span>
          <span className="text-gradient">Products</span>
        </h2>
        <div className="mx-auto mt-2 h-[2px] w-24 bg-gradient-primary rounded-full" />
      </section>

      {/* Likes section */}
      {likes.length > 0 && (
        <ProductSection title="LIKES PACKAGES" icon={Heart}>
          {likes.map((p) => (
            <PackageCard key={p.id} pkg={p} />
          ))}
        </ProductSection>
      )}

      {/* Visits section */}
      {visits.length > 0 && (
        <ProductSection title="VISITS PACKAGES" icon={Eye}>
          {visits.map((p) => (
            <PackageCard key={p.id} pkg={p} />
          ))}
        </ProductSection>
      )}

      {/* Panels section */}
      {panels.length > 0 && (
        <ProductSection title="PANELS" icon={KeyRound}>
          {panels.map((p) => (
            <PanelCard key={p.id} panel={p} />
          ))}
        </ProductSection>
      )}

      {/* Why choose us */}
      <section className="px-4 mt-12 max-w-6xl mx-auto">
        <h2 className="text-center font-display font-extrabold text-2xl sm:text-3xl">
          WHY CHOOSE <span className="text-gradient">US?</span>
        </h2>
        <p className="text-center text-sm text-muted-foreground mt-2 max-w-md mx-auto">
          Trusted by thousands of gamers in BD for premium quality and instant delivery
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {[
            { icon: Rocket, t: "INSTANT DELIVERY", d: "Approve hole sathe sathe key/likes/visits delivery" },
            { icon: ShieldCheck, t: "100% SECURE", d: "BD server only — secure API + verified payments" },
            { icon: Headphones, t: "24/7 SUPPORT", d: "Telegram support — jokhon dorkar tokhon ami achi" },
            { icon: BadgeCheck, t: "VERIFIED PANELS", d: "Pati panel verified, latest APK link instant" },
            { icon: Tag, t: "BEST PRICE", d: "Bangladesh er shobcheye komor daam" },
            { icon: Sparkles, t: "DAILY DELIVERY", d: "Likes packages prati 24h por auto delivery" },
          ].map((f) => (
            <Card key={f.t} className="bg-gradient-card border-border p-5 text-center">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-primary grid place-items-center shadow-glow mb-3">
                <f.icon className="w-7 h-7 text-primary-foreground" />
              </div>
              <div className="font-display font-bold text-sm mb-1">{f.t}</div>
              <div className="text-xs text-muted-foreground">{f.d}</div>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 mt-12 max-w-3xl mx-auto">
        <Card className="bg-gradient-card border-border p-6 text-center">
          <div className="font-display font-bold text-xl mb-2">Ready to boost your account?</div>
          <p className="text-sm text-muted-foreground mb-4">Login kore order korun — pati 24h instant delivery</p>
          <Link to="/auth">
            <Button size="lg" className="bg-gradient-primary text-primary-foreground font-semibold">
              <Flame className="w-4 h-4 mr-2" /> Get Started
            </Button>
          </Link>
        </Card>
      </section>

      <footer className="px-4 py-8 mt-12 text-center text-xs text-muted-foreground border-t border-border">
        © {new Date().getFullYear()} GS STORE. For BD server only.
      </footer>

      {/* Floating support */}
      <Link
        to="/auth"
        aria-label="Support"
        className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full grid place-items-center bg-gradient-primary text-primary-foreground shadow-glow ring-2 ring-primary/40 hover:scale-110 active:scale-95 transition"
      >
        <Headphones className="w-6 h-6" />
        <span className="absolute inset-0 rounded-full animate-ping bg-primary/30 -z-10" />
      </Link>
    </div>
  );
}

function HeroCarousel({ slides }: { slides: { id: string; title: string; image: string | null; video: string | null }[] }) {
  const [idx, setIdx] = useState(0);
  const [muted, setMuted] = useState(true);
  useEffect(() => {
    if (slides.length <= 1) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % slides.length), 5000);
    return () => clearInterval(t);
  }, [slides.length]);
  const s = slides[idx];
  return (
    <div className="relative aspect-[16/9] sm:aspect-[21/9] rounded-2xl overflow-hidden border border-border bg-gradient-card shadow-card">
      {s.video ? (
        <video src={s.video} poster={s.image ?? undefined} autoPlay loop playsInline muted={muted} className="absolute inset-0 w-full h-full object-cover" />
      ) : s.image ? (
        <img src={s.image} alt={s.title} className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-gradient-primary opacity-80" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
        <div className="font-display font-extrabold text-lg sm:text-2xl text-gradient">{s.title}</div>
        <Link to="/auth">
          <Button size="sm" className="mt-2 bg-gradient-primary text-primary-foreground font-semibold">
            <ShoppingCart className="w-4 h-4 mr-1.5" /> Buy Now
          </Button>
        </Link>
      </div>
      {s.video && (
        <button
          type="button"
          onClick={() => setMuted((m) => !m)}
          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/60 backdrop-blur grid place-items-center text-white"
          aria-label={muted ? "Unmute" : "Mute"}
        >
          {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      )}
      {slides.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => setIdx((i) => (i - 1 + slides.length) % slides.length)}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 backdrop-blur grid place-items-center text-white hover:bg-black/70"
            aria-label="Previous"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setIdx((i) => (i + 1) % slides.length)}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 backdrop-blur grid place-items-center text-white hover:bg-black/70"
            aria-label="Next"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIdx(i)}
                className={`h-1.5 rounded-full transition-all ${i === idx ? "w-6 bg-primary" : "w-1.5 bg-white/40"}`}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ProductSection({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <section className="px-4 mt-8 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-border" />
        <div className="flex items-center gap-2 font-display font-bold text-sm tracking-[0.2em] text-foreground">
          <Icon className="w-4 h-4 text-primary" /> {title}
        </div>
        <div className="flex-1 h-px bg-border" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">{children}</div>
    </section>
  );
}

function PackageCard({ pkg }: { pkg: Pkg }) {
  const Icon = pkg.type === "visit" ? Eye : Heart;
  return (
    <Card className="bg-gradient-card border-border overflow-hidden shadow-card flex flex-col">
      <div className="px-3 py-2.5 flex items-center gap-2 border-b border-border/60">
        <div className="w-7 h-7 rounded-md bg-primary/15 grid place-items-center">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-display font-bold text-xs sm:text-sm truncate">{pkg.name}</div>
          <div className="text-[10px] text-success flex items-center gap-1"><BadgeCheck className="w-3 h-3" /> Verified</div>
        </div>
      </div>
      <div className="aspect-video bg-secondary/30 overflow-hidden">
        {pkg.image_url ? (
          <img src={pkg.image_url} alt={pkg.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full grid place-items-center bg-gradient-primary/10">
            <Icon className="w-10 h-10 text-primary/60" />
          </div>
        )}
      </div>
      <div className="p-3 flex-1 flex flex-col gap-2">
        {pkg.description && <div className="text-[11px] text-muted-foreground line-clamp-2">{pkg.description}</div>}
        <div className="mt-auto">
          <div className="flex items-center gap-1 text-success font-bold text-sm mb-2">
            <Tag className="w-4 h-4" /> From ৳{Number(pkg.price_bdt)}
          </div>
          <Link to="/auth">
            <Button size="sm" className="w-full bg-gradient-primary text-primary-foreground font-semibold">
              <ShoppingCart className="w-3.5 h-3.5 mr-1" /> Buy
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}

function PanelCard({ panel }: { panel: Panel }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  return (
    <Card className="bg-gradient-card border-border overflow-hidden shadow-card flex flex-col">
      <div className="px-3 py-2.5 flex items-center gap-2 border-b border-border/60">
        <div className="w-7 h-7 rounded-md bg-accent/15 grid place-items-center">
          <KeyRound className="w-4 h-4 text-accent" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-display font-bold text-xs sm:text-sm truncate">{panel.name}</div>
          <div className="text-[10px] text-success flex items-center gap-1"><BadgeCheck className="w-3 h-3" /> Verified</div>
        </div>
      </div>
      <div className="relative aspect-video bg-secondary/30 overflow-hidden">
        {panel.video_url ? (
          <>
            <video
              ref={ref}
              src={panel.video_url}
              poster={panel.image_url ?? undefined}
              muted={muted}
              loop
              playsInline
              autoPlay
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setMuted((m) => !m); }}
              className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-black/60 backdrop-blur grid place-items-center text-white"
              aria-label={muted ? "Unmute" : "Mute"}
            >
              {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
          </>
        ) : panel.image_url ? (
          <img src={panel.image_url} alt={panel.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full grid place-items-center bg-gradient-primary/10">
            <KeyRound className="w-10 h-10 text-accent/60" />
          </div>
        )}
      </div>
      <div className="p-3 flex-1 flex flex-col gap-2">
        {panel.description && <div className="text-[11px] text-muted-foreground line-clamp-2">{panel.description}</div>}
        {panel.duration_label && <div className="text-[10px] text-muted-foreground">⏱ {panel.duration_label}</div>}
        <div className="mt-auto">
          <div className="flex items-center gap-1 text-success font-bold text-sm mb-2">
            <Tag className="w-4 h-4" /> From ৳{Number(panel.price_bdt)}
          </div>
          <Link to="/auth">
            <Button size="sm" className="w-full bg-gradient-primary text-primary-foreground font-semibold">
              <ShoppingCart className="w-3.5 h-3.5 mr-1" /> Buy
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}
