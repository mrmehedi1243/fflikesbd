import { createServerFn } from "@tanstack/react-start";
import { fetchLandingData } from "./landing.server";

export const getLandingData = createServerFn({ method: "GET" }).handler(async () => {
  return fetchLandingData();
});