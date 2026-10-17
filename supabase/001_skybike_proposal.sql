-- PROPUESTA PARA REVISIÓN. NO EJECUTADA. No importa ni modifica datos de Google.
-- Destino futuro: proyecto Supabase de PRUEBAS vacío. Revisar antes de ejecutar.
-- CREATE sin IF NOT EXISTS: una colisión debe detenerse, no ocultarse.
begin;
create schema skybike_private;
revoke all on schema skybike_private from public, anon;
grant usage on schema skybike_private to authenticated, service_role;

create table public.sky_organizations (
 id uuid primary key default gen_random_uuid(), name text not null,
 timezone text not null default 'America/Lima', created_at timestamptz not null default now()
);
create table public.sky_memberships (
 organization_id uuid not null references public.sky_organizations(id),
 user_id uuid not null references auth.users(id),
 role text not null check(role in ('admin','sales','operations','accounting')),
 active boolean not null default true, primary key(organization_id,user_id)
);
-- Las membresías se aprovisionan solo desde un backend confiable / consola.
-- Ninguna política permite al navegador crearse un rol o cambiarlo.
create function skybike_private.has_role(org uuid, roles text[])
returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.sky_memberships m
 where m.organization_id=org and m.user_id=(select auth.uid())
 and m.active and m.role=any(roles));
$$;
revoke all on function skybike_private.has_role(uuid,text[]) from public, anon;
grant execute on function skybike_private.has_role(uuid,text[]) to authenticated,service_role;

