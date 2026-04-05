-- Run in Supabase SQL editor (profiles + invoice columns + auth trigger)

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  default_view text default 'table'
);

-- Invoice extraction metadata (if columns missing)
alter table public.invoices add column if not exists is_fallback boolean default false;
alter table public.invoices add column if not exists model_used text;

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, default_view)
  values (new.id, new.email, 'table');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
