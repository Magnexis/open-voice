import { uid, sha256, now, plusDays, json, fail, parseCookie, hashPassword, verifyPassword, csvEscape } from './util.mjs';
import { createZip } from './zip.mjs';

const MAX_AUDIO = 4 * 1024 * 1024;
const regexId = /^[a-f0-9]{32}$/;
const acceptedMimes = ['audio/webm','audio/ogg','audio/mp4','audio/wav','audio/x-wav'];
const audioExtension = { 'audio/webm':'webm','audio/ogg':'ogg','audio/mp4':'m4a','audio/wav':'wav','audio/x-wav':'wav' };
const message = (status,msg) => {const error=new Error(msg);error.httpStatus=status;return error;};
const one = async (db,sql,args=[]) => (await db.query(sql,args))[0] ?? null;
function exclusions(searchParams) {return [...new Set((searchParams.get('exclude')||'').split(',').filter(x=>regexId.test(x)))].slice(0,30);}
function exclusionSql(alias,ids) {return ids.length ? ` AND ${alias}.id NOT IN (${ids.map(()=>'?').join(',')})` : '';}
async function bodyJson(req, limit=15_000) {
  if(Number(req.headers.get('content-length')) > limit) throw message(413,'Request too large');
  const str = await req.text();
  if(Buffer.byteLength(str) > limit) throw message(413,'Request too large');
  try { return JSON.parse(str); } catch {throw message(400,'Invalid JSON');}
}
const cleanString = (x,max=300) => typeof x === 'string' ? x.trim().replace(/\s+/g,' ').slice(0,max+1) : '';
function contentCheck(bytes,mime) {
  if(mime === 'audio/webm') return bytes.subarray(0,4).equals(Buffer.from([0x1a,0x45,0xdf,0xa3]));
  if(mime === 'audio/ogg') return bytes.subarray(0,4).toString() === 'OggS';
  if(mime === 'audio/mp4') return bytes.subarray(4,8).toString() === 'ftyp';
  if(mime.includes('wav')) return bytes.subarray(0,4).toString()==='RIFF' && bytes.subarray(8,12).toString()==='WAVE';
  return false;
}
async function count(db,sql,args=[]) {return Number((await one(db,sql,args))?.n ?? 0);}