create table public.sky_categories (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.sky_organizations(id),
 name text not null, sort_order integer not null default 0, active boolean not null default true,
 unique(id,organization_id), unique(organization_id,name)
);
create table public.sky_catalog_items (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.sky_organizations(id),
 category_id uuid, legacy_id text, name text not null,
 kind text not null check(kind in ('tour','product','service')),
 price_pen numeric(14,2) not null check(price_pen>=0),
 modality text not null check(modality in ('per_person','per_unit','per_booking')),
 duration_minutes integer check(duration_minutes>=15), duration_label text,
 includes_text text not null default '', excludes_text text not null default '',
 translations jsonb not null default '{}', include_flyer_in_pdf boolean not null default false,
 active boolean not null default true, created_at timestamptz not null default now(),
 unique(id,organization_id), unique(organization_id,legacy_id),
 foreign key(category_id,organization_id) references public.sky_categories(id,organization_id)
);
create table public.sky_tour_stages (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null, item_id uuid not null,
 position integer not null check(position>=0), title text not null, description text, active boolean not null default true,
 unique(id,organization_id), foreign key(item_id,organization_id) references public.sky_catalog_items(id,organization_id)
);
create table public.sky_media (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null, item_id uuid not null,
 purpose text not null check(purpose in ('cover','gallery','flyer')),
 language text check(language in ('es','en')), bucket_id text not null default 'skybike-catalog',
 object_path text not null, version integer not null default 1 check(version>0),
 position integer not null default 0, legacy_drive_id text, checksum_sha256 text,
 active boolean not null default true, created_at timestamptz not null default now(),
 unique(id,organization_id),unique(bucket_id,object_path),
 foreign key(item_id,organization_id) references public.sky_catalog_items(id,organization_id),
 check(split_part(object_path,'/',1)=organization_id::text),
 check(bucket_id='skybike-catalog')
);
create table public.sky_customers (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.sky_organizations(id),
 legacy_id text, name text not null, document_type text, document_number text,
 country_code text, phone text, email text, archived_at timestamptz,
 unique(id,organization_id), unique(organization_id,legacy_id)
);
create table public.sky_documents (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.sky_organizations(id),
 customer_id uuid not null, legacy_id text,
 kind text not null check(kind in ('quotation','receipt')),
 number text not null, status text not null default 'draft' check(status in ('draft','approved','converted','archived')),
 currency text not null check(currency in ('PEN','USD')),
 exchange_rate numeric(18,6) not null check(exchange_rate>0),
 language text not null default 'es' check(language in ('es','en')),
 validity_days integer check(validity_days between 1 and 365),
 customer_snapshot jsonb not null, gross_pen numeric(14,2) not null check(gross_pen>=0),
 discount_pen numeric(14,2) not null check(discount_pen>=0), total_pen numeric(14,2) not null check(total_pen>=0),
 -- Importes originales del legado se preservan; discrepancias se concilian, no se corrigen silenciosamente.
 legacy_amounts jsonb, notes text, created_at timestamptz not null default now(),
 created_by uuid references auth.users(id),
 unique(id,organization_id),unique(organization_id,kind,number),unique(organization_id,kind,legacy_id),
 foreign key(customer_id,organization_id) references public.sky_customers(id,organization_id),
 check(discount_pen<=gross_pen),check(total_pen=gross_pen-discount_pen),
 check(currency<>'PEN' or exchange_rate=1)
);
create table public.sky_document_lines (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null, document_id uuid not null,
 catalog_item_id uuid, parent_line_id uuid, description_snapshot text not null,
 kind text not null check(kind in ('tour','product','service')), tour_date date, tour_time time,
 quantity integer not null check(quantity>0), unit_price_pen numeric(14,2) not null check(unit_price_pen>=0),
 unit_discount_pen numeric(14,2) not null default 0 check(unit_discount_pen>=0),
 modality text not null check(modality in ('per_person','per_unit','per_booking')),
 quantity_manual boolean not null default false, snapshot jsonb not null default '{}',
 unique(id,organization_id),unique(id,document_id,organization_id),
 foreign key(document_id,organization_id) references public.sky_documents(id,organization_id),
 foreign key(catalog_item_id,organization_id) references public.sky_catalog_items(id,organization_id),
 foreign key(parent_line_id,document_id,organization_id) references public.sky_document_lines(id,document_id,organization_id),
 check(unit_discount_pen<=unit_price_pen),check(kind<>'tour' or (tour_date is not null and tour_time is not null)),
 check(parent_line_id is null or parent_line_id<>id),check(modality<>'per_booking' or quantity=1)
);
create table public.sky_line_discounts (
 id uuid primary key default gen_random_uuid(),organization_id uuid not null,document_line_id uuid not null,
 passenger_position integer not null check(passenger_position>0), amount_pen numeric(14,2) not null check(amount_pen>=0),
 unique(id,organization_id),unique(document_line_id,passenger_position),
 foreign key(document_line_id,organization_id) references public.sky_document_lines(id,organization_id)
);
create table public.sky_reservations (
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.sky_organizations(id),
 source_document_id uuid, receipt_document_id uuid,customer_id uuid not null,legacy_id text,number text not null,
 operational_status text not null check(operational_status in ('PENDIENTE','CONFIRMADA','PAGADA','EN CAMINO','PRESENTE','REALIZADA','CANCELADA','NO SHOW')),
 total_pen numeric(14,2) not null check(total_pen>=0),currency text not null check(currency in ('PEN','USD')),
 exchange_rate numeric(18,6) not null check(exchange_rate>0),customer_snapshot jsonb not null,
 created_at timestamptz not null default now(), archived_at timestamptz,
 unique(id,organization_id),unique(organization_id,number),unique(organization_id,legacy_id),unique(source_document_id),
 foreign key(customer_id,organization_id) references public.sky_customers(id,organization_id),
 foreign key(source_document_id,organization_id) references public.sky_documents(id,organization_id),
 foreign key(receipt_document_id,organization_id) references public.sky_documents(id,organization_id)
);
create table public.sky_reservation_lines (
 id uuid primary key default gen_random_uuid(),organization_id uuid not null,reservation_id uuid not null,
 catalog_item_id uuid,legacy_id text,tour_date date not null,tour_time time not null,
 quantity integer not null check(quantity>0),snapshot jsonb not null,
 operational_status text not null default 'PENDIENTE',
 unique(id,organization_id),foreign key(reservation_id,organization_id) references public.sky_reservations(id,organization_id),
 foreign key(catalog_item_id,organization_id) references public.sky_catalog_items(id,organization_id)
);
create table public.sky_passengers (
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.sky_organizations(id),
 name text not null,document_type text,document_number text,legacy_id text,archived_at timestamptz,
 unique(id,organization_id),unique(organization_id,legacy_id)
);
create table public.sky_reservation_passengers (
 id uuid primary key default gen_random_uuid(),organization_id uuid not null,reservation_line_id uuid not null,passenger_id uuid not null,
 notes text,unique(id,organization_id),unique(reservation_line_id,passenger_id),
 foreign key(reservation_line_id,organization_id) references public.sky_reservation_lines(id,organization_id),
 foreign key(passenger_id,organization_id) references public.sky_passengers(id,organization_id)
);
create table public.sky_payment_movements (
 id uuid primary key default gen_random_uuid(),organization_id uuid not null,reservation_id uuid not null,
 legacy_id text,idempotency_key uuid not null,kind text not null check(kind in ('payment','refund','reversal')),
 amount_pen numeric(14,2) not null check(amount_pen<>0),currency text not null check(currency in ('PEN','USD')),
 original_amount numeric(14,2) not null,exchange_rate numeric(18,6) not null check(exchange_rate>0),
 method text not null,reference text,notes text,legacy_snapshot jsonb,
 reverses_id uuid,created_at timestamptz not null default now(),created_by uuid references auth.users(id),
 unique(id,organization_id),unique(organization_id,idempotency_key),unique(organization_id,legacy_id),
 foreign key(reservation_id,organization_id) references public.sky_reservations(id,organization_id),
 foreign key(reverses_id,organization_id) references public.sky_payment_movements(id,organization_id),
 check((kind='payment' and amount_pen>0) or (kind in ('refund','reversal') and amount_pen<0))
);
create table public.sky_no_show_cases (
 id uuid primary key default gen_random_uuid(),organization_id uuid not null,reservation_id uuid not null,
 treatment text not null check(treatment in ('retain','refund','partial_refund')),
 retained_pen numeric(14,2) not null check(retained_pen>=0),refunded_pen numeric(14,2) not null check(refunded_pen>=0),
 reason text not null,created_at timestamptz not null default now(),unique(id,organization_id),
 foreign key(reservation_id,organization_id) references public.sky_reservations(id,organization_id)
);
create table public.sky_document_versions (
 id uuid primary key default gen_random_uuid(),organization_id uuid not null,document_id uuid not null,
 version integer not null check(version>0),snapshot jsonb not null,bucket_id text not null default 'skybike-documents',
 object_path text not null,legacy_drive_id text,checksum_sha256 text,created_at timestamptz not null default now(),
 unique(id,organization_id),unique(document_id,version),
 foreign key(document_id,organization_id) references public.sky_documents(id,organization_id),
 check(bucket_id='skybike-documents'),check(split_part(object_path,'/',1)=organization_id::text)
);
create table public.sky_calendar_events (
 id uuid primary key default gen_random_uuid(),organization_id uuid not null,reservation_line_id uuid not null,
 external_event_id text,calendar_reference text,sync_status text not null default 'pending',last_error text,last_sync_at timestamptz,
 unique(id,organization_id),unique(reservation_line_id),
 foreign key(reservation_line_id,organization_id) references public.sky_reservation_lines(id,organization_id)
);
create table public.sky_integration_jobs (
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.sky_organizations(id),
 integration text not null check(integration in ('calendar','pdf','flyers')),idempotency_key uuid not null,
 payload jsonb not null,status text not null default 'pending',attempts integer not null default 0,last_error text,
 unique(id,organization_id),unique(organization_id,idempotency_key)
);
create table public.sky_audit_events (
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.sky_organizations(id),
 actor_id uuid references auth.users(id),action text not null,entity_type text not null,entity_id uuid,
 before_snapshot jsonb,after_snapshot jsonb,created_at timestamptz not null default now(),unique(id,organization_id)
);
create table public.sky_settings (
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.sky_organizations(id),
 name text not null,value jsonb not null,unique(id,organization_id),unique(organization_id,name)
);
create table public.sky_document_sequences (
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.sky_organizations(id),
 kind text not null,series text not null,next_number bigint not null check(next_number>0),
 unique(id,organization_id),unique(organization_id,kind,series)
);
create table public.sky_migration_batches (
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.sky_organizations(id),
 source_reference text not null,checksum_sha256 text not null,status text not null default 'staged',
 created_at timestamptz not null default now(),unique(id,organization_id)
);
create table public.sky_legacy_records (
 id uuid primary key default gen_random_uuid(),organization_id uuid not null,batch_id uuid not null,
 sheet_name text not null,source_row integer not null,legacy_id text,payload jsonb not null,
 unique(id,organization_id),unique(batch_id,sheet_name,source_row),
 foreign key(batch_id,organization_id) references public.sky_migration_batches(id,organization_id)
);
create table public.sky_legacy_id_map (
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.sky_organizations(id),
 source_entity text not null,legacy_id text not null,target_entity text not null,target_id uuid not null,
 unique(id,organization_id),unique(organization_id,source_entity,legacy_id)
);

