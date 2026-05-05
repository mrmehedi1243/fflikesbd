import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function fetchLandingData() {
  const [{ data: packages, error: packagesError }, { data: panels, error: panelsError }] =
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
    ]);

  if (packagesError) throw new Error(packagesError.message);
  if (panelsError) throw new Error(panelsError.message);

  return {
    packages: packages ?? [],
    panels: panels ?? [],
  };
}