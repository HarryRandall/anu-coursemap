begin;

insert into public.import_models(id,name,provider) values ('local/test', 'Test model', 'Test') on conflict do nothing;
create extension if not exists pgtap with schema extensions;
select extensions.plan(13);
insert into private.app_roles(key,name,description) values ('admin','Admin','Admin fixture'),('user','User','User fixture') on conflict do nothing;
insert into private.app_permissions(key,name,description,category) values ('imports.manage','Manage imports','Import fixture','imports') on conflict do nothing;
insert into private.role_permissions(role_id,permission_id)
select r.id,p.id from private.app_roles r cross join private.app_permissions p
where r.key='admin' and p.key='imports.manage' on conflict do nothing;
insert into auth.users(id,email) values ('e1212902-a316-4905-a12d-f2560ee3c900','recovery@example.test');
update private.user_roles set role_id=(select id from private.app_roles where key='admin')
where user_id='e1212902-a316-4905-a12d-f2560ee3c900';
insert into public.academic_years(year,is_import_enabled) values(2026,true) on conflict(year) do update set is_import_enabled=true;
insert into public.academic_structure_sources(name,kind,base_url) values('ANU','anu_programs_and_courses','https://programsandcourses.anu.edu.au') on conflict do nothing;
insert into public.academic_structure_source_pages(source_id,academic_year_id,page_kind,structure_kind,external_key,canonical_url,media_type,content_sha256,byte_size,http_status)
select s.id,y.id,'structure','minor','RECOVERY-MIN','https://programsandcourses.anu.edu.au/2026/minor/RECOVERY-MIN','text/html',repeat('a',64),0,200
from public.academic_structure_sources s cross join public.academic_years y where s.kind='anu_programs_and_courses' and y.year=2026;
insert into public.academic_structure_directory_entries(source_id,academic_year_id,source_page_id,structure_kind,code,title,source_url)
select source_id,academic_year_id,id,'minor','RECOVERY-MIN','Recovery fixture',canonical_url
from public.academic_structure_source_pages where external_key='RECOVERY-MIN';
select set_config('request.jwt.claim.sub','e1212902-a316-4905-a12d-f2560ee3c900',true);
create temporary table recovery_first as select * from public.start_academic_structure_import(2026::smallint,'minor',array['RECOVERY-MIN'],'local/test','test','test','test');
update public.academic_structure_import_targets set created_at=now()-interval '1 day' where id in(select target_id from recovery_first);
create temporary table recovery_second as select * from public.start_academic_structure_import(2026::smallint,'minor',array['RECOVERY-MIN'],'local/test','test','test','test');
select extensions.is((select processing_status from public.academic_structure_import_targets where id=(select target_id from recovery_first)),'failed','starting another run recovers undispatched targets');
select extensions.is((select error_code from public.academic_structure_import_targets where id=(select target_id from recovery_first)),'QUEUE_DISPATCH_STALE','recovery records the reason');
select extensions.throws_ok($$select * from public.start_academic_structure_import(2026::smallint,'minor',array['RECOVERY-MIN'],'local/test','test','test','test')$$,'55000','Another academic structure import is active.','fresh queued runs remain protected');
select set_config('request.jwt.claim.sub','',true);
select extensions.throws_ok($$select public.cancel_academic_structure_import((select run_id from recovery_second))$$,'42501','Import permission is required.','anonymous cancellation is denied');
select set_config('request.jwt.claim.sub','e1212902-a316-4905-a12d-f2560ee3c900',true);
update private.user_roles set role_id=(select id from private.app_roles where key='user') where user_id='e1212902-a316-4905-a12d-f2560ee3c900';
select extensions.throws_ok($$select public.cancel_academic_structure_import((select run_id from recovery_second))$$,'42501','Import permission is required.','signed-in users without import permission cannot stop runs');
update private.user_roles set role_id=(select id from private.app_roles where key='admin') where user_id='e1212902-a316-4905-a12d-f2560ee3c900';
select * from private.claim_academic_structure_import_target((select run_id from recovery_second),(select target_id from recovery_second),'test-message','b1212902-a316-4905-a12d-f2560ee3c900',600);
select public.cancel_academic_structure_import((select run_id from recovery_second));
select extensions.is((select processing_status from public.academic_structure_import_targets where id=(select target_id from recovery_second)),'cancelled','running target is cancelled');
select extensions.ok((select worker_id is null and lease_expires_at is null from public.academic_structure_import_targets where id=(select target_id from recovery_second)),'worker lease is invalidated');
select extensions.is((select status from public.academic_structure_import_runs where id=(select run_id from recovery_second)),'cancelled','run no longer blocks the queue');
select extensions.is((select count(*) from public.academic_structure_import_stages where target_id=(select target_id from recovery_second) and status='pending'),0::bigint,'pending stages are closed');
select extensions.throws_ok($$select * from private.claim_academic_structure_import_target((select run_id from recovery_second),(select target_id from recovery_second),'late-message','b1212902-a316-4905-a12d-f2560ee3c900',600)$$,'55000','The academic structure import run is not active.','late queue delivery cannot reclaim cancelled work');
select extensions.lives_ok($$select public.cancel_academic_structure_import((select run_id from recovery_second))$$,'stopping an already stopped run is idempotent');
select public.cancel_academic_structure_import((select run_id from recovery_first));
select extensions.is((select processing_status from public.academic_structure_import_targets where id=(select target_id from recovery_first)),'failed','stopping a terminal run preserves its recorded outcome');
select extensions.lives_ok($$select * from public.start_academic_structure_import(2026::smallint,'minor',array['RECOVERY-MIN'],'local/test','test','test','test')$$,'another run can start immediately after cancellation');
select * from extensions.finish();
rollback;
