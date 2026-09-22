import { signatureOK,json } from '../lib/security.js';
import { db } from '../lib/database.js';
export async function GET() { return json({error:'METHOD_NOT_ALLOWED'},405); }
export async function POST(req) {
 if (!process.env.LINE_CHANNEL_SECRET) return json({error:'LINE_NOT_CONFIGURED'},503);
 const raw=await req.text();
 if (Buffer.byteLength(raw)>1024*1024) return json({error:'PAYLOAD_TOO_LARGE'},413);
 if (!signatureOK(raw,req.headers.get('x-line-signature'),process.env.LINE_CHANNEL_SECRET)) return json({error:'INVALID_SIGNATURE'},401);
 let payload;
 try { payload=JSON.parse(raw); } catch { return json({error:'INVALID_JSON'},400); }
 if (!Array.isArray(payload.events)) return json({error:'INVALID_EVENTS'},400);
 try {
  for (const event of payload.events) {
   const groupId=event.source?.groupId || event.source?.roomId;
   if (!groupId || !['group','room'].includes(event.source?.type)) continue;
   // Discover group IDs only. Unknown groups never store message content.
   await db('line_groups',{method:'POST',query:{on_conflict:'group_id'},prefer:'resolution=ignore-duplicates,return=minimal',body:{group_id:groupId,source_type:event.source.type}});
   if (event.type==='leave') {
    await db('line_groups',{method:'PATCH',query:{group_id:`eq.${groupId}`},body:{ingest_enabled:false,report_enabled:false}}); continue;
   }
   const [group]=await db('line_groups',{query:{group_id:`eq.${groupId}`,select:'ingest_enabled'}});
   if (event.type==='unsend' && event.unsend?.messageId) {
    // A tombstone also prevents a delayed/redelivered message from restoring removed text.
    await db('line_messages',{method:'POST',query:{on_conflict:'message_id'},prefer:'resolution=ignore-duplicates,return=minimal',body:{message_id:event.unsend.messageId,group_id:groupId,event_at:new Date(event.timestamp).toISOString(),message_text:null,unsent_at:new Date().toISOString()}});
    await db('line_messages',{method:'PATCH',query:{message_id:`eq.${event.unsend.messageId}`,group_id:`eq.${groupId}`},body:{message_text:null,sender_id:null,unsent_at:new Date().toISOString()}}); continue;
   }
   if (!group?.ingest_enabled || event.type!=='message' || event.message?.type!=='text') continue;
   await db('line_messages',{method:'POST',query:{on_conflict:'message_id'},prefer:'resolution=ignore-duplicates,return=minimal',body:{message_id:event.message.id,webhook_event_id:event.webhookEventId || null,group_id:groupId,sender_id:event.source.userId || null,message_text:event.message.text,event_at:new Date(event.timestamp).toISOString()}});
  }
  return json({status:'ok'});
 } catch { console.error('Webhook storage failed'); return json({error:'STORAGE_UNAVAILABLE'},503); }
}
