ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS rupantor_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_provider text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_ref text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_url text;
CREATE INDEX IF NOT EXISTS idx_orders_payment_ref ON public.orders(payment_ref);