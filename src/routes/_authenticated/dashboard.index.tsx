import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ShoppingCart, Heart, Eye, KeyRound, BadgeCheck, Tag, Users,
  Volume2, VolumeX, ChevronLeft, ChevronRight, Send,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  component: Dashboard,
});

type Pkg = { id: string; name: string; description: string | null; price_bdt: number; type: "like" | "visit"; image_url: string | null };
type Panel = { id: string; name: string; description: string | null; price_bdt: number; video_url: string | null; image_url: string | null; apk_link: string | null; duration_label: string | null; panel_category_id: string | null };
type PanelCat = { id: string; name: string };
type GuildPkg = { id: string; name: string; description: string | null; price_bdt: number; image_url: string | null; duration_label: string | null; bot_count: number };
type Slide = { id: string; image_url: string; link_url: string | null; title: string | null };

function Dashboard() {
  const { user } = useAuth();
  const [pkgs, setPkgs] = useState<Pkg[]>([]);
  const [panels, setPanels] = useState<Panel[]>([]);
  const [guildPkgs, setGuildPkgs] = useState<GuildPkg[]>([]);
  const [panelCats, setPanelCats] = useState<PanelCat[]>([]);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [tg, setTg] = useState("@proxaura");

  useEffect(() => {
    (async () => {
      const [{ data: pk }, { data: pn }, { data: sl }, { data: gp }, { data: pc }, { data: s }] = await Promise.all([
        supabase.from("packages").select("id,name,description,price_bdt,type,image_url").eq("is_active", true).order("sort_order"),
        supabase.from("panel_packages").select("id,name,description,price_bdt,video_url,image_url,apk_link,duration_label,panel_category_id").eq("is_active", true).order("sort_order"),
        supabase.from("hero_slides").select("id,image_url,link_url,title").eq("is_active", true).order("sort_order"),
        supabase.from("guild_packages").select("id,name,description,price_bdt,image_url,duration_label,bot_count").eq("is_active", true).order("sort_order"),
        supabase.from("panel_categories").select("id,name").eq("is_active", true).order("sort_order"),
        supabase.from("app_settings").select("admin_telegram").eq("id", 1).maybeSingle(),
      ]);
      setPkgs((pk ?? []) as Pkg[]);
      setPanels((pn ?? []) as Panel[]);
      setSlides((sl ?? []) as Slide[]);
      setGuildPkgs((gp ?? []) as GuildPkg[]);
      setPanelCats((pc ?? []) as PanelCat[]);
      if (s?.admin_telegram) setTg(s.admin_telegram);
    })();
  }, []);

  const likes = pkgs.filter((p) => p.type === "like");
  const visits = pkgs.filter((p) => p.type === "visit");
  const heroSlides = slides.length > 0
    ? slides.map((s) => ({ id: s.id, title: s.title ?? "", image: s.image_url, link: s.link_url }))
    : [{ id: "hero", title: `Hi ${user?.email?.split("@")[0] ?? ""} 👋`, image: null, link: null }];
  const tgHandle = tg.replace(/^@/, "");

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-8">
      <HeroCarousel slides={heroSlides} ctaTo="/dashboard/packages" />

      <h2 className="text-center font-display font-extrabold text-2xl">
        <span className="text-foreground">Our </span><span className="text-gradient">Products</span>
      </h2>
      <div className="mx-auto -mt-3 h-[2px] w-24 bg-gradient-primary rounded-full" />

      {likes.length > 0 && (
        <ProductSection title="LIKES PACKAGES" icon={Heart}>
          {likes.map((p) => <PackageCard key={p.id} pkg={p} to="/dashboard/packages" />)}
        </ProductSection>
      )}
      {visits.length > 0 && (
        <ProductSection title="VISITS PACKAGES" icon={Eye}>
          {visits.map((p) => <PackageCard key={p.id} pkg={p} to="/dashboard/packages" />)}
        </ProductSection>
      )}
      {panels.length > 0 && <PanelsByCategory panels={panels} categories={panelCats} />}
      {guildPkgs.length > 0 && (
        <ProductSection title="GUILD BOTS" icon={Users}>
          {guildPkgs.map((g) => <GuildPkgCard key={g.id} pkg={g} />)}
        </ProductSection>
      )}

      <a href={`https://t.me/${tgHandle}`} target="_blank" rel="noopener noreferrer"
        className="fixed bottom-24 right-4 z-50 w-14 h-14 rounded-full grid place-items-center bg-[#229ED9] text-white shadow-[0_0_24px_rgba(34,158,217,0.6)] ring-2 ring-[#229ED9]/40">
        <Send className="w-6 h-6" />
      </a>
    </div>
  );
}

