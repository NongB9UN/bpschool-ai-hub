import { authorized,json,bangkokDate,dayRange } from '../lib/security.js';
import { db,getMessages } from '../lib/database.js';
import { summarize } from '../lib/summarize.js';
import { deliver } from '../lib/delivery.js';
export async function GET(req) {
 if(!authorized(req)) return json({error:'UNAUTHORIZED'},401);
 const url=new URL(req.url), date=url.searchParams.get('date')||bangkokDate();
 let range; try {range=dayRange(date);} catch {return json({error:'INVALID_DATE'},400);}
 const push=['true','1'].includes(url.searchParams.get('push'));
 if(push && process.env.LINE_PUSH_ENABLED!=='true') return json({error:'PUSH_DISABLED'},403);
 try {
  const messages=await getMessages(...range), text=summarize(messages,date);
  if(!push) return json({status:'ok',date,messageCount:messages.length,summary:text});
  if(!process.env.LINE_CHANNEL_ACCESS_TOKEN || !process.env.LINE_TARGET_ID) return json({error:'LINE_PUSH_NOT_CONFIGURED'},503);
  const [target]=await db('line_groups',{query:{group_id:`eq.${process.env.LINE_TARGET_ID}`,select:'report_enabled'}});
  if(!target?.report_enabled) return json({error:'TARGET_NOT_ALLOWED'},403);
  const result=await deliver(date,process.env.LINE_TARGET_ID,text,messages.length);
  return json({date,...result});
 } catch(e) {console.error('Summary failed'); return json({error:e.message==='DELIVERY_REQUIRES_REVIEW'?e.message:'SUMMARY_UNAVAILABLE'},503);}
}
