
-- Panel categories
CREATE TABLE public.panel_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.panel_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone authed reads panel_categories" ON public.panel_categories FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "admins manage panel_categories" ON public.panel_categories FOR ALL USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
INSERT INTO public.panel_categories (name, sort_order) VALUES ('Root', 1), ('Non-Root', 2);

ALTER TABLE public.panel_packages ADD COLUMN panel_category_id uuid REFERENCES public.panel_categories(id) ON DELETE SET NULL;

-- Guild packages
CREATE TABLE public.guild_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price_bdt numeric NOT NULL,
  image_url text,
  duration_label text,
  bot_count integer NOT NULL DEFAULT 1,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.guild_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone authed reads guild_packages" ON public.guild_packages FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "admins manage guild_packages" ON public.guild_packages FOR ALL USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_guild_packages_updated BEFORE UPDATE ON public.guild_packages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Guild orders
CREATE TYPE public.guild_order_status AS ENUM ('pending','approved','rejected','running','expired');

CREATE TABLE public.guild_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  guild_package_id uuid NOT NULL REFERENCES public.guild_packages(id) ON DELETE RESTRICT,
  guild_id text NOT NULL,
  trx_id text NOT NULL,
  payment_screenshot_url text,
  status public.guild_order_status NOT NULL DEFAULT 'pending',
  admin_note text,
  rejection_reason text,
  approved_at timestamptz,
  expires_at timestamptz,
  last_synced_guild jsonb,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.guild_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users create own guild orders" ON public.guild_orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users view own guild orders" ON public.guild_orders FOR SELECT USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'));
CREATE POLICY "admins update guild orders" ON public.guild_orders FOR UPDATE USING (has_role(auth.uid(),'admin'));
CREATE POLICY "admins delete guild orders" ON public.guild_orders FOR DELETE USING (has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_guild_orders_updated BEFORE UPDATE ON public.guild_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Bkash for guild
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS bkash_number_guild text NOT NULL DEFAULT '';
