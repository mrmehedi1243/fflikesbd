
-- Roles enum + table
create type public.app_role as enum ('admin', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null default 'user',
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;

create policy "users can view own roles" on public.user_roles for select using (auth.uid() = user_id);
create policy "admins manage roles" on public.user_roles for all using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- Profiles
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  email text,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "users view own profile" on public.profiles for select using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));
create policy "users update own profile" on public.profiles for update using (auth.uid() = user_id);
create policy "users insert own profile" on public.profiles for insert with check (auth.uid() = user_id);
create policy "admins view all profiles" on public.profiles for select using (public.has_role(auth.uid(), 'admin'));

-- updated_at trigger fn
create or replace function public.update_updated_at_column()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

create trigger update_profiles_updated_at before update on public.profiles
for each row execute function public.update_updated_at_column();

-- New user trigger: profile + default role
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)));
  insert into public.user_roles (user_id, role) values (new.id, 'user');
  return new;
end; $$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- Packages
create table public.packages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  likes_per_day integer not null,
  duration_days integer not null,
  price_bdt numeric(10,2) not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.packages enable row level security;
create trigger update_packages_updated_at before update on public.packages
for each row execute function public.update_updated_at_column();

create policy "anyone authed reads packages" on public.packages for select using (auth.uid() is not null);
create policy "admins manage packages" on public.packages for all using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- Orders
create type public.order_status as enum ('pending', 'approved', 'rejected', 'completed');

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  package_id uuid references public.packages(id) on delete restrict not null,
  ff_uid text not null,
  trx_id text not null,
  payment_screenshot_url text,
  status order_status not null default 'pending',
  likes_per_day integer not null,
  duration_days integer not null,
  days_completed integer not null default 0,
  total_likes_sent integer not null default 0,
  approved_at timestamptz,
  next_run_at timestamptz,
  rejection_reason text,
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.orders enable row level security;
create trigger update_orders_updated_at before update on public.orders
for each row execute function public.update_updated_at_column();

create index orders_user_id_idx on public.orders(user_id);
create index orders_status_idx on public.orders(status);
create index orders_next_run_idx on public.orders(next_run_at) where status = 'approved';

create policy "users view own orders" on public.orders for select using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));
create policy "users create own orders" on public.orders for insert with check (auth.uid() = user_id);
create policy "admins update orders" on public.orders for update using (public.has_role(auth.uid(), 'admin'));
create policy "admins delete orders" on public.orders for delete using (public.has_role(auth.uid(), 'admin'));

-- Like logs
create table public.like_logs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade not null,
  run_date date not null default current_date,
  likes_sent integer not null default 0,
  api_response jsonb,
  success boolean not null default true,
  error_message text,
  created_at timestamptz not null default now()
);
alter table public.like_logs enable row level security;
create index like_logs_order_idx on public.like_logs(order_id, created_at desc);

create policy "users view own logs" on public.like_logs for select using (
  exists (select 1 from public.orders o where o.id = like_logs.order_id and (o.user_id = auth.uid() or public.has_role(auth.uid(), 'admin')))
);
create policy "admins manage logs" on public.like_logs for all using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- App settings (single-row)
create table public.app_settings (
  id integer primary key default 1,
  banner_api_url text not null,
  like_api_url text not null,
  bkash_number text not null,
  payment_instructions text not null,
  updated_at timestamptz not null default now(),
  constraint single_row check (id = 1)
);
alter table public.app_settings enable row level security;
create trigger update_app_settings_updated_at before update on public.app_settings
for each row execute function public.update_updated_at_column();

create policy "anyone authed reads settings" on public.app_settings for select using (auth.uid() is not null);
create policy "admins update settings" on public.app_settings for update using (public.has_role(auth.uid(), 'admin'));
create policy "admins insert settings" on public.app_settings for insert with check (public.has_role(auth.uid(), 'admin'));

-- Seed default settings
insert into public.app_settings (id, banner_api_url, like_api_url, bkash_number, payment_instructions)
values (
  1,
  'https://public-url-host--mehedixffx.replit.app/banner/profile?uid={uid}',
  'https://public-url-host--mehedixffx.replit.app/free-like/like?uid={uid}&region_name=bd',
  '01723124652',
  E'1. bKash Send Money korun amader number e: {bkash}\n2. Amount ta exact pathaben\n3. TrxID ta copy korun\n4. Payment screenshot save korun\n5. Form e TrxID + screenshot upload korun\n6. Admin verify korar pore auto like start hobe'
);

-- Seed starter packs
insert into public.packages (name, description, likes_per_day, duration_days, price_bdt, sort_order) values
('Starter Pack', 'Daily 100 likes for 3 days', 100, 3, 30, 1),
('Basic Pack', 'Daily 100 likes for 7 days', 100, 7, 60, 2),
('Pro Pack', 'Daily 100 likes for 15 days', 100, 15, 120, 3),
('Premium Pack', 'Daily 100 likes for 30 days', 100, 30, 220, 4);

-- Storage bucket for payment screenshots
insert into storage.buckets (id, name, public) values ('payment-screenshots', 'payment-screenshots', false);

create policy "users upload own screenshots" on storage.objects for insert
with check (bucket_id = 'payment-screenshots' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "users read own screenshots" on storage.objects for select
using (bucket_id = 'payment-screenshots' and (auth.uid()::text = (storage.foldername(name))[1] or public.has_role(auth.uid(), 'admin')));

create policy "admins read all screenshots" on storage.objects for select
using (bucket_id = 'payment-screenshots' and public.has_role(auth.uid(), 'admin'));