function HeroCarousel({ slides, ctaTo }: { slides: { id: string; title: string; image: string | null; link: string | null }[]; ctaTo: string }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (slides.length <= 1) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % slides.length), 5000);
    return () => clearInterval(t);
  }, [slides.length]);
  const s = slides[idx];
  return (
    <div className="relative aspect-[16/9] sm:aspect-[21/9] rounded-2xl overflow-hidden border border-border bg-gradient-card shadow-card">
      {s.image ? (
        <img src={s.image} alt={s.title} className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-gradient-primary opacity-80" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
      {s.link && <a href={s.link} target="_blank" rel="noopener noreferrer" className="absolute inset-0 z-10" />}
      <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
        <div className="font-display font-extrabold text-lg sm:text-2xl text-gradient">{s.title}</div>
        <Link to={ctaTo}>
          <Button size="sm" className="mt-2 bg-gradient-primary text-primary-foreground font-semibold">
            <ShoppingCart className="w-4 h-4 mr-1.5" /> Browse
          </Button>
        </Link>
      </div>
      {slides.length > 1 && (
        <>
          <button type="button" onClick={() => setIdx((i) => (i - 1 + slides.length) % slides.length)} className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 grid place-items-center text-white"><ChevronLeft className="w-4 h-4" /></button>
          <button type="button" onClick={() => setIdx((i) => (i + 1) % slides.length)} className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 grid place-items-center text-white"><ChevronRight className="w-4 h-4" /></button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            {slides.map((_, i) => <button key={i} type="button" onClick={() => setIdx(i)} className={`h-1.5 rounded-full transition-all ${i === idx ? "w-6 bg-primary" : "w-1.5 bg-white/40"}`} />)}
          </div>
        </>
      )}
    </div>
  );
}

function ProductSection({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-center gap-3 my-4">
        <div className="flex-1 h-px bg-border" />
        <div className="flex items-center gap-2 font-display font-bold text-sm tracking-[0.2em]"><Icon className="w-4 h-4 text-primary" /> {title}</div>
        <div className="flex-1 h-px bg-border" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">{children}</div>
    </section>
  );
}

function PackageCard({ pkg, to }: { pkg: Pkg; to: string }) {
  const Icon = pkg.type === "visit" ? Eye : Heart;
  return (
    <Card className="bg-gradient-card border-border overflow-hidden shadow-card flex flex-col">
      <div className="px-3 py-2.5 flex items-center gap-2 border-b border-border/60">
        <div className="w-7 h-7 rounded-md bg-primary/15 grid place-items-center"><Icon className="w-4 h-4 text-primary" /></div>
        <div className="min-w-0 flex-1">
          <div className="font-display font-bold text-xs sm:text-sm truncate">{pkg.name}</div>
          <div className="text-[10px] text-success flex items-center gap-1"><BadgeCheck className="w-3 h-3" /> Verified</div>
        </div>
      </div>
      <div className="aspect-video bg-secondary/30 overflow-hidden">
        {pkg.image_url ? <img src={pkg.image_url} alt={pkg.name} className="w-full h-full object-cover" /> : <div className="w-full h-full grid place-items-center bg-gradient-primary/10"><Icon className="w-10 h-10 text-primary/60" /></div>}
      </div>
      <div className="p-3 flex-1 flex flex-col gap-2">
        {pkg.description && <div className="text-[11px] text-muted-foreground line-clamp-2">{pkg.description}</div>}
        <div className="mt-auto">
          <div className="flex items-center gap-1 text-success font-bold text-sm mb-2"><Tag className="w-4 h-4" /> From ৳{Number(pkg.price_bdt)}</div>
          <Link to={to}><Button size="sm" className="w-full bg-gradient-primary text-primary-foreground font-semibold"><ShoppingCart className="w-3.5 h-3.5 mr-1" /> Buy</Button></Link>
        </div>
      </div>
    </Card>
  );
}

function PanelCardLocal({ panel }: { panel: Panel }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  return (
    <Card className="bg-gradient-card border-border overflow-hidden shadow-card flex flex-col">
      <div className="px-3 py-2.5 flex items-center gap-2 border-b border-border/60">
        <div className="w-7 h-7 rounded-md bg-accent/15 grid place-items-center"><KeyRound className="w-4 h-4 text-accent" /></div>
        <div className="min-w-0 flex-1">
          <div className="font-display font-bold text-xs sm:text-sm truncate">{panel.name}</div>
          <div className="text-[10px] text-success flex items-center gap-1"><BadgeCheck className="w-3 h-3" /> Verified</div>
        </div>
      </div>
      <div className="relative aspect-video bg-secondary/30 overflow-hidden">
        {panel.video_url ? (
          <>
            <video ref={ref} src={panel.video_url} poster={panel.image_url ?? undefined} muted={muted} loop playsInline autoPlay className="w-full h-full object-cover" />
            <button type="button" onClick={(e) => { e.stopPropagation(); setMuted((m) => !m); }} className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-black/60 grid place-items-center text-white">
              {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
          </>
        ) : panel.image_url ? <img src={panel.image_url} alt={panel.name} className="w-full h-full object-cover" /> : <div className="w-full h-full grid place-items-center bg-gradient-primary/10"><KeyRound className="w-10 h-10 text-accent/60" /></div>}
      </div>
      <div className="p-3 flex-1 flex flex-col gap-2">
        {panel.description && <div className="text-[11px] text-muted-foreground line-clamp-2">{panel.description}</div>}
        {panel.duration_label && <div className="text-[10px] text-muted-foreground">⏱ {panel.duration_label}</div>}
        <div className="mt-auto">
          <div className="flex items-center gap-1 text-success font-bold text-sm mb-2"><Tag className="w-4 h-4" /> ৳{Number(panel.price_bdt)}</div>
          <Link to="/dashboard/panels"><Button size="sm" className="w-full bg-gradient-primary text-primary-foreground font-semibold"><ShoppingCart className="w-3.5 h-3.5 mr-1" /> Buy</Button></Link>
        </div>
      </div>
    </Card>
  );
}

function PanelsByCategory({ panels, categories }: { panels: Panel[]; categories: PanelCat[] }) {
  const grouped = categories.map((c) => ({ cat: c, items: panels.filter((p) => p.panel_category_id === c.id) })).filter((g) => g.items.length > 0);
  const others = panels.filter((p) => !p.panel_category_id);
  return (
    <ProductSection title="PANELS" icon={KeyRound}>
      {grouped.map((g) => (
        <div key={g.cat.id} className="col-span-2 lg:col-span-3">
          <div className="text-xs font-display font-bold tracking-widest text-primary mb-2">{g.cat.name.toUpperCase()}</div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">{g.items.map((p) => <PanelCardLocal key={p.id} panel={p} />)}</div>
        </div>
      ))}
      {others.length > 0 && (
        <div className="col-span-2 lg:col-span-3">
          {grouped.length > 0 && <div className="text-xs font-display font-bold tracking-widest text-muted-foreground mb-2">OTHERS</div>}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">{others.map((p) => <PanelCardLocal key={p.id} panel={p} />)}</div>
        </div>
      )}
    </ProductSection>
  );
}

function GuildPkgCard({ pkg }: { pkg: GuildPkg }) {
  return (
    <Card className="bg-gradient-card border-border overflow-hidden shadow-card flex flex-col">
      <div className="px-3 py-2.5 flex items-center gap-2 border-b border-border/60">
        <div className="w-7 h-7 rounded-md bg-primary/15 grid place-items-center"><Users className="w-4 h-4 text-primary" /></div>
        <div className="min-w-0 flex-1">
          <div className="font-display font-bold text-xs sm:text-sm truncate">{pkg.name}</div>
          <div className="text-[10px] text-success flex items-center gap-1"><BadgeCheck className="w-3 h-3" /> {pkg.bot_count} bot{pkg.bot_count > 1 ? "s" : ""}</div>
        </div>
      </div>
      <div className="aspect-video bg-secondary/30 overflow-hidden">
        {pkg.image_url ? <img src={pkg.image_url} alt={pkg.name} className="w-full h-full object-cover" /> : <div className="w-full h-full grid place-items-center bg-gradient-primary/10"><Users className="w-10 h-10 text-primary/60" /></div>}
      </div>
      <div className="p-3 flex-1 flex flex-col gap-2">
        {pkg.description && <div className="text-[11px] text-muted-foreground line-clamp-2">{pkg.description}</div>}
        {pkg.duration_label && <div className="text-[10px] text-muted-foreground">⏱ {pkg.duration_label}</div>}
        <div className="mt-auto">
          <div className="flex items-center gap-1 text-success font-bold text-sm mb-2"><Tag className="w-4 h-4" /> ৳{Number(pkg.price_bdt)}</div>
          <Link to="/dashboard/guild"><Button size="sm" className="w-full bg-gradient-primary text-primary-foreground font-semibold"><ShoppingCart className="w-3.5 h-3.5 mr-1" /> Buy</Button></Link>
        </div>
      </div>
    </Card>
  );
}
