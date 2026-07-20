-- 012_chat_moderation.sql
-- v2.9.0 — BUG #14: Sohbet moderasyonu (Google Play UGC politikası gereği)
--
-- İçerik:
-- 1. chat_reports tablosu — bir kullanıcının başka kullanıcının mesajını bildirmesi
-- 2. blocked_users tablosu — bir kullanıcının başka kullanıcıyı engellemesi
-- 3. RLS politikaları — sadece kendi kayıtlarını ekleyebilir/silebilir
--
-- Bu tablolar match-chat.tsx ve matchmaking.ts tarafından kullanılır.

-- =====================================================================
-- 1. chat_reports — mesaj bildirimleri
-- =====================================================================
create table if not exists public.chat_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reported_user_id uuid not null references auth.users(id) on delete cascade,
  reported_message text not null,
  match_id text not null,
  reported_at timestamptz not null default now(),
  status text not null default 'pending'  -- pending | reviewed | dismissed
);

comment on table public.chat_reports is
  'Maç sohbetinde bir kullanıcının başka kullanıcının mesajını bildirmesi. Modere etmek için kullanılır.';

-- Tekrarlı bildirim önle — aynı kullanıcı aynı mesajı aynı maçta 1 kez bildirir
create unique index if not exists chat_reports_unique_idx
  on public.chat_reports (reporter_id, reported_user_id, match_id, reported_message);

-- Moderatör için indeksler
create index if not exists chat_reports_status_idx on public.chat_reports (status, reported_at);
create index if not exists chat_reports_reported_user_idx on public.chat_reports (reported_user_id);

-- =====================================================================
-- 2. blocked_users — kullanıcı engelleme
-- =====================================================================
create table if not exists public.blocked_users (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  blocked_at timestamptz not null default now(),
  unique (blocker_id, blocked_id)
);

comment on table public.blocked_users is
  'Bir kullanıcının başka bir kullanıcıyı engellemesi. Eşleştirme sırasında bu kullanıcılarla bir daha eşleşilmez.';

-- Hızlı sorgu: "Benim engellediklerim"
create index if not exists blocked_users_blocker_idx on public.blocked_users (blocker_id);
-- Hızlı sorgu: "Beni engelleyenler"
create index if not exists blocked_users_blocked_idx on public.blocked_users (blocked_id);

-- =====================================================================
-- 3. RLS Politikaları
-- =====================================================================
alter table public.chat_reports enable row level security;
alter table public.blocked_users enable row level security;

-- chat_reports: bir kullanıcı sadece kendi bildirimlerini görebilir ve ekleyebilir
drop policy if exists "chat_reports_select_own" on public.chat_reports;
create policy "chat_reports_select_own" on public.chat_reports
  for select using (auth.uid() = reporter_id);

drop policy if exists "chat_reports_insert_own" on public.chat_reports;
create policy "chat_reports_insert_own" on public.chat_reports
  for insert with check (auth.uid() = reporter_id);

-- chat_reports delete/update: kullanıcılar silemez (moderatör Süper Admin arayüzünden silecek)
-- Bu yüzden policy tanımlamıyoruz — sadece service_role erişebilir.

-- blocked_users: bir kullanıcı kendi engellediklerini görebilir, ekleyebilir, silebilir
drop policy if exists "blocked_users_select_own" on public.blocked_users;
create policy "blocked_users_select_own" on public.blocked_users
  for select using (auth.uid() = blocker_id);

drop policy if exists "blocked_users_insert_own" on public.blocked_users;
create policy "blocked_users_insert_own" on public.blocked_users
  for insert with check (auth.uid() = blocker_id);

drop policy if exists "blocked_users_delete_own" on public.blocked_users;
create policy "blocked_users_delete_own" on public.blocked_users
  for delete using (auth.uid() = blocker_id);

-- =====================================================================
-- 4. Yardımcı RPC: kullanıcının engellenen listesini getir
-- =====================================================================
-- Bu RPC matchmaking.ts'de çağrılır — engellenen kullanıcılarla eşleşmeyi önler.
create or replace function public.rpc_get_blocked_users(p_user_id uuid)
returns table (blocked_id uuid)
language sql
security definer
set search_path = public
as $$
  select blocked_id from public.blocked_users where blocker_id = p_user_id;
$$;

comment on function public.rpc_get_blocked_users is
  'Bir kullanıcının engellediği tüm kullanıcı ID''lerini döner. Eşleştirme sırasında bu kullanıcılarla eşleşmeyi önler.';

-- =====================================================================
-- 5. Güvenlik: moderation log tablosu (opsiyonel, ileride kullanım için)
-- =====================================================================
-- Moderatörler chat_reports'a bakıp işlem yapabilir. Şimdilik tablo + RLS yeterli.
-- İleride moderatör paneli eklendiğinde buraya policy eklenebilir.
