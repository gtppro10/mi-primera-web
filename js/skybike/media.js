// Imágenes únicamente: nunca aceptar SVG o HTML ejecutable en el catálogo.
export async function readImage(file){
 if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>2*1024*1024)throw new Error('Selecciona JPG, PNG o WebP de hasta 2 MB.');
 const bytes=new Uint8Array(await file.arrayBuffer());
 const text=(a,b)=>String.fromCharCode(...bytes.slice(a,b));
 const valid=file.type==='image/jpeg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:
 file.type==='image/png'?bytes.slice(0,8).join(',')==='137,80,78,71,13,10,26,10':text(0,4)==='RIFF'&&text(8,12)==='WEBP';
 if(!valid)throw new Error('El contenido del archivo no corresponde a su formato de imagen.');
 const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(new Error('No se pudo leer la imagen.'));r.readAsDataURL(file);});
 const image=new Image();image.src=data;
 try{await image.decode();}catch{throw new Error('La imagen no se pudo decodificar.');}
 return {id:crypto.randomUUID(),name:file.name.slice(0,160),mime:file.type,data,width:image.naturalWidth,height:image.naturalHeight};
}
export function safeImage(value,fallback='./images/skybike/valle.jpg'){
 return /^(\.\/images\/|data:image\/(jpeg|png|webp);base64,)/.test(value||'')?value:fallback;
}
