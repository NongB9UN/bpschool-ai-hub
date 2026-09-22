import { timingSafeEqual, createHmac } from 'node:crypto';
export function equal(a, b) {
 const x=Buffer.from(a || ''), y=Buffer.from(b || '');
 return x.length > 0 && x.length === y.length && timingSafeEqual(x,y);
}
export function signatureOK(raw, signature, secret) {
 return !!secret && equal(createHmac('sha256',secret).update(raw).digest('base64'),signature);
}
export function authorized(req) { return !!process.env.CRON_SECRET && equal(req.headers.get('authorization'),`Bearer ${process.env.CRON_SECRET}`); }
export function json(data,status=200) { return Response.json(data,{status,headers:{'Cache-Control':'no-store'}}); }
export function dayRange(day) {
 if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error('INVALID_DATE');
 const start=new Date(`${day}T00:00:00+07:00`);
 if (!Number.isFinite(+start) || bangkokDate(start)!==day) throw new Error('INVALID_DATE');
 return [start.toISOString(),new Date(+start+86400000).toISOString()];
}
export function bangkokDate(date=new Date()) {
 return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
}
