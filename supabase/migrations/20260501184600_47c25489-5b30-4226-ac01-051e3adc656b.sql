-- Panel packages: panel products with video & APK link
CREATE TABLE public.panel_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price_bdt NUMERIC NOT NULL,
  video_url TEXT,
  image_url TEXT,
  apk_link TEXT,
  duration_label TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.panel_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone authed reads panel packages" ON public.panel_packages FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "admins manage panel packages" ON public.panel_packages FOR ALL USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_panel_packages_updated BEFORE UPDATE ON public.panel_packages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Panel keys: stock pool
CREATE TABLE public.panel_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  panel_package_id UUID NOT NULL REFERENCES public.panel_packages(id) ON DELETE CASCADE,
  key_value TEXT NOT NULL,
  is_used BOOLEAN NOT NULL DEFAULT false,
  assigned_order_id UUID,
  assigned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.panel_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage panel keys" ON public.panel_keys FOR ALL USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE INDEX idx_panel_keys_pkg_unused ON public.panel_keys(panel_package_id) WHERE is_used = false;

-- Panel orders
CREATE TYPE public.panel_order_status AS ENUM ('pending','approved','rejected','delivered');
CREATE TABLE public.panel_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  panel_package_id UUID NOT NULL REFERENCES public.panel_packages(id) ON DELETE RESTRICT,
  trx_id TEXT NOT NULL,
  payment_screenshot_url TEXT,
  status public.panel_order_status NOT NULL DEFAULT 'pending',
  delivered_key TEXT,
  apk_link TEXT,
  admin_note TEXT,
  rejection_reason TEXT,
  approved_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.panel_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users create own panel orders" ON public.panel_orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users view own panel orders" ON public.panel_orders FOR SELECT USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'));
CREATE POLICY "admins update panel orders" ON public.panel_orders FOR UPDATE USING (has_role(auth.uid(),'admin'));
CREATE POLICY "admins delete panel orders" ON public.panel_orders FOR DELETE USING (has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_panel_orders_updated BEFORE UPDATE ON public.panel_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Approve & auto-assign key function
CREATE OR REPLACE FUNCTION public.approve_panel_order(_order_id UUID, _manual_key TEXT DEFAULT NULL)
RETURNS TABLE(success BOOLEAN, key_value TEXT, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _is_admin BOOLEAN;
  _ord public.panel_orders%ROWTYPE;
  _pkg public.panel_packages%ROWTYPE;
  _key public.panel_keys%ROWTYPE;
  _final_key TEXT;
BEGIN
  SELECT has_role(auth.uid(),'admin') INTO _is_admin;
  IF NOT _is_admin THEN
    RETURN QUERY SELECT false, NULL::TEXT, 'Not authorized'; RETURN;
  END IF;
  SELECT * INTO _ord FROM public.panel_orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN QUERY SELECT false, NULL::TEXT, 'Order not found'; RETURN; END IF;
  IF _ord.status = 'delivered' THEN RETURN QUERY SELECT true, _ord.delivered_key, 'Already delivered'; RETURN; END IF;
  SELECT * INTO _pkg FROM public.panel_packages WHERE id = _ord.panel_package_id;

  IF _manual_key IS NOT NULL AND length(trim(_manual_key)) > 0 THEN
    _final_key := trim(_manual_key);
  ELSE
    SELECT * INTO _key FROM public.panel_keys
      WHERE panel_package_id = _ord.panel_package_id AND is_used = false
      ORDER BY created_at ASC LIMIT 1 FOR UPDATE SKIP LOCKED;
    IF NOT FOUND THEN
      RETURN QUERY SELECT false, NULL::TEXT, 'No keys available in stock. Add keys or provide manual key.'; RETURN;
    END IF;
    UPDATE public.panel_keys SET is_used = true, assigned_order_id = _order_id, assigned_at = now() WHERE id = _key.id;
    _final_key := _key.key_value;
  END IF;

  UPDATE public.panel_orders
    SET status = 'delivered', delivered_key = _final_key, apk_link = _pkg.apk_link,
        approved_at = COALESCE(approved_at, now()), delivered_at = now()
    WHERE id = _order_id;
  RETURN QUERY SELECT true, _final_key, 'Delivered';
END;
$$;
GRANT EXECUTE ON FUNCTION public.approve_panel_order(UUID, TEXT) TO authenticated;