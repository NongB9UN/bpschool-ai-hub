import { authorized,json } from '../lib/security.js';
import { db } from '../lib/database.js';
export async function GET(req) {
 if(!authorized(req)) return json({error:'UNAUTHORIZED'},401);
 try {const groups=await db('line_groups',{query:{select:'group_id,display_name,ingest_enabled,report_enabled',order:'first_seen_at.desc'}});return json({status:'ok',groups});}
 catch {return json({error:'DATABASE_UNAVAILABLE'},503);}
}
