-- ProAgenda database schema
-- Run this in the Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor)

-- ── patients ──────────────────────────────────────────────────────────────────
create table patients (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null check (char_length(name) between 1 and 150),
  initials      text not null check (char_length(initials) between 1 and 4),
  age           int check (age is null or (age >= 0 and age <= 150)),
  phone         text check (phone is null or char_length(phone) <= 30),
  email         text check (email is null or char_length(email) <= 254),
  observations  text check (observations is null or char_length(observations) <= 2000),
  avatar_color  text not null default '#6366F1',
  created_at    timestamptz not null default now()
);

alter table patients enable row level security;

create policy "users see own patients"
  on patients for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── patient_notes ─────────────────────────────────────────────────────────────
create table patient_notes (
  id          uuid primary key default gen_random_uuid(),
  patient_id  uuid not null references patients(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  content     text not null check (char_length(content) between 1 and 5000),
  created_at  timestamptz not null default now()
);

alter table patient_notes enable row level security;

-- SELECT / DELETE: note must belong to the calling user.
-- INSERT / UPDATE: additionally verify the referenced patient also belongs to the
-- calling user, preventing a user from attaching notes to another user's patients.
create policy "users see own notes"
  on patient_notes for all
  using (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = patient_notes.patient_id
        AND patients.user_id = auth.uid()
    )
  )
  with check (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = patient_notes.patient_id
        AND patients.user_id = auth.uid()
    )
  );

-- ── sessions ──────────────────────────────────────────────────────────────────
create table sessions (
  id              uuid primary key default gen_random_uuid(),
  patient_id      uuid not null references patients(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  date            date not null,
  status          text not null check (status in ('realizada','cancelada','pendiente')) default 'pendiente',
  amount          int not null default 0 check (amount >= 0),
  paid            boolean not null default false,
  payment_method  text check (payment_method in ('efectivo','transferencia')),
  appointment_id  uuid,               -- back-reference set after appointment insert
  paid_at         timestamptz,
  created_at      timestamptz not null default now()
);

alter table sessions enable row level security;

create policy "users see own sessions"
  on sessions for all
  using (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = sessions.patient_id
        AND patients.user_id = auth.uid()
    )
  )
  with check (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = sessions.patient_id
        AND patients.user_id = auth.uid()
    )
  );

-- ── appointments ──────────────────────────────────────────────────────────────
create table appointments (
  id              uuid primary key default gen_random_uuid(),
  patient_id      uuid not null references patients(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  session_id      uuid references sessions(id) on delete set null,
  date            date not null,
  time            text not null check (time ~ '^\d{2}:\d{2}$'),
  duration        int not null default 50,
  modality        text not null check (modality in ('presencial','virtual')) default 'presencial',
  amount          int not null default 0 check (amount >= 0),
  paid            boolean not null default false,
  payment_method  text check (payment_method in ('efectivo','transferencia')),
  created_at      timestamptz not null default now()
);

alter table appointments enable row level security;

create policy "users see own appointments"
  on appointments for all
  using (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = appointments.patient_id
        AND patients.user_id = auth.uid()
    )
  )
  with check (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = appointments.patient_id
        AND patients.user_id = auth.uid()
    )
  );

-- ── indexes for common query patterns ─────────────────────────────────────────
create index on patients(user_id);
create index on patient_notes(patient_id);
create index on sessions(patient_id);
create index on sessions(user_id, date);
create index on appointments(user_id, date);
create index on appointments(patient_id);

-- ── paid_at trigger (server-side timestamp) ───────────────────────────────────
-- Sets paid_at = now() when paid flips true; clears it when paid flips false.
-- Fires on both INSERT and UPDATE so a direct API INSERT with paid = true
-- cannot supply a falsified paid_at timestamp.
-- On INSERT, OLD is a null row in PL/pgSQL, so `old is null` is the correct guard.

create or replace function sessions_set_paid_at()
returns trigger language plpgsql as $$
begin
  if new.paid = true and (old is null or old.paid = false) then
    new.paid_at := now();
  elsif new.paid = false then
    new.paid_at := null;
  end if;
  return new;
end;
$$;

create trigger sessions_paid_at
  before insert or update on sessions
  for each row execute function sessions_set_paid_at();

-- ── migrations (run these if the tables already exist) ───────────────────────
-- If you ran the schema above for the first time, skip this section.
-- If the tables were created from an earlier version of this file, run these
-- ALTER TABLE statements in the Supabase SQL Editor to add the missing constraints.

alter table sessions
  add constraint if not exists chk_amount check (amount >= 0);

alter table appointments
  add constraint if not exists chk_amount check (amount >= 0);

alter table appointments
  add constraint if not exists chk_time check (time ~ '^\d{2}:\d{2}$');

-- ── RLS policy migration: add cross-table patient ownership check ──────────────
-- If the tables already existed with the old single-column policies, drop and
-- recreate them with the stricter EXISTS subquery.

drop policy if exists "users see own notes" on patient_notes;
create policy "users see own notes"
  on patient_notes for all
  using (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = patient_notes.patient_id
        AND patients.user_id = auth.uid()
    )
  )
  with check (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = patient_notes.patient_id
        AND patients.user_id = auth.uid()
    )
  );

drop policy if exists "users see own sessions" on sessions;
create policy "users see own sessions"
  on sessions for all
  using (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = sessions.patient_id
        AND patients.user_id = auth.uid()
    )
  )
  with check (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = sessions.patient_id
        AND patients.user_id = auth.uid()
    )
  );

drop policy if exists "users see own appointments" on appointments;
create policy "users see own appointments"
  on appointments for all
  using (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = appointments.patient_id
        AND patients.user_id = auth.uid()
    )
  )
  with check (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = appointments.patient_id
        AND patients.user_id = auth.uid()
    )
  );

-- ── migration: extend paid_at trigger to cover INSERT ─────────────────────────
-- If the schema was applied before this fix, run the block below in the
-- Supabase SQL Editor. It is idempotent — safe to run on a fresh schema too.

create or replace function sessions_set_paid_at()
returns trigger language plpgsql as $$
begin
  if new.paid = true and (old is null or old.paid = false) then
    new.paid_at := now();
  elsif new.paid = false then
    new.paid_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists sessions_paid_at on sessions;
create trigger sessions_paid_at
  before insert or update on sessions
  for each row execute function sessions_set_paid_at();
