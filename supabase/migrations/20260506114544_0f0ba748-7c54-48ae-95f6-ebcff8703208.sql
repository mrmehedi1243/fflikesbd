
-- Hero slides table
CREATE TABLE public.hero_slides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  image_url TEXT NOT NULL,
  link_url TEXT,
  title TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.hero_slides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone authed reads slides" ON public.hero_slides FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "admins manage slides" ON public.hero_slides FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- App settings additions: logo + coupon prices
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS coupon_price_like NUMERIC NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS coupon_price_visit NUMERIC NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS coupon_price_panel NUMERIC NOT NULL DEFAULT 50;

-- Coupon type enum
CREATE TYPE public.coupon_type AS ENUM ('like','visit','panel');
CREATE TYPE public.coupon_order_status AS ENUM ('pending','delivered','rejected');

-- Coupon stock
CREATE TABLE public.coupons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type coupon_type NOT NULL,
  code TEXT NOT NULL,
  is_used BOOLEAN NOT NULL DEFAULT false,
  assigned_order_id UUID,
  assigned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage coupons" ON public.coupons FOR ALL USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

-- Coupon orders
CREATE TABLE public.coupon_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type coupon_type NOT NULL,
  trx_id TEXT NOT NULL,
  payment_screenshot_url TEXT,
  price_bdt NUMERIC NOT NULL,
  status coupon_order_status NOT NULL DEFAULT 'pending',
  delivered_code TEXT,
  rejection_reason TEXT,
  approved_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.coupon_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users create own coupon orders" ON public.coupon_orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users view own coupon orders" ON public.coupon_orders FOR SELECT USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'));
CREATE POLICY "admins update coupon orders" ON public.coupon_orders FOR UPDATE USING (has_role(auth.uid(),'admin'));
CREATE POLICY "admins delete coupon orders" ON public.coupon_orders FOR DELETE USING (has_role(auth.uid(),'admin'));

-- Approve coupon order RPC (mirrors approve_panel_order)
CREATE OR REPLACE FUNCTION public.approve_coupon_order(_order_id UUID, _manual_code TEXT DEFAULT NULL)
RETURNS TABLE(success BOOLEAN, code_value TEXT, message TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _is_admin BOOLEAN;
  _ord public.coupon_orders%ROWTYPE;
  _c public.coupons%ROWTYPE;
  _final TEXT;
BEGIN
  SELECT has_role(auth.uid(),'admin') INTO _is_admin;
  IF NOT _is_admin THEN RETURN QUERY SELECT false, NULL::TEXT, 'Not authorized'; RETURN; END IF;
  SELECT * INTO _ord FROM public.coupon_orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN QUERY SELECT false, NULL::TEXT, 'Order not found'; RETURN; END IF;
  IF _ord.status = 'delivered' THEN RETURN QUERY SELECT true, _ord.delivered_code, 'Already delivered'; RETURN; END IF;

  IF _manual_code IS NOT NULL AND length(trim(_manual_code)) > 0 THEN
    _final := trim(_manual_code);
  ELSE
    SELECT * INTO _c FROM public.coupons
      WHERE type = _ord.type AND is_used = false
      ORDER BY created_at ASC LIMIT 1 FOR UPDATE SKIP LOCKED;
    IF NOT FOUND THEN
      RETURN QUERY SELECT false, NULL::TEXT, 'No coupons in stock for this type. Add codes or supply manual.'; RETURN;
    END IF;
    UPDATE public.coupons SET is_used = true, assigned_order_id = _order_id, assigned_at = now() WHERE id = _c.id;
    _final := _c.code;
  END IF;

  UPDATE public.coupon_orders
    SET status = 'delivered', delivered_code = _final,
        approved_at = COALESCE(approved_at, now()), delivered_at = now(), updated_at = now()
    WHERE id = _order_id;
  RETURN QUERY SELECT true, _final, 'Delivered';
END; $$;
