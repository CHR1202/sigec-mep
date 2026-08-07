-- SIGEC - Solicitudes de acceso
-- Ejecutar solo si todavía no creó access_requests.

create table if not exists public.access_requests (
 id uuid primary key default gen_random_uuid(), full_name text not null, email text not null, requested_role public.sigec_user_role not null, status text not null default 'pending' check(status in ('pending','approved','rejected')), reviewed_by uuid references public.profiles(id) on delete set null, reviewed_at timestamptz, rejection_reason text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index if not exists access_requests_pending_email_unique on public.access_requests(lower(email)) where status='pending';
alter table public.access_requests enable row level security;
drop policy if exists "public_can_request_access" on public.access_requests;
drop policy if exists "admin_can_view_access_requests" on public.access_requests;
drop policy if exists "admin_can_update_access_requests" on public.access_requests;
create policy "public_can_request_access" on public.access_requests for insert to anon with check(status='pending' and reviewed_by is null and reviewed_at is null and rejection_reason is null);
create policy "admin_can_view_access_requests" on public.access_requests for select to authenticated using(public.current_sigec_role()='admin');
create policy "admin_can_update_access_requests" on public.access_requests for update to authenticated using(public.current_sigec_role()='admin') with check(public.current_sigec_role()='admin');
grant insert on public.access_requests to anon; grant select,update on public.access_requests to authenticated;
create or replace function public.reject_access_request(request_id uuid, reason text default null) returns void language plpgsql security definer set search_path=public as $$ begin if public.current_sigec_role()<>'admin' then raise exception 'Solo un administrador puede rechazar solicitudes.'; end if; update public.access_requests set status='rejected',reviewed_by=auth.uid(),reviewed_at=now(),rejection_reason=reason where id=request_id and status='pending'; end; $$;
revoke all on function public.reject_access_request(uuid,text) from public; grant execute on function public.reject_access_request(uuid,text) to authenticated;
