// Solo propone campos etiquetados; nunca ejecuta ni guarda texto recibido.
export function parseWhatsApp(text){
 const result={};
 const labels={nombre:'name',cliente:'name',documento:'document','dni / pasaporte':'document',dni:'document',pasaporte:'document',telefono:'phone',whatsapp:'phone',pasajeros:'qty',fecha:'date',hora:'time',horario:'time',tour:'tour'};
 for(const line of String(text).split('\n')){const match=line.match(/^\s*([^:]+):\s*(.*?)\s*$/);if(!match)continue;const key=labels[match[1].normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()];if(!key)continue;const value=match[2];if(key==='qty'){if(/^\d+$/.test(value)&&+value>0&&+value<=100)result.qty=+value;}else if(key==='date'){let date=value;const m=value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);if(m)date=`${m[3]}-${m[2]}-${m[1]}`;if(/^\d{4}-\d{2}-\d{2}$/.test(date)&&Number.isFinite(new Date(date+'T12:00:00Z').getTime())&&new Date(date+'T12:00:00Z').toISOString().slice(0,10)===date)result.date=date;}else if(key==='time'){if(/^([01]\d|2[0-3]):[0-5]\d$/.test(value))result.time=value;else{const m=value.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);if(m&&+m[1]>=1&&+m[1]<=12&&+m[2]<60)result.time=String(+m[1]%12+(m[3].toUpperCase()==='PM'?12:0)).padStart(2,'0')+':'+m[2];}}else result[key]=value.slice(0,key==='name'?100:80);}
 result.aviso='Revisa la propuesta. Fecha, hora y cantidad se aplican a todos los tours; ajusta cada salida después. Un tour etiquetado se propone solo si coincide de forma única con el catálogo; revisa la selección.';
 return result;
}
