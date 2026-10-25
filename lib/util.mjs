import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
const scrypt = promisify(scryptCallback);
export const uid = () => randomBytes(16).toString('hex');
export const sha256 = x => createHash('sha256').update(x).digest('hex');
export const deterministicId = x => sha256(x).slice(0,32);
export const now = () => new Date().toISOString();
export const plusDays = d => new Date(Date.now() + d * 86400_000).toISOString();
export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const key = await scrypt(password, Buffer.from(salt,'hex'), 64);
  return `scrypt:${salt}:${key.toString('hex')}`;
}
export async function verifyPassword(password, encoded) {
  if (!encoded || !encoded.startsWith('scrypt:')) return false;
  const [, salt, stored] = encoded.split(':');
  if (!/^[a-f0-9]{32}$/.test(salt ?? '') || !/^[a-f0-9]{128}$/.test(stored ?? '')) return false;
  const actual = await scrypt(password, Buffer.from(salt, 'hex'), 64);
  return timingSafeEqual(actual, Buffer.from(stored,'hex'));
}
export function json(data, status = 200, headers = {}) { return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', ...headers } }); }
export function fail(status, message) { return json({error: message},status); }
export function parseCookie(str='') { const out={}; for (const entry of str.split(';')) {const pos=entry.indexOf('='); if(pos>0) out[entry.slice(0,pos).trim()] = entry.slice(pos+1).trim();} return out; }
export function csvEscape(x) { const s=String(x??''); return /[",\n\r]/.test(s)?`"${s.replaceAll('"','""')}"`:s; }
