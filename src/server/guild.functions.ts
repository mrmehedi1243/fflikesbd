import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { fetchGuildInfo } from "./guild.server";

export const getGuildInfo = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ guildId: z.string().min(3).max(32) }).parse(data))
  .handler(async ({ data }) => {
    const info = await fetchGuildInfo(data.guildId, "bd");
    return { info };
  });