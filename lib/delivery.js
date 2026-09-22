import { db } from './database.js';
export async function deliver(date,target,text,count) {
 let row;
 try {
  [row]=await db('summary_deliveries',{method:'POST',body:{report_date:date,target_group_id:target,status:'sending',summary_text:text,message_count:count}});
 } catch(e) { if(e.status===409) return {status:'already_claimed'}; throw e; }
 // One database claim per date and target; never auto-retry an uncertain send.
 try {
  const response=await fetch('https://api.line.me/v2/bot/message/push',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,'X-Line-Retry-Key':row.retry_key},body:JSON.stringify({to:target,messages:[{type:'text',text}]}),signal:AbortSignal.timeout(10000)});
  const accepted=response.ok || (response.status===409 && !!response.headers.get('x-line-accepted-request-id'));
  if(!accepted) throw new Error(`LINE_HTTP_${response.status}`);
  await db('summary_deliveries',{method:'PATCH',query:{id:`eq.${row.id}`},body:{status:'sent',sent_at:new Date().toISOString()}});
  return {status:'sent'};
 } catch {
  await db('summary_deliveries',{method:'PATCH',query:{id:`eq.${row.id}`},body:{status:'uncertain',last_error_code:'DELIVERY_REQUIRES_REVIEW'}}).catch(()=>{});
  throw new Error('DELIVERY_REQUIRES_REVIEW');
 }
}
