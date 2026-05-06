import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function fetchLandingData() {
  const [
    { data: packages, error: packagesError },
    { data: panels, error: panelsError },
    { data: slides, error: slidesError },
    { data: settings },
  ] =
    await Promise.all([
      supabaseAdmin
        .from("packages")
        .select("id,name,description,price_bdt,type,image_url")
        .eq("is_active", true)
        .order("sort_order"),
      supabaseAdmin
        .from("panel_packages")
        .select("id,name,description,price_bdt,video_url,image_url,apk_link,duration_label")
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
    ]);

  if (packagesError) throw new Error(packagesError.message);
  if (panelsError) throw new Error(panelsError.message);
  if (slidesError) throw new Error(slidesError.message);

  return {
    packages: packages ?? [],
    panels: panels ?? [],
    slides: slides ?? [],
    logoUrl: (settings?.logo_url as string | null) ?? null,
  };
}