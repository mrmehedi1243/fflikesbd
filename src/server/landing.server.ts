import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function fetchLandingData() {
  const [
    { data: packages, error: packagesError },
    { data: panels, error: panelsError },
    { data: slides, error: slidesError },
    { data: settings },
    { data: guildPkgs, error: guildErr },
    { data: panelCats },
  ] =
    await Promise.all([
      supabaseAdmin
        .from("packages")
        .select("id,name,description,price_bdt,type,image_url")
        .eq("is_active", true)
        .order("sort_order"),
      supabaseAdmin
        .from("panel_packages")
        .select("id,name,description,price_bdt,video_url,image_url,apk_link,duration_label,panel_category_id")
        .eq("is_active", true)
        .order("sort_order"),
      supabaseAdmin
        .from("hero_slides")
        .select("id,image_url,link_url,title")
        .eq("is_active", true)
        .order("sort_order"),
      supabaseAdmin
        .from("app_settings")
        .select("logo_url")
        .eq("id", 1)
        .maybeSingle(),
      supabaseAdmin
        .from("guild_packages")
        .select("id,name,description,price_bdt,image_url,duration_label,bot_count")
        .eq("is_active", true)
        .order("sort_order"),
      supabaseAdmin
        .from("panel_categories")
        .select("id,name,sort_order")
        .eq("is_active", true)
        .order("sort_order"),
    ]);

  if (packagesError) throw new Error(packagesError.message);
  if (panelsError) throw new Error(panelsError.message);
  if (slidesError) throw new Error(slidesError.message);
  if (guildErr) throw new Error(guildErr.message);

  return {
    packages: packages ?? [],
    panels: panels ?? [],
    slides: slides ?? [],
    guildPackages: guildPkgs ?? [],
    panelCategories: panelCats ?? [],
    logoUrl: (settings?.logo_url as string | null) ?? null,
  };
}