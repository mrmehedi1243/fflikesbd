import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type GuildInfo = {
  GuildId: number | string;
  GuildName: string;
  GuildLevel: number;
  GuildRegion: string;
  GuildSlogan: string | null;
  AvatarName: string | null;
  CurrentMembers: number;
  MaxMembers: number;
  TotalActivityPoints: number;
  WeeklyActivityPoints: number;
  GuildLeader: { Name: string; Uid: string; Level: number } | null;
  status: string;
};

export async function fetchGuildInfo(guildId: string, region = "bd"): Promise<GuildInfo | null> {
  const url = `https://danger-guild-management-web.vercel.app/guild?guild_id=${encodeURIComponent(guildId)}&region=${encodeURIComponent(region)}`;
  try {
    const r = await fetch(url, { headers: { Accept: "application/json" } });
    if (!r.ok) return null;
    const j = (await r.json()) as GuildInfo;
    if ((j as any).status !== "success") return null;
    return j;
  } catch {
    return null;
  }
}

export async function fetchGuildLandingData() {
  const { data, error } = await supabaseAdmin
    .from("guild_packages")
    .select("id,name,description,price_bdt,image_url,duration_label,bot_count")
    .eq("is_active", true)
    .order("sort_order");
  if (error) throw new Error(error.message);
  return data ?? [];
}