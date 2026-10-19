export function normalizeCustomerEmail(value=''){
 const email=String(value??'').trim();
 if(email&&(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||/[<>(),;:"\\]/.test(email)))throw new Error('Revisa el formato del correo electrónico del cliente.');
 return email;
}
