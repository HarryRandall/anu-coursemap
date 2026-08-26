-- Admin routes address catalogue records by an opaque public identifier so a
-- URL does not depend on a code ANU controls and could reuse.

alter table public.courses
  add column public_id uuid not null default gen_random_uuid();

alter table public.courses
  add constraint courses_public_id_unique unique (public_id);

alter table public.academic_structures
  add column public_id uuid not null default gen_random_uuid();

alter table public.academic_structures
  add constraint academic_structures_public_id_unique unique (public_id);
