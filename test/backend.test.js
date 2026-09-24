import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {signatureOK,dayRange,bangkokDate} from '../lib/security.js';
import {summarize} from '../lib/summarize.js';
import {POST as webhook} from '../api/webhook.js';
import {GET as summary} from '../api/summary.js';
import {deliver} from '../lib/delivery.js';
test('raw signature preserves whitespace and rejects missing/changed payload',()=>{
 const raw='{ "events": [] }', key='test-only-secret', signature=createHmac('sha256',key).update(raw).digest('base64');
 assert.ok(signatureOK(raw,signature,key)); assert.equal(signatureOK('{}',signature,key),false); assert.equal(signatureOK(raw,null,key),false); assert.equal(signatureOK(raw,signature,''),false);
});
test('Bangkok day starts on previous UTC date and rejects invalid calendar dates',()=>{
 assert.deepEqual(dayRange('2026-09-22'),['2026-09-21T17:00:00.000Z','2026-09-22T17:00:00.000Z']);
 assert.equal(bangkokDate(new Date('2026-09-21T17:01:00Z')),'2026-09-22');
 assert.throws(()=>dayRange('2026-02-30')); assert.throws(()=>dayRange('yesterday'));
});
test('empty reports do not invent a healthy outcome',async()=>{
 assert.match(await summarize([],'2026-09-22'),/ไม่มีข้อมูล/); assert.doesNotMatch(await summarize([],'2026-09-22'),/สุขภาพนักเรียนปกติ/);
});
test('unauthorized summary never calls database; authenticated push stays disabled',async()=>{
 process.env.CRON_SECRET='test-admin'; delete process.env.LINE_PUSH_ENABLED;
 assert.equal((await summary(new Request('https://example.test/api/summary'))).status,401);
 assert.equal((await summary(new Request('https://example.test/api/summary?push=true',{headers:{authorization:'Bearer test-admin'}}))).status,403);
});
test('signed webhook persists once, ignores unknown group contents, and tombstones unsent messages',async()=>{
 process.env.LINE_CHANNEL_SECRET='test-channel'; process.env.SUPABASE_URL='https://example.test'; process.env.SUPABASE_SECRET_KEY='test-db';
 const original=global.fetch, groups=new Map(), messages=new Map(); let fail=false;
 global.fetch=async (input,opts)=>{
  if(fail)return new Response('{}',{status:503});
  const url=new URL(input), table=url.pathname.split('/').pop(), body=opts.body?JSON.parse(opts.body):null;
  const map=table==='line_groups'?groups:messages, id=table==='line_groups'?body?.group_id:body?.message_id;
  if(opts.method==='POST'){if(!map.has(id))map.set(id,{ingest_enabled:false,...body});return new Response('',{status:201});}
  if(opts.method==='PATCH'){const key=url.searchParams.get('message_id').slice(3); Object.assign(map.get(key),body); return Response.json([]);}
  return Response.json([groups.get(url.searchParams.get('group_id').slice(3))]);
 };
 const event={type:'message',source:{type:'group',groupId:'test-group'},timestamp:Date.now(),webhookEventId:'evt1',message:{id:'msg1',type:'text',text:'test only'}};
 async function send(events){const raw=JSON.stringify({events});return webhook(new Request('https://example.test/api/webhook',{method:'POST',body:raw,headers:{'x-line-signature':createHmac('sha256','test-channel').update(raw).digest('base64')}}));}
 try {
  assert.equal((await send([event])).status,200);assert.equal(messages.size,0);groups.get('test-group').ingest_enabled=true;
  await send([event,event]); assert.equal(messages.size,1);
  await send([{...event,type:'unsend',unsend:{messageId:'msg1'}}]); await send([event]); assert.equal(messages.get('msg1').message_text,null);
  await send([{...event,type:'unsend',unsend:{messageId:'msg2'}}]); await send([{...event,message:{...event.message,id:'msg2'},webhookEventId:'evt2'}]);assert.equal(messages.get('msg2').message_text,null);
  fail=true;assert.equal((await send([event])).status,503);
 }finally{global.fetch=original;}
});
test('concurrent report requests acquire one database claim and send only once',async()=>{
 const original=global.fetch;let claimed=false,pushes=0;
 global.fetch=async(input,opts)=>{
  if(String(input).includes('api.line.me')){pushes++;assert.ok(opts.headers['X-Line-Retry-Key']);return Response.json({});}
  if(opts.method==='POST'){if(claimed)return Response.json({},{status:409});claimed=true;return Response.json([{id:'claim1',retry_key:'00000000-0000-4000-8000-000000000001'}]);}
  return Response.json([]);
 };
 try{const results=await Promise.all([deliver('2026-09-22','test-group','test',1),deliver('2026-09-22','test-group','test',1)]);assert.equal(pushes,1);assert.ok(results.some(x=>x.status==='already_claimed'));}finally{global.fetch=original;}
});
test('an uncertain LINE response is retained for manual review, not resent',async()=>{
 const original=global.fetch;let status;
 global.fetch=async(input,opts)=>{
  if(String(input).includes('api.line.me'))throw new Error('timeout');
  if(opts.method==='POST')return Response.json([{id:'claim2',retry_key:'test'}]);
  status=JSON.parse(opts.body).status;return Response.json([]);
 };
 try{await assert.rejects(()=>deliver('2026-09-22','test-group','test',1),/DELIVERY_REQUIRES_REVIEW/);assert.equal(status,'uncertain');}finally{global.fetch=original;}
});
