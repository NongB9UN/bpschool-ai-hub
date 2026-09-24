import test from 'node:test';
import assert from 'node:assert/strict';
import {summarize} from '../lib/summarize.js';
const messages=[{message_text:'ประชุมพรุ่งนี้ 9 โมง',event_at:'2026-09-24T02:00:00Z',group_id:'test-group'}];
test('Gemini request protects credentials and separates instructions from source data',async t=>{
 process.env.GEMINI_API_KEY='test-key'; delete process.env.GEMINI_MODEL;
 t.mock.method(globalThis,'fetch',async(url,opts)=>{
  assert.ok(!url.includes('test-key')); assert.equal(opts.headers['x-goog-api-key'],'test-key');
  const body=JSON.parse(opts.body); assert.ok(body.systemInstruction);
  assert.equal(JSON.parse(body.contents[0].parts[0].text).messages[0].text,messages[0].message_text);
  return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:'private reasoning',thought:true},{text:'รายงานทดสอบ'}]}}]});
 });
 assert.equal(await summarize(messages,'2026-09-24'),'รายงานทดสอบ');
});
test('empty input does not call Gemini; missing key fails explicitly',async t=>{
 delete process.env.GEMINI_API_KEY;
 t.mock.method(globalThis,'fetch',()=>assert.fail('must not call API'));
 assert.match(await summarize([],'2026-09-24'),/ไม่มีข้อมูล/);
 await assert.rejects(summarize(messages,'2026-09-24'),/GEMINI_NOT_CONFIGURED/);
});
test('Gemini failures never silently substitute keyword reports',async t=>{
 process.env.GEMINI_API_KEY='test-key';
 for(const [reply,code] of [
  [()=>Response.json({},{status:429}),'GEMINI_RATE_LIMITED'],
  [()=>Response.json({},{status:403}),'GEMINI_REQUEST_FAILED'],
  [()=>{throw new Error('secret URL');},'GEMINI_CONNECTION_FAILED'],
  [()=>Response.json({candidates:[{finishReason:'MAX_TOKENS',content:{parts:[{text:'partial'}]}}]}),'GEMINI_INCOMPLETE_RESPONSE'],
  [()=>Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:'x'.repeat(4501)}]}}]}),'GEMINI_OUTPUT_TOO_LONG']
 ]) {
  const mock=t.mock.method(globalThis,'fetch',reply);
  await assert.rejects(summarize(messages,'2026-09-24'),new RegExp(code)); mock.mock.restore();
 }
});
test('oversized source and invalid model fail before API use',async t=>{
 process.env.GEMINI_API_KEY='test-key';
 t.mock.method(globalThis,'fetch',()=>assert.fail('must not call API'));
 await assert.rejects(summarize([{message_text:'x'.repeat(60001)}],'2026-09-24'),/GEMINI_INPUT_TOO_LARGE/);
 process.env.GEMINI_MODEL='../bad';
 await assert.rejects(summarize(messages,'2026-09-24'),/GEMINI_INVALID_MODEL/);
 delete process.env.GEMINI_MODEL;
});
