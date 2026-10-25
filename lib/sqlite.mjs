import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { schema, seedSentences, seedPrompts } from './schema.mjs';
import { deterministicId } from './util.mjs';

export function createSqliteRepository(path = './data/voice.sqlite') {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;');
  db.exec(schema);
  const api = {
    async query(sql, params = []) {
      const statement = db.prepare(sql);
      if (/^\s*(SELECT|WITH|PRAGMA)/i.test(sql) || /\bRETURNING\b/i.test(sql)) return statement.all(...params);
      const res = statement.run(...params);
      return { changes: Number(res.changes) };
    },
    async close() { db.close(); }
  };
  seed(db);
  return api;
}
function seed(db) {
  for (const text of seedSentences) {
    db.prepare('INSERT INTO sentences (id, language, text, author_id, status, license, created_at) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT DO NOTHING').run(deterministicId(`sentence:${text}`),'en',text,null,'approved','CC0-1.0','2026-01-01T00:00:00.000Z');
  }
  for (const text of seedPrompts) {
    db.prepare('INSERT INTO prompts (id, language, text, status) VALUES (?, ?, ?, ?) ON CONFLICT DO NOTHING').run(deterministicId(`prompt:${text}`),'en',text,'approved');
  }
}
