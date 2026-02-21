begin;

alter table public.user_profiles
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists phone text,
  add column if not exists email text,
  add column if not exists date_of_birth date,
  add column if not exists gender text,
  add column if not exists address_line1 text,
  add column if not exists address_line2 text,
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists postal_code text,
  add column if not exists linkedin_url text,
  add column if not exists portfolio_url text;

-- Keep values sane without making old rows invalid.
alter table public.user_profiles
  drop constraint if exists user_profiles_gender_check,
  add constraint user_profiles_gender_check
    check (gender is null or gender in ('male','female','non_binary','prefer_not_to_say','other'));

alter table public.user_profiles
  drop constraint if exists user_profiles_email_format,
  add constraint user_profiles_email_format
    check (email is null or email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}$');

create unique index if not exists idx_user_profiles_email_unique on public.user_profiles (email)
where email is not null;

commit;
