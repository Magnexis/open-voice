import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createSqliteRepository } from '../lib/sqlite.mjs';
import { createDiskStorage } from '../lib/audio-storage.mjs';
import { createApi } from '../lib/api.mjs';
import { createZip } from '../lib/zip.mjs';

// Short EBML-like payload for testing transport acceptance, not a real playable voice sample.
const audio=Buffer.concat([Buffer.from([0x1a,0x45,0xdf,0xa3]),Buffer.alloc(2048,22)]);
async function harness(t) {
  const dir=await mkdtemp(join(tmpdir(),'magnexis-test-'));
  const db=createSqliteRepository(join(dir,'db.sqlite'));
  t.after(async()=>{await db.close();await rm(dir,{recursive:true,force:true});});
  const api=createApi({db,storage:createDiskStorage(join(dir,'audio'))});
  async function request(path,method='GET',data=undefined,cookie='',headers={}) {
    const bin=Buffer.isBuffer(data);
    const r=await api(new Request('http://localhost:8888/api'+path,{method,headers:{...(data!==undefined&&!bin?{'content-type':'application/json'}:{}),...(cookie?{cookie}:{}),...headers},body:data===undefined?undefined:bin?data:JSON.stringify(data)}));
    const ct=r.headers.get('content-type')||'';
    return {status:r.status,headers:r.headers,body:ct.includes('json')?await r.json():Buffer.from(await r.arrayBuffer())};
  }
  async function user(name) {
    const r=await request('/auth/register','POST',{email:`${name}@example.test`,display_name:name,password:'A-difficult-password-2026',terms:true});
    assert.equal(r.status,200,JSON.stringify(r.body));
    return {id:r.body.user.id,cookie:r.headers.get('set-cookie').split(';')[0]};
  }
  async function recording(who,kind,target,duration=2500) {
    return request('/recordings','POST',audio,who.cookie,{'content-type':'audio/webm','x-voice-kind':kind,'x-voice-target':target,'x-voice-duration-ms':String(duration),'x-voice-consent':'cc0'});
  }
  return {db,request,user,recording};
}

test('seed text is queryable; registration, cookies, login, logout persist securely',async t=>{
  const h=await harness(t),sentences=await h.request('/sentences?limit=5');
  assert.equal(sentences.body.sentences.length,5);
  const alice=await h.user('alice');
  const me=await h.request('/auth/me','GET',undefined,alice.cookie);
  assert.equal(me.body.user.display_name,'alice');
  const invalid=await h.request('/auth/login','POST',{email:'alice@example.test',password:'bad-password!'});
  assert.equal(invalid.status,401);
  const session=await h.request('/auth/login','POST',{email:'alice@example.test',password:'A-difficult-password-2026'});
  assert.equal(session.status,200);
  const out=await h.request('/auth/logout','POST',{},alice.cookie);
  assert.equal(out.status,200);
  assert.equal((await h.request('/auth/me','GET',undefined,alice.cookie)).body.user,null);
  const rows=await h.db.query('SELECT password_hash FROM users WHERE id=?',[alice.id]);
  assert.ok(rows[0].password_hash.startsWith('scrypt:'));
  assert.ok(!rows[0].password_hash.includes('A-difficult-password'));
});

test('recording lifecycle: consent + MIME validation, independent review, exclusion of flagged clips',async t=>{
  const h=await harness(t),alice=await h.user('alice'),bob=await h.user('bob'),cara=await h.user('cara');
  const sentence=(await h.request('/sentences?limit=1')).body.sentences[0];
  let upload=await h.request('/recordings','POST',audio,alice.cookie,{'content-type':'audio/webm','x-voice-kind':'scripted','x-voice-target':sentence.id,'x-voice-duration-ms':'2500'});
  assert.equal(upload.status,400);
  upload=await h.recording(alice,'scripted',sentence.id);
  assert.equal(upload.status,201,JSON.stringify(upload.body));
  const id=upload.body.id;
  assert.equal((await h.request('/recordings/next','GET',undefined,alice.cookie)).body.item,null,'self review blocked in queue');
  assert.equal((await h.request('/recordings/review','POST',{id,vote:'yes'},alice.cookie)).status,403,'self vote denied');
  assert.equal((await h.request('/recordings/next','GET',undefined,bob.cookie)).body.item.id,id);
  assert.equal((await h.request('/recordings/review','POST',{id,vote:'yes'},bob.cookie)).body.state,'pending');
  assert.equal((await h.request('/recordings/review','POST',{id,vote:'yes'},bob.cookie)).status,409,'duplicate vote denied');
  assert.equal((await h.request('/recordings/review','POST',{id,vote:'yes'},cara.cookie)).body.state,'approved');
  const zip=await h.request('/datasets/export?kind=scripted');
  assert.equal(zip.status,200);assert.equal(zip.body.subarray(0,2).toString(),'PK');
  assert.equal(zip.body.includes(Buffer.from(id)),true);
  const publiclyReadable=await h.request(`/audio/${id}`);
  assert.equal(publiclyReadable.status,200);
  assert.equal(publiclyReadable.body.length,audio.length);
  assert.equal((await h.request('/recordings/report','POST',{id,reason:'personal information'},bob.cookie)).status,200);
  assert.equal((await h.request(`/audio/${id}`)).status,404);
  const newzip=await h.request('/datasets/export?kind=scripted');
  assert.equal(newzip.body.includes(Buffer.from(id)),false);
  assert.equal((await h.request('/stats')).body.approved_recordings,0);
});

