const {mergePolicy}=require('./merge-policy.cjs');
module.exports=async function({github,context,core}) {
 const {owner,repo}=context.repo;
 const run=context.payload.workflow_run;
 if(run.event!=='push'||run.head_repository?.full_name!==`${owner}/${repo}`||!run.head_branch?.startsWith('codex/')||run.actor?.login!==owner)throw new Error('Origen de automatización no autorizado.');
 const {data:repository}=await github.rest.repos.get({owner,repo});
 if(repository.default_branch!=='main')throw new Error('Esta automatización espera main como rama predeterminada.');
 const {data:branch}=await github.rest.repos.getBranch({owner,repo,branch:run.head_branch});
 if(branch.commit.sha!==run.head_sha){core.notice('La rama cambió. Se esperará la ejecución del nuevo commit.');return;}
 const {data:existing}=await github.rest.pulls.list({owner,repo,head:`${owner}:${run.head_branch}`,base:'main',state:'open'});
 let pr=existing[0];
 if(!pr){
  // No reabrir una rama ya incorporada sin cambios nuevos.
  const {data:comparison}=await github.rest.repos.compareCommitsWithBasehead({owner,repo,basehead:`main...${run.head_sha}`});
  if(comparison.ahead_by===0)return;
  const {data:commit}=await github.rest.repos.getCommit({owner,repo,ref:run.head_sha});
  const title=commit.commit.message.split('\n')[0].slice(0,180)||'Actualizar sistema web';
  ({data:pr}=await github.rest.pulls.create({owner,repo,base:'main',head:run.head_branch,title,body:`Actualización preparada en la rama Codex.\n\nVerificaciones del commit: ${run.conclusion}.\n\nEjecución: ${run.html_url}\n\nLa incorporación automática respeta las protecciones de main. Los cambios sensibles requieren revisión manual. No se autoriza emisión real ni conexión a SUNAT.`}));
 }
 if(pr.head.sha!==run.head_sha){core.notice('La PR cambió. No se habilita auto-merge con verificaciones antiguas.');return;}
 const files=await github.paginate(github.rest.pulls.listFiles,{owner,repo,pull_number:pr.number,per_page:100});
 if(files.length>=3000)throw new Error('Lista de archivos incompleta: requiere revisión manual.');
 let protection;
 try {({data:protection}=await github.rest.repos.getBranchProtection({owner,repo,branch:'main'}));}
 catch(error){core.notice(`No se pudo confirmar protección clásica de main (HTTP ${error.status||'desconocido'}). No se habilita auto-merge.`);}
 const checks=await github.paginate(github.rest.checks.listForRef,{owner,repo,ref:run.head_sha,per_page:100});
 const reason=mergePolicy({run,owner,repository:`${owner}/${repo}`,files,protection,checks,enabled:process.env.AUTO_MERGE_ENABLED,autoMergeAllowed:repository.allow_auto_merge});
 if(reason){
  if(pr.auto_merge)await github.graphql('mutation($id:ID!){disablePullRequestAutoMerge(input:{pullRequestId:$id}){clientMutationId}}',{id:pr.node_id});
  await core.summary.addHeading(`PR #${pr.number} preparada`).addLink('Revisar en GitHub',pr.html_url).addRaw(`\n\n${reason}\n`).write();return;
 }
 if(!pr.draft && !pr.auto_merge){
  await github.graphql('mutation($id:ID!){enablePullRequestAutoMerge(input:{pullRequestId:$id,mergeMethod:SQUASH}){clientMutationId}}',{id:pr.node_id});
 }
 await core.summary.addHeading(`PR #${pr.number}`).addLink('Revisar en GitHub',pr.html_url).addRaw('\n\nAuto-merge solicitado. GitHub conserva las revisiones y verificaciones obligatorias; no se usa bypass.\n').write();
};
