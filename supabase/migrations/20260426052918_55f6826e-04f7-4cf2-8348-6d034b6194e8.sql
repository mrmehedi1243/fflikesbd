-- Enum for package/order type
DO $$ BEGIN
  CREATE TYPE public.package_type AS ENUM ('like', 'visit');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Categories
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  image_url text,
  type public.package_type NOT NULL DEFAULT 'like',
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone authed reads categories" ON public.categories FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "admins manage categories" ON public.categories FOR ALL USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_categories_updated BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Packages: add type, visits, image, category link
ALTER TABLE public.packages
  ADD COLUMN IF NOT EXISTS type public.package_type NOT NULL DEFAULT 'like',
  ADD COLUMN IF NOT EXISTS visits_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL;

-- Orders: add type + visit tracking
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS type public.package_type NOT NULL DEFAULT 'like',
  ADD COLUMN IF NOT EXISTS visits_target int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS visits_delivered int NOT NULL DEFAULT 0;

-- App settings: visit bKash + visit API URL
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS bkash_number_visit text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS visit_api_url text NOT NULL DEFAULT '';

-- Visit logs
CREATE TABLE IF NOT EXISTS public.visit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  visits_sent int NOT NULL DEFAULT 0,
  success boolean NOT NULL DEFAULT true,
  error_message text,
  api_response jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.visit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users view own visit logs" ON public.visit_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = visit_logs.order_id AND (o.user_id = auth.uid() OR has_role(auth.uid(),'admin')))
);
CREATE POLICY "admins manage visit logs" ON public.visit_logs FOR ALL USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

-- Storage bucket for category/package images
INSERT INTO storage.buckets (id, name, public) VALUES ('package-images','package-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "package images public read" ON storage.objects FOR SELECT USING (bucket_id = 'package-images');
CREATE POLICY "admins upload package images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'package-images' AND has_role(auth.uid(),'admin'));
CREATE POLICY "admins update package images" ON storage.objects FOR UPDATE USING (bucket_id = 'package-images' AND has_role(auth.uid(),'admin'));
CREATE POLICY "admins delete package images" ON storage.objects FOR DELETE USING (bucket_id = 'package-images' AND has_role(auth.uid(),'admin'));