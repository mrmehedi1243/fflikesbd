## Scope (only adds, kichu ager jinish change hobe na)

### 1. Hero Slider (admin manage)
- New table `hero_slides`: `image_url`, `link_url` (optional), `title` (optional), `sort_order`, `is_active`
- Storage path under existing public bucket `package-images` → `slides/`
- Admin route: `/admin/slider` — list, add, edit, delete, toggle active, upload image, set link
- Landing `HeroCarousel`: slides ekhon `hero_slides` theke ashbe (panel fallback rakhi). Image click → `link_url`
- `getLandingData()` server function update kore slides return

### 2. Logo upload (admin)
- `app_settings.logo_url` column add
- Admin Settings page e logo upload field add
- AppShell ar Landing header e DB logo show korbe (fallback: existing `gs-logo.jpg`)
- Public landing er jonno `getLandingData()` te logo url return

### 3. Category icon image
- `categories` table e already `image_url` ase — no change. Landing page e category list e icon show korbo (jodi visible kora chao). For now eta skip kortei pari karon landing e currently category section nai. Confirm ki landing e category cards add korte hobe?

### 4. Coupon system (per type: like / visit / panel)
Panel keys-er moto generic "coupon/code" delivery system:
- New table `coupons`: `type` (like/visit/panel), `code`, `is_used`, `assigned_order_id`, `category_id` (optional, niche scope korar jonno)
- New table `coupon_orders`: user order for a coupon — `user_id`, `type`, `category_id`, `trx_id`, `payment_screenshot_url`, `status` (pending/delivered/rejected), `delivered_code`, `price_bdt`
- Admin theke:
  - Bulk add coupons (per type, optionally per category)
  - View coupon orders, approve (auto-pull from stock or paste manual code), reject
  - On/off toggle per coupon stock
- User dashboard e ek ta "Coupons" tab — type select, request submit, payment screenshot, then admin approve hole code dekhabe
- Per type pricing: `app_settings` te `coupon_price_like`, `coupon_price_visit`, `coupon_price_panel` rakhi (or per-coupon?); ami simple `app_settings` route niye jachhi

### Files
- New migration: hero_slides, coupons, coupon_orders, app_settings columns
- `src/server/landing.server.ts` — slides + logo return
- `src/routes/index.tsx` — DB slides + DB logo
- `src/components/AppShell.tsx` — DB logo (optional)
- `src/routes/_authenticated/admin.slider.tsx` — NEW
- `src/routes/_authenticated/admin.coupons.tsx` — NEW (packages + key stock + orders, panel.tsx er moto)
- `src/routes/_authenticated/dashboard.coupons.tsx` — NEW user-facing
- `src/routes/_authenticated/admin.settings.tsx` — logo upload + coupon prices
- AppShell admin nav e Slider + Coupons add

### Out of scope (change korbo na)
- Likes/Visits API flow, bKash payment, panel key flow, RupantorPay (already removed)
- Existing admin Categories/Packages/Panels pages
- Existing user dashboard.packages / panels flows

---

**Confirm plz:**
1. Coupon per category-o filter chao naki shudhu per type (like/visit/panel)?
2. Coupon er price ki fixed (admin settings e), naki per coupon batch e admin price set korbe?
3. Landing e ki category tile section add korbo, ar admin theke category icon edit korle oikhane dekhabe?

Approve korle ami sob ek shathe baniye debo.