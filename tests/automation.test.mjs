import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {mergePolicy,REQUIRED_CHECKS}=require('../.github/scripts/merge-policy.cjs');
function valid() {
 return {enabled:'true',autoMergeAllowed:true,owner:'gtppro10',repository:'gtppro10/mi-primera-web',
 run:{event:'push',head_repository:{full_name:'gtppro10/mi-primera-web'},head_branch:'codex/mejora',actor:{login:'gtppro10'},conclusion:'success'},
 files:[{filename:'styles.css'}],
 protection:{required_status_checks:{strict:true,checks:REQUIRED_CHECKS.map(context=>({context}))},enforce_admins:{enabled:true},allow_force_pushes:{enabled:false},allow_deletions:{enabled:false},required_pull_request_reviews:{require_code_owner_reviews:true}},
 checks:REQUIRED_CHECKS.map(name=>({name,app:{slug:'github-actions'},status:'completed',conclusion:'success'}))};
}
test('auto-merge solo con autorización, origen propio, controles exitosos y main protegido',()=>{
 assert.equal(mergePolicy(valid()),null);
 const cases=[
 c=>{c.enabled='false';},c=>{c.autoMergeAllowed=false;},c=>{c.run.conclusion='failure';},
 c=>{c.run.actor.login='externo';},c=>{c.run.head_repository.full_name='otro/fork';},
 c=>{c.run.head_branch='otra-rama';},c=>{c.run.event='pull_request';},
 c=>{c.protection=null;},c=>{c.protection.required_status_checks.strict=false;},
 c=>{c.protection.required_status_checks.checks=[];},c=>{c.protection.enforce_admins.enabled=false;},
 c=>{c.protection.allow_force_pushes.enabled=true;},c=>{c.protection.allow_deletions.enabled=true;},
 c=>{c.protection.required_pull_request_reviews.require_code_owner_reviews=false;},
 c=>{c.protection.required_pull_request_reviews.bypass_pull_request_allowances={apps:[{slug:'bot'}]};},
 c=>{c.checks[0].conclusion='failure';},c=>{c.checks[1].conclusion='skipped';},
 c=>{c.checks[0].app.slug='otro';},c=>{c.checks=[];}
 ];
 for(const modify of cases){const c=valid();modify(c);assert.notEqual(mergePolicy(c),null);}
});
test('cambios sensibles y renombrados requieren incorporación manual',()=>{
 for(const filename of ['.github/workflows/checks.yml','tests/browser.cjs','scripts/check.mjs','package.json','package-lock.json','js/sunat.js','AGENTS.md','supabase/001_skybike_proposal.sql']){
  for(const file of [{filename},{filename:'nuevo.txt',previous_filename:filename}]){
   const c=valid();c.files=[file];assert.notEqual(mergePolicy(c),null);
  }
 }
});
