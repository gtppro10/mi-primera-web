import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const sql=readFileSync(new URL('../supabase/001_skybike_proposal.sql',import.meta.url),'utf8');
test('propuesta SQL cerrada por defecto, aislada por agencia y sin ejecución automática',()=>{
 assert.match(sql,/enable row level security/);
 assert.match(sql,/revoke all on table public.%I from public, anon, authenticated/);
 assert.match(sql,/user_id=\(select auth.uid\(\)\)/);
 assert.match(sql,/foreign key\(reservation_id,organization_id\)/);
 assert.match(sql,/security definer set search_path = ''/);
 assert.doesNotMatch(sql,/create policy[\s\S]{0,100}for delete/i);
 assert.match(sql,/'skybike-documents','skybike-documents',false/);
 assert.match(sql,/'skybike-catalog','skybike-catalog',false/);
 assert.doesNotMatch(sql,/drop table|truncate table|delete from/i);
 for(const workflow of ['checks.yml','pages.yml','auto-pr.yml']){
  const text=readFileSync(new URL('../.github/workflows/'+workflow,import.meta.url),'utf8');
  assert.doesNotMatch(text,/supabase db push|psql|001_skybike_proposal/);
 }
});
