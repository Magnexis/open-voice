import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';
export function createDiskStorage(root = './data/audio') {
  return {
    async put(id, binary) { await mkdir(root,{recursive:true}); await writeFile(join(root,`${id}.bin`),binary,{flag:'wx'}); },
    async get(id) { return await readFile(join(root,`${id}.bin`)); },
    async delete(id) { try {await unlink(join(root,`${id}.bin`));} catch(e) {if(e.code !== 'ENOENT')throw e;} }
  };
}
export function createBlobStorage(store) {
  return {
    async put(id, data) { await store.set(`audio/${id}`, data.buffer.slice(data.byteOffset, data.byteOffset+data.byteLength)); },
    async get(id) { const buf=await store.get(`audio/${id}`, {type:'arrayBuffer', consistency:'strong'}); if(!buf) { const e = new Error('Audio missing');e.code='ENOENT';throw e;} return Buffer.from(buf); },
    async delete(id) { await store.delete(`audio/${id}`); }
  };
}
