-- Rooftop con Cerámica Italia — schema
create table if not exists public.asistentes (
  id              uuid        primary key default gen_random_uuid(),
  nombre_completo text        not null,
  email           text        not null,
  telefono        text,
  confirmacion    boolean     not null,
  created_at      timestamptz not null default now(),
  constraint asistentes_email_unique unique (email)
);

alter table public.asistentes enable row level security;

create index if not exists asistentes_confirmacion_idx on public.asistentes(confirmacion);
create index if not exists asistentes_created_at_idx   on public.asistentes(created_at desc);

create or replace function public.asistentes_stats()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'total_registros',   count(*),
    'total_confirmados', count(*) filter (where confirmacion = true),
    'total_no_asisten',  count(*) filter (where confirmacion = false)
  )
  from public.asistentes;
$$;
