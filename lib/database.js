export async function db(table,{query={},method='GET',body,prefer='return=representation'}={}) {
 const base=process.env.SUPABASE_URL, key=process.env.SUPABASE_SECRET_KEY;
 if (!base || !key) throw new Error('DATABASE_NOT_CONFIGURED');
 const url=new URL(`/rest/v1/${table}`,base);
 for (const [name,value] of Object.entries(query)) url.searchParams.set(name,value);
 const response=await fetch(url,{method,headers:{apikey:key,'Content-Type':'application/json',Prefer:prefer},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(10000)});
 if (!response.ok) { const e=new Error('DATABASE_ERROR'); e.status=response.status; throw e; }
 const text=await response.text(); return text?JSON.parse(text):[];
}
export async function getMessages(start,end) {
 const groups=await db('line_groups',{query:{select:'group_id',ingest_enabled:'eq.true'}});
 const messages=[];
 for (const group of groups) {
  for (let offset=0;;offset+=500) {
   const page=await db('line_messages',{query:{select:'message_id,message_text,event_at,group_id',group_id:`eq.${group.group_id}`,and:`(event_at.gte.${start},event_at.lt.${end})`,unsent_at:'is.null',message_text:'not.is.null',order:'event_at.asc,message_id.asc',limit:'500',offset:String(offset)}});
   messages.push(...page);
   if (messages.length>10000) throw new Error('TOO_MANY_MESSAGES');
   if (page.length<500) break;
  }
 }
 return messages.sort((a,b)=>a.event_at.localeCompare(b.event_at)||a.message_id.localeCompare(b.message_id));
}