-- Ningún acceso anon. El cliente no puede borrar filas ni registrar pagos finales.
-- Todas las relaciones comerciales incluyen organization_id para impedir cruces entre agencias.
do $$
declare t text; read_roles text;
begin
 foreach t in array array['sky_organizations','sky_memberships','sky_categories','sky_catalog_items','sky_tour_stages','sky_media','sky_customers','sky_documents','sky_document_lines','sky_line_discounts','sky_reservations','sky_reservation_lines','sky_passengers','sky_reservation_passengers','sky_payment_movements','sky_no_show_cases','sky_document_versions','sky_calendar_events','sky_integration_jobs','sky_audit_events','sky_settings','sky_document_sequences','sky_migration_batches','sky_legacy_records','sky_legacy_id_map'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on table public.%I from public, anon, authenticated',t);
  execute format('grant select on table public.%I to authenticated',t);
  execute format('grant all on table public.%I to service_role',t);
  if t not in ('sky_organizations','sky_memberships') then
   read_roles := case
    when t in ('sky_audit_events','sky_settings','sky_document_sequences','sky_migration_batches','sky_legacy_records','sky_legacy_id_map') then 'array[''admin'']'
    when t in ('sky_documents','sky_document_lines','sky_line_discounts','sky_payment_movements','sky_no_show_cases','sky_document_versions') then 'array[''admin'',''sales'',''accounting'']'
    when t in ('sky_calendar_events','sky_integration_jobs') then 'array[''admin'',''operations'']'
    else 'array[''admin'',''sales'',''operations'',''accounting'']' end;
   execute format('create policy member_read on public.%I for select to authenticated using (skybike_private.has_role(organization_id, %s))',t,read_roles);
   execute format('create index on public.%I (organization_id)',t);
  end if;
 end loop;
end $$;
create policy organization_read on public.sky_organizations for select to authenticated
 using (skybike_private.has_role(id,array['admin','sales','operations','accounting']));
create policy membership_read on public.sky_memberships for select to authenticated
 using (user_id=(select auth.uid()) or skybike_private.has_role(organization_id,array['admin']));

-- Solo administración puede crear/editar el catálogo; no hay borrado de imágenes o filas.
do $$
declare t text;
begin
 foreach t in array array['sky_categories','sky_catalog_items','sky_tour_stages','sky_media'] loop
  execute format('grant insert, update on public.%I to authenticated',t);
  execute format('create policy catalog_insert on public.%I for insert to authenticated with check(skybike_private.has_role(organization_id,array[''admin'']))',t);
  execute format('create policy catalog_update on public.%I for update to authenticated using(skybike_private.has_role(organization_id,array[''admin''])) with check(skybike_private.has_role(organization_id,array[''admin'']))',t);
 end loop;
 foreach t in array array['sky_customers','sky_passengers','sky_reservation_passengers'] loop
  execute format('grant insert, update on public.%I to authenticated',t);
  execute format('create policy people_insert on public.%I for insert to authenticated with check(skybike_private.has_role(organization_id,array[''admin'',''sales'',''operations'']))',t);
  execute format('create policy people_update on public.%I for update to authenticated using(skybike_private.has_role(organization_id,array[''admin'',''sales'',''operations''])) with check(skybike_private.has_role(organization_id,array[''admin'',''sales'',''operations'']))',t);
 end loop;
end $$;
-- Escrituras de documentos, líneas, reservas y pagos: SOLO backend transaccional futuro.
-- Esto es deliberado: no exponer actualización directa de totales/saldos al navegador.
-- Ese backend deberá recalcular descuentos, bloquear reservas durante cobros, impedir
-- sobrepagos, validar estados, imponer idempotencia y registrar auditoría en la misma transacción.
-- No se otorga INSERT/UPDATE/DELETE a authenticated para esas tablas en esta etapa.

-- Storage: ambos buckets privados. No se sustituyen buckets existentes.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('skybike-catalog','skybike-catalog',false,2097152,array['image/jpeg','image/png','image/webp']),
 ('skybike-documents','skybike-documents',false,10485760,array['application/pdf']);
create function skybike_private.storage_role(object_name text,roles text[])
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.sky_memberships m where m.user_id=(select auth.uid()) and m.active
 and m.organization_id::text=split_part(object_name,'/',1) and m.role=any(roles));
$$;
revoke all on function skybike_private.storage_role(text,text[]) from public,anon;
grant execute on function skybike_private.storage_role(text,text[]) to authenticated,service_role;
create policy skybike_catalog_read on storage.objects for select to authenticated
 using(bucket_id='skybike-catalog' and skybike_private.storage_role(name,array['admin','sales','operations','accounting']));
create policy skybike_catalog_insert on storage.objects for insert to authenticated
 with check(bucket_id='skybike-catalog' and skybike_private.storage_role(name,array['admin']));
-- Archivos inmutables: cada cambio de imagen crea otra ruta; no UPDATE ni DELETE.
create policy skybike_documents_read on storage.objects for select to authenticated
 using(bucket_id='skybike-documents' and skybike_private.storage_role(name,array['admin','sales','accounting']));
-- PDF insertado únicamente por el backend, con URL firmada temporal.
commit;
