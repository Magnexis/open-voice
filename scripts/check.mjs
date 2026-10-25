import {readFile,readdir,stat} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {join} from 'node:path';
const needed=['public/index.html','public/styles.css','public/app.js','server.mjs','lib/api.mjs','lib/sqlite.mjs','lib/postgres.mjs','lib/audio-storage.mjs','netlify/functions/api.mjs','netlify/database/migrations/202610240001_initial.sql','netlify.toml'];
for(const p of needed){const s=await stat(p);assert.ok(s.size>0,`Empty required file: ${p}`);}
const html=await readFile('public/index.html','utf8');
for(const id of ['view','authDialog','authForm','recToggle'.replace('recToggle','authBtn')])assert.ok(html.includes(`id="${id}"`),`Missing ${id}`);
const sql=await readFile('netlify/database/migrations/202610240001_initial.sql','utf8');
for(const name of ['users','recordings','recording_votes','sentence_votes','transcription_votes'])assert.ok(sql.includes(`TABLE IF NOT EXISTS ${name}`));
console.log(`Source validation passed (${needed.length} mandatory files)`);
