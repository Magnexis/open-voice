import { getDatabase } from '@netlify/database';
import { getStore, getDeployStore } from '@netlify/blobs';
import { createApi } from '../../lib/api.mjs';
import { createPostgresRepository } from '../../lib/postgres.mjs';
import { createBlobStorage } from '../../lib/audio-storage.mjs';
let cached;
export default async function handler(request) {
  if(!cached) {
    const db=getDatabase();
    cached=createApi({db:createPostgresRepository(db),storage:createBlobStorage(process.env.CONTEXT==='production'?getStore({name:'voice-audio',consistency:'strong'}):getDeployStore('voice-audio')),secureCookies:true});
  }
  return cached(request);
}
export const config={path:'/api/*'};