export function createApi({db,storage,secureCookies=false}) {
  async function actor(req) {
    const token = parseCookie(req.headers.get('cookie') || '').mv_session;
    if(!token || !/^[a-f0-9]{64}$/.test(token))return null;
    return await one(db, 'SELECT users.id, users.email, users.display_name FROM sessions JOIN users ON sessions.user_id=users.id WHERE sessions.token_hash=? AND sessions.expires_at>?', [sha256(token),now()]);
  }
  function requireActor(user) {if(!user)throw message(401,'Sign in to continue');return user;}
  function cookie(token,clear=false) {return `mv_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${clear ? 0 : 1209600}${secureCookies?'; Secure':''}`;}
  async function loginAs(user) {
    const token = sha256(uid()+uid());
    await db.query('INSERT INTO sessions (token_hash,user_id,expires_at) VALUES (?,?,?)',[sha256(token),user.id,plusDays(14)]);
    return json({user:{id:user.id,email:user.email,display_name:user.display_name}},200,{'set-cookie':cookie(token)});
  }
  async function reviewStatus(table,idColumn,id,decision) {
    // Read voting state only after unique vote insert; rejections prevent acceptance.
    const yes = await count(db,`SELECT COUNT(*) AS n FROM ${table} WHERE ${idColumn}=? AND vote='yes'`,[id]);
    const no = await count(db,`SELECT COUNT(*) AS n FROM ${table} WHERE ${idColumn}=? AND vote='no'`,[id]);
    const state = no>=2?'rejected':yes>=2 && no===0?'approved':'pending';
    return {yes,no,state};
  }
  async function vote(dbTable,entityTable,foreignKey,id, reviewer, value, extra='') {
    if(!regexId.test(id))throw message(400,'Invalid item');
    if(!['yes','no'].includes(value))throw message(400,'Vote must be yes or no');
    const target = await one(db,`SELECT * FROM ${entityTable} WHERE id=?`,[id]);
    if(!target || target.status!=='pending')throw message(404,'No pending item found');
    if(target.author_id===reviewer.id || target.creator_id===reviewer.id)throw message(403,'You cannot review your own contribution');
    if(extra==='transcription' && target.recording_id) {
      const rec=await one(db,'SELECT creator_id FROM recordings WHERE id=?',[target.recording_id]);
      if(rec?.creator_id===reviewer.id)throw message(403,'You cannot review a transcription of your own recording');
    }
    const result=await db.query(`INSERT INTO ${dbTable} (${foreignKey},reviewer_id,vote,created_at) VALUES (?,?,?,?) ON CONFLICT DO NOTHING`,[id,reviewer.id,value,now()]);
    if(result.changes===0)throw message(409,'You have already reviewed this item');
    const status=await reviewStatus(dbTable,foreignKey,id);
    // Status transition is monotonic and a flagged recording can never be approved by late votes.
    if(status.state!=='pending') await db.query(`UPDATE ${entityTable} SET status=? WHERE id=? AND status='pending'`,[status.state,id]);
    return status;
  }
  async function handle(req) {
    try {
      const url = new URL(req.url), path = url.pathname.replace(/^\/api/,'');
      const method = req.method.toUpperCase();
      if(!url.pathname.startsWith('/api/'))return fail(404,'Not found');
      if(!['GET','POST'].includes(method))return fail(405,'Method not allowed');
      // Prevent cross-origin writes via cookie authentication; browser Origin must match the host.
      if(method==='POST') {
        const origin=req.headers.get('origin');
        if(origin && new URL(origin).origin!==url.origin)throw message(403,'Cross-origin request denied');
        const fetchSite=req.headers.get('sec-fetch-site');
        if(fetchSite && !['same-origin','none'].includes(fetchSite))throw message(403,'Cross-site request denied');
      }
      const user = await actor(req);
      if(path==='/config' && method==='GET')return json({project:'Magnexis Voice',license:'CC0-1.0',languages:[{code:'en',name:'English'}],max_audio_bytes:MAX_AUDIO,accounts:true,oidc:false});
      if(path==='/auth/me' && method==='GET')return json({user});
      if(path==='/auth/register' && method==='POST') {
        const b=await bodyJson(req), email=cleanString(b.email,254).toLowerCase(), name=cleanString(b.display_name,50), pass=b.password;
        if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)||email.length>254)throw message(400,'Provide a valid email');
        if(name.length<2||name.length>50)throw message(400,'Display name should be 2–50 characters');
        if(typeof pass!=='string'||pass.length<12||pass.length>256)throw message(400,'Use a password of 12–256 characters');
        if(b.terms!==true)throw message(400,'You must agree to the contribution terms');
        if(await one(db,'SELECT id FROM users WHERE email=?',[email]))throw message(409,'Account already exists');
        const me={id:uid(),email,display_name:name};
        await db.query('INSERT INTO users (id,email,display_name,password_hash,created_at) VALUES (?,?,?,?,?)',[me.id,email,name,await hashPassword(pass),now()]);
        return await loginAs(me);
      }
      if(path==='/auth/login' && method==='POST') {
        const b=await bodyJson(req), email=cleanString(b.email,254).toLowerCase();
        const account=await one(db,'SELECT * FROM users WHERE email=?',[email]);
        if(!account || !await verifyPassword(String(b.password??''),account.password_hash))throw message(401,'Invalid email or password');
        return await loginAs(account);
      }
      if(path==='/auth/logout' && method==='POST') {
        const t=parseCookie(req.headers.get('cookie')||'').mv_session;
        if(t)await db.query('DELETE FROM sessions WHERE token_hash=?',[sha256(t)]);
        return json({ok:true},200,{'set-cookie':cookie('',true)});
      }
      if(path==='/stats' && method==='GET') {
        const get=async (table,where='1=1')=>await count(db,`SELECT COUNT(*) AS n FROM ${table} WHERE ${where}`);
        const approved=await one(db,"SELECT COALESCE(SUM(duration_ms),0) AS ms FROM recordings WHERE status='approved'");
        return json({contributors:await get('users'),recordings:await get('recordings'),approved_recordings:await get('recordings',"status='approved'"),approved_sentences:await get('sentences',"status='approved'"),review_votes:await get('recording_votes'),approved_duration_ms:Number(approved.ms)});
      }
      if(path==='/sentences' && method==='GET') {
        const limit=Math.max(1,Math.min(25,Number(url.searchParams.get('limit'))||5));
        const rows=await db.query("SELECT id,text,language FROM sentences WHERE status='approved' AND language='en' ORDER BY RANDOM() LIMIT ?",[limit]);
        return json({sentences:rows});
      }
      if(path==='/sentences' && method==='POST') {
        requireActor(user);
        const b=await bodyJson(req), text=cleanString(b.text,240);
        if(b.consent !== true)throw message(400,'You must agree to CC0 for this sentence');
        if(text.length<20||text.length>240||!/[.!?]$/.test(text))throw message(400,'Use 20–240 characters ending in punctuation');
        if(await count(db,'SELECT COUNT(*) AS n FROM sentences WHERE author_id=? AND created_at>?',[user.id,new Date(Date.now()-3600_000).toISOString()])>=20)throw message(429,'Hourly sentence limit reached');
        const id=uid();
        const result=await db.query('INSERT INTO sentences (id,language,text,author_id,status,license,created_at) VALUES (?,?,?,?,?,?,?) ON CONFLICT DO NOTHING',[id,'en',text,user.id,'pending','CC0-1.0',now()]);
        if(!result.changes)throw message(409,'Sentence already submitted');
        return json({id,status:'pending'},201);
      }
      if(path==='/sentences/review' && method==='GET') {
        requireActor(user);
        const skipped=exclusions(url.searchParams);
        const row=await one(db,"SELECT s.id,s.text,s.language FROM sentences s WHERE s.status='pending' AND s.author_id<>? AND NOT EXISTS (SELECT 1 FROM sentence_votes v WHERE v.sentence_id=s.id AND v.reviewer_id=?)"+exclusionSql('s',skipped)+" ORDER BY s.created_at LIMIT 1",[user.id,user.id,...skipped]);
        return json({item:row});
      }
      if(path==='/sentences/review' && method==='POST') {
        requireActor(user);const b=await bodyJson(req);
        return json(await vote('sentence_votes','sentences','sentence_id',b.id,user,b.vote));
      }
      if(path==='/prompts' && method==='GET')return json({prompts:await db.query("SELECT id,text,language FROM prompts WHERE status='approved' AND language='en' ORDER BY RANDOM() LIMIT 5")});
      if(path==='/recordings' && method==='POST') {
        requireActor(user);
        const kind=req.headers.get('x-voice-kind'), target=req.headers.get('x-voice-target'), mime=(req.headers.get('content-type')||'').split(';')[0].toLowerCase();
        const duration=Number(req.headers.get('x-voice-duration-ms'));
        if(req.headers.get('x-voice-consent')!=='cc0')throw message(400,'Explicit CC0 consent is required');
        if(!['scripted','spontaneous'].includes(kind)||!regexId.test(target??''))throw message(400,'Invalid recording target');
        if(!acceptedMimes.includes(mime))throw message(415,'Unsupported audio format');
        if(!Number.isInteger(duration)||duration<500||duration>90_000)throw message(400,'Recording must be 0.5–90 seconds');
        if(Number(req.headers.get('content-length'))>MAX_AUDIO)throw message(413,'Maximum audio size is 4 MB');
        const audio=Buffer.from(await req.arrayBuffer());
        if(audio.length<128||audio.length>MAX_AUDIO||!contentCheck(audio,mime))throw message(400,'Audio data is missing, too large, or not in the declared format');
        if(await count(db,'SELECT COUNT(*) AS n FROM recordings WHERE creator_id=? AND created_at>?',[user.id,new Date(Date.now()-3600_000).toISOString()])>=30)throw message(429,'Hourly upload limit reached');
        const table=kind==='scripted'?'sentences':'prompts';
        const item=await one(db,`SELECT id FROM ${table} WHERE id=? AND status='approved'`,[target]);
        if(!item)throw message(404,'No approved prompt found');
        const id=uid();
        await storage.put(id,audio);
        try {
          await db.query('INSERT INTO recordings (id,creator_id,sentence_id,prompt_id,kind,language,mime,bytes,duration_ms,license,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',[id,user.id,kind==='scripted'?target:null,kind==='spontaneous'?target:null,kind,'en',mime,audio.length,duration,'CC0-1.0','pending',now()]);
        } catch(err) {await storage.delete(id);throw err;}
        return json({id,status:'pending'},201);
      }
      if(path==='/recordings/next' && method==='GET') {
        requireActor(user);
        const kind=url.searchParams.get('kind')==='spontaneous'?'spontaneous':'scripted';
        const skipped=exclusions(url.searchParams);
        const row=await one(db,"SELECT r.id,r.kind,r.duration_ms,r.mime,COALESCE(s.text,p.text) AS text,r.language FROM recordings r LEFT JOIN sentences s ON r.sentence_id=s.id LEFT JOIN prompts p ON r.prompt_id=p.id WHERE r.status='pending' AND r.kind=? AND r.creator_id<>? AND NOT EXISTS (SELECT 1 FROM recording_votes v WHERE v.recording_id=r.id AND v.reviewer_id=?)"+exclusionSql('r',skipped)+" ORDER BY r.created_at LIMIT 1",[kind,user.id,user.id,...skipped]);
        return json({item:row ? {...row,audio_url:`/api/audio/${row.id}`} :null});
      }
      if(path==='/recordings/review' && method==='POST') {
        requireActor(user);const b=await bodyJson(req);
        return json(await vote('recording_votes','recordings','recording_id',b.id,user,b.vote));
      }
      if(path==='/recordings/report' && method==='POST') {
        requireActor(user);const b=await bodyJson(req),reason=cleanString(b.reason,100);
        if(!regexId.test(b.id??'')||!['personal information','hate or harassment','unsafe or inappropriate audio','copyright concern','other'].includes(reason))throw message(400,'Invalid report');
        if(!await one(db,'SELECT id FROM recordings WHERE id=?',[b.id]))throw message(404,'Recording not found');
        await db.query('INSERT INTO recording_reports (recording_id,reporter_id,reason,created_at) VALUES (?,?,?,?) ON CONFLICT DO NOTHING',[b.id,user.id,reason,now()]);
        await db.query("UPDATE recordings SET status='flagged' WHERE id=? AND status IN ('pending','approved')",[b.id]);
        return json({ok:true});
      }
      if(path.startsWith('/audio/') && method==='GET') {
        const id=path.slice('/audio/'.length);
        if(!regexId.test(id))throw message(404,'Audio not found');
        const r=await one(db,'SELECT id,creator_id,status,mime,kind FROM recordings WHERE id=?',[id]);
        if(!r || r.status==='flagged'||r.status==='rejected')throw message(404,'Audio unavailable');
        if(r.status==='pending') {
          requireActor(user);
          if(r.creator_id!==user.id && await one(db,'SELECT reviewer_id FROM recording_votes WHERE recording_id=? AND reviewer_id=?',[id,user.id]))throw message(403,'This item has already been reviewed');
        }
        let binary;try{binary=await storage.get(id);}catch{throw message(404,'Audio unavailable');}
        return new Response(binary,{status:200,headers:{'content-type':r.mime,'content-length':String(binary.length),'cache-control':'private, no-store','x-content-type-options':'nosniff','content-security-policy':"default-src 'none'"}});
      }
      if(path==='/transcriptions/next' && method==='GET') {
        requireActor(user);
        const row=await one(db,"SELECT r.id,r.mime,r.duration_ms,p.text AS prompt_text FROM recordings r JOIN prompts p ON r.prompt_id=p.id WHERE r.kind='spontaneous' AND r.status='approved' AND r.creator_id<>? AND NOT EXISTS(SELECT 1 FROM transcriptions t WHERE t.recording_id=r.id AND t.author_id=?) ORDER BY r.created_at LIMIT 1",[user.id,user.id]);
        return json({item:row?{...row,audio_url:`/api/audio/${row.id}`}:null});
      }
      if(path==='/transcriptions' && method==='POST') {
        requireActor(user);const b=await bodyJson(req),text=cleanString(b.text,2000);
        if(!regexId.test(b.recording_id??'')||text.length<5||text.length>2000||b.consent!==true)throw message(400,'Transcription and CC0 consent are required');
        const recording=await one(db,"SELECT id,creator_id FROM recordings WHERE id=? AND kind='spontaneous' AND status='approved'",[b.recording_id]);
        if(!recording)throw message(404,'No eligible recording');
        if(recording.creator_id===user.id)throw message(403,'Cannot transcribe your own recording');
        const id=uid();
        const res=await db.query('INSERT INTO transcriptions (id,recording_id,author_id,text,status,license,created_at) VALUES (?,?,?,?,?,?,?) ON CONFLICT DO NOTHING',[id,recording.id,user.id,text,'pending','CC0-1.0',now()]);
        if(!res.changes)throw message(409,'Already transcribed this recording');
        return json({id,status:'pending'},201);
      }
      if(path==='/transcriptions/review' && method==='GET') {
        requireActor(user);
        const skipped=exclusions(url.searchParams);
        const row=await one(db,"SELECT t.id,t.recording_id,t.text,r.mime FROM transcriptions t JOIN recordings r ON t.recording_id=r.id WHERE t.status='pending' AND r.status='approved' AND t.author_id<>? AND r.creator_id<>? AND NOT EXISTS(SELECT 1 FROM transcription_votes v WHERE v.transcription_id=t.id AND v.reviewer_id=?)"+exclusionSql('t',skipped)+" ORDER BY t.created_at LIMIT 1",[user.id,user.id,user.id,...skipped]);
        return json({item:row?{...row,audio_url:`/api/audio/${row.recording_id}`}:null});
      }
      if(path==='/transcriptions/review' && method==='POST') {
        requireActor(user);const b=await bodyJson(req);
        return json(await vote('transcription_votes','transcriptions','transcription_id',b.id,user,b.vote,'transcription'));
      }
      if(path==='/datasets/export' && method==='GET') {
        const kind=url.searchParams.get('kind')==='spontaneous'?'spontaneous':'scripted';
        const rows=await db.query("SELECT r.id,r.kind,r.mime,r.duration_ms,r.created_at,COALESCE(s.text,p.text) AS prompt,(SELECT text FROM transcriptions WHERE recording_id=r.id AND status='approved' ORDER BY created_at LIMIT 1) AS transcript FROM recordings r LEFT JOIN sentences s ON r.sentence_id=s.id LEFT JOIN prompts p ON r.prompt_id=p.id WHERE r.status='approved' AND r.kind=? ORDER BY r.created_at LIMIT 10",[kind]);
        const headers=['path','sentence_or_prompt','transcription','duration_ms','language','kind','license','recorded_at'];
        const csv=[headers.join(',')], entries=[];
        let exportedBytes=0; // Keep buffered ZIP response below Netlify's 6 MB limit.
        for(const r of rows) {
          // A reviewed, trusted transcript is optional and only added for spontaneous speech.
          const ext=audioExtension[r.mime]??'bin',file=`clips/${r.id}.${ext}`;
          let audio;try{audio=await storage.get(r.id);}catch {continue;}
          if(exportedBytes + audio.length > 3_500_000)break;
          exportedBytes += audio.length;
          entries.push({name:file,data:audio});
          csv.push([file,r.prompt,r.transcript||'',r.duration_ms,'en',kind,'CC0-1.0',r.created_at].map(csvEscape).join(','));
        }
        entries.unshift({name:'metadata.csv',data:Buffer.from(csv.join('\n')+'\n')});
        entries.push({name:'LICENSE.txt',data:Buffer.from('The audio recordings, sentences and transcriptions in this dataset were independently contributed under Creative Commons CC0 1.0 Universal. https://creativecommons.org/publicdomain/zero/1.0/\n')});
        entries.push({name:'README.txt',data:Buffer.from(`Magnexis Voice — ${kind} sample export\nContains only approved recordings with 2 independent positive validations and zero negative reviews at acceptance. Maximum 10 clips and 3.5 MB of audio per export.\n`)});
        const zip=createZip(entries);
        return new Response(zip,{status:200,headers:{'content-type':'application/zip','content-disposition':`attachment; filename="magnexis-voice-${kind}-sample.zip"`,'cache-control':'no-store','content-length':String(zip.length),'x-content-type-options':'nosniff'}});
      }
      return fail(404,'Route not found');
    } catch(err) {
      if(err.httpStatus)return fail(err.httpStatus,err.message);
      // DB unique conflict should not reveal internals or credentials.
      if(err.code==='23505'||err.code==='SQLITE_CONSTRAINT_UNIQUE')return fail(409,'This item already exists');
      console.error('[voice API]',err);
      return fail(500,'Unexpected server error');
    }
  }
  return handle;
}
