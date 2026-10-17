const REQUIRED_CHECKS=['Pruebas y auditoría','Análisis de seguridad'];
const sensitive=path=>/^(\.github\/|tests\/|scripts\/|package(?:-lock)?\.json$|js\/sunat\.js$|AGENTS\.md$)/.test(path);
function mergePolicy({run,owner,repository,files,protection,checks,enabled,autoMergeAllowed}) {
 if(enabled!=='true')return 'La incorporación automática aún no está autorizada.';
 if(run.event!=='push'||run.head_repository?.full_name!==repository||!run.head_branch?.startsWith('codex/')||run.actor?.login!==owner)return 'Origen no autorizado.';
 if(run.conclusion!=='success')return 'Fallaron verificaciones del commit.';
 if(!autoMergeAllowed)return 'Activa Allow auto-merge en GitHub.';
 if(files.some(f=>sensitive(f.filename)||sensitive(f.previous_filename||'')))return 'Los cambios de automatización, pruebas, dependencias o SUNAT requieren revisión e incorporación manual.';
 if(!protection)return 'No se pudieron confirmar las protecciones de main.';
 const status=protection.required_status_checks;
 const names=status?.checks?.map(c=>c.context)||status?.contexts||[];
 if(!status?.strict||!REQUIRED_CHECKS.every(c=>names.includes(c)))return 'Faltan verificaciones obligatorias o actualización estricta con main.';
 if(!protection.enforce_admins?.enabled)return 'Las protecciones también deben aplicarse a administradores.';
 if(protection.allow_force_pushes?.enabled||protection.allow_deletions?.enabled)return 'main debe impedir force push y eliminación.';
 const reviews=protection.required_pull_request_reviews;
 if(!reviews?.require_code_owner_reviews)return 'Activa revisión obligatoria de CODEOWNERS.';
 const bypass=reviews.bypass_pull_request_allowances;
 if(bypass && ['users','teams','apps'].some(k=>bypass[k]?.length))return 'No se admite bypass de revisiones para la automatización.';
 for(const name of REQUIRED_CHECKS){
  const check=checks.find(c=>c.name===name&&c.app?.slug==='github-actions');
  if(!check||check.status!=='completed'||check.conclusion!=='success')return `No se confirmó el éxito de ${name}.`;
 }
 return null;
}
module.exports={mergePolicy,REQUIRED_CHECKS,sensitive};