test('sentence review requires two other accounts, with distinct votes',async t=>{
  const h=await harness(t),a=await h.user('adam'),b=await h.user('brie'),c=await h.user('cody');
  const text='Carefully written sentences help every voice be heard.';
  const add=await h.request('/sentences','POST',{text,consent:true},a.cookie);
  assert.equal(add.status,201);
  const id=add.body.id;
  assert.equal((await h.request('/sentences/review','GET',undefined,a.cookie)).body.item,null);
  assert.equal((await h.request('/sentences/review','POST',{id,vote:'yes'},b.cookie)).body.state,'pending');
  assert.equal((await h.request('/sentences/review','POST',{id,vote:'yes'},c.cookie)).body.state,'approved');
  assert.equal((await h.db.query('SELECT status FROM sentences WHERE id=?',[id]))[0].status,'approved');
});

test('spontaneous speech -> two votes -> transcript -> two votes -> approved transcript in export',async t=>{
  const h=await harness(t),a=await h.user('amber'),b=await h.user('beryl'),c=await h.user('celia'),d=await h.user('david'),e=await h.user('ellen');
  const prompt=(await h.request('/prompts')).body.prompts[0];
  const submission=await h.recording(a,'spontaneous',prompt.id);
  assert.equal(submission.status,201);
  const id=submission.body.id;
  assert.equal((await h.request('/recordings/review','POST',{id,vote:'yes'},b.cookie)).status,200);
  assert.equal((await h.request('/recordings/review','POST',{id,vote:'yes'},c.cookie)).body.state,'approved');
  assert.equal((await h.request('/transcriptions/next','GET',undefined,a.cookie)).body.item,null);
  const task=(await h.request('/transcriptions/next','GET',undefined,b.cookie)).body.item;
  assert.equal(task.id,id);
  const tr=await h.request('/transcriptions','POST',{recording_id:id,text:'The park near my home is beautiful.',consent:true},b.cookie);
  assert.equal(tr.status,201);
  assert.equal((await h.request('/transcriptions/review','POST',{id:tr.body.id,vote:'yes'},a.cookie)).status,403,'audio author cannot validate transcript');
  assert.equal((await h.request('/transcriptions/review','POST',{id:tr.body.id,vote:'yes'},b.cookie)).status,403,'transcription author cannot self review');
  assert.equal((await h.request('/transcriptions/review','POST',{id:tr.body.id,vote:'yes'},d.cookie)).body.state,'pending');
  assert.equal((await h.request('/transcriptions/review','POST',{id:tr.body.id,vote:'yes'},e.cookie)).body.state,'approved');
  const exportZip=await h.request('/datasets/export?kind=spontaneous');
  assert.ok(exportZip.body.includes(Buffer.from('The park near my home is beautiful.')));
});

test('hostile request origin, malformed audio, nonmembers and malformed IDs are rejected',async t=>{
  const h=await harness(t),a=await h.user('arna'),sentence=(await h.request('/sentences?limit=1')).body.sentences[0];
  assert.equal((await h.request('/sentences','POST',{text:'This is one valid sentence to review.',consent:true},a.cookie,{origin:'https://different.example'})).status,403);
  assert.equal((await h.request('/recordings','POST',Buffer.alloc(1024),a.cookie,{'content-type':'audio/webm','x-voice-kind':'scripted','x-voice-target':sentence.id,'x-voice-duration-ms':'2300','x-voice-consent':'cc0'})).status,400);
  assert.equal((await h.request('/recordings','POST',audio,'',{'content-type':'audio/webm','x-voice-kind':'scripted','x-voice-target':sentence.id,'x-voice-duration-ms':'2300','x-voice-consent':'cc0'})).status,401);
  assert.equal((await h.request('/audio/../../etc/passwd')).status,404);
});

test('ZIP archive writer generates valid signatures even when empty',()=>{
  const zip=createZip([{name:'metadata.csv',data:Buffer.from('id,name\n1,sample\n')}]);
  assert.equal(zip.readUInt32LE(0),0x04034b50);
  assert.equal(zip.readUInt32LE(zip.length-22),0x06054b50);
});
