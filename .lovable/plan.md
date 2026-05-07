## Scope

1. **Guild Bots** — new product category (alongside Likes / Visits / Panels).
2. **Home page** — mirror landing design (slider + product sections), black + blue theme.
3. **Drop panel KEY system** — keep panel APK + sub-categories (Root / Non-Root).
4. Bot instance card like the screenshot (logo, guild name, ID, members, leader, glory) — data scraped from `https://danger-guild-management-web.vercel.app/guild?guild_id=X&region=bd`.

---

## Database changes

- New table `guild_packages` (id, name, description, price_bdt, image_url, category `root|non_root`, duration_label, sort_order, is_active).
- New table `guild_orders` (id, user_id, guild_package_id, guild_id, trx_id, payment_screenshot_url, status `pending|approved|rejected|running|expired`, admin_note, approved_at, expires_at, last_synced_guild jsonb).
- New table `panel_categories` (id, name `Root|Non-Root|...`, sort_order) + add `panel_category_id` to `panel_packages`.
- Drop `panel_keys` table + `delivered_key`/`apk_link` mutation logic in `approve_panel_order` (panel approval just marks delivered, returns APK link from package).
- RLS: admin manages `guild_packages` / `panel_categories`; user reads own `guild_orders`, admin manages all.
- New `app_settings.bkash_number_guild` + `coupon_price` style not needed (price per package).

## Server functions / routes

- `src/server/guild.server.ts` + `guild.functions.ts`:
  - `scrapeGuild(guildId)` — server fetch the vercel page, regex/parse out name, level, members, leader, glory, logo URL. Return JSON.
  - `getMyGuildOrders()`, `createGuildOrder()`, `approveGuildOrder()`.
- Public route `/api/public/guild-info?guild_id=...` thin wrapper if dashboard needs polling.
- Update `landing.server.ts` to also return `guildPackages` + `panelCategories`.

## Frontend

- **Landing** (`src/routes/index.tsx`): add "GUILD BOTS" section after Panels. Group panels by `panel_category` chips (Root / Non-Root).
- **Home** (`src/routes/_authenticated/dashboard.index.tsx`): rebuild to mirror landing — same Hero carousel, Likes / Visits / Panels (grouped by category) / Guild Bots sections, but Buy buttons go to in-app order flow instead of `/auth`. Black bg + blue accent buttons.
- **Dashboard "Coupons" → keep**, add new tab/route **"Guild Bots"** (`dashboard.guild.tsx`):
  - Pick guild package, enter Guild ID, submit trx + screenshot.
  - After admin approval, show bot instance card matching screenshot (logo, name, ID, BD flag, members X/Y, leader, total glory, status badge, "Powered by GS STORE" footer). Auto-poll scraped guild info.
- **Admin**:
  - `admin.guild-packages.tsx` — CRUD guild packages.
  - `admin.guild-orders.tsx` — approve/reject + set expiry.
  - `admin.panel-categories.tsx` — CRUD Root/Non-Root etc.
  - Update `admin.panels.tsx` — add `panel_category_id` selector, remove key-management UI.
  - Remove panel keys admin section.

## Theme

- `src/styles.css`: lock `--background` near pure black (`oklch(0.08 0 0)`), `--primary` to vivid blue (`oklch(0.65 0.2 250)`), `--gradient-primary` blue-to-cyan. Cards: `bg-card` with subtle blue border. Buy buttons all use `bg-gradient-primary`.

## Out of scope

- Existing Like/Visit dispatch APIs, bKash flow, RupantorPay, auth.
- No real bot start/stop — "Launch Bot / Restart" buttons trigger UI feedback only (matches screenshot semantics; backend just tracks order status).

## Open assumption

- Scrape parser: I'll fetch the vercel page server-side and parse the rendered HTML / __NEXT_DATA__ JSON. If the page is fully client-rendered and lacks SSR data, I'll fall back to calling whatever JSON endpoint it uses internally (visible in network tab) — will adjust on first run.
