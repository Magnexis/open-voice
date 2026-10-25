/* Magnexis Voice — client-only view layer; all durable writes go to /api/. */
'use strict';
const $=id=>document.getElementById(id);
const state={user:null,view:'speak',sentences:[],prompts:[],index:0,drafts:[],recorder:null,stream:null,start:0,recording:false,mode:'scripted',currentReview:null,reviewKind:'scripted',skipped:{recordings:new Set(),sentences:new Set(),transcriptions:new Set()}};
const escapeHTML=x=>String(x??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const fmtCount=n=>Number(n||0).toLocaleString();
const fmtDuration=ms=>`${(Number(ms||0)/3600000).toFixed(1)}h`;
const allViews={speak:'SCRIPTED SPEECH',spontaneous:'SPONTANEOUS SPEECH',listen:'VALIDATE AUDIO',write:'CONTRIBUTE TEXT',sentencereview:'REVIEW SENTENCES',transcribe:'TRANSCRIBE AUDIO',transcriptionreview:'REVIEW TRANSCRIPTS',download:'DATASET DOWNLOADS',about:'ABOUT THE PROJECT'};
let stats={};
let toastTimer;
function toast(msg,error=false){const t=$('toast');t.textContent=msg;t.style.background=error?'#9c2b44':'#2b2047';t.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('visible'),4000);}
async function api(path,{method='GET',body,headers={}}={}){
  const isBinary=body instanceof Blob;
  const result=await fetch('/api'+path,{method,credentials:'same-origin',headers:{...(body&&!isBinary?{'content-type':'application/json'}:{}),...headers},body:body===undefined?undefined:isBinary?body:JSON.stringify(body)});
  if(!result.ok){let m='Something went wrong';try{m=(await result.json()).error||m;}catch{}throw Error(m);}
  if(result.headers.get('content-type')?.includes('application/json'))return result.json();
  return result;
}
function guard(){if(state.user)return true;openAuth();toast('Sign in to contribute or review recordings.');return false;}
function header(title,lead,emphasis=''){return `<div class="heading-wrap"><h1>${title}${emphasis?` <em>${emphasis}</em>`:''}</h1><p class="lead">${lead}</p></div>`;}
function info(){return `<section class="how-it-works"><h3>How your contribution helps</h3><div class="info-cards"><div class="info-card"><span class="info-icon">◉</span><b>Record naturally</b><p>Speak at a comfortable pace, in your usual accent, using a quiet space.</p></div><div class="info-card"><span class="info-icon">✓</span><b>Community reviewed</b><p>Independent listeners check clip quality. You cannot review your own audio.</p></div><div class="info-card"><span class="info-icon">♧</span><b>Made for everyone</b><p>Approved recordings are shared as CC0 public-domain data for research and innovation.</p></div></div></section>`;}
function markers(){return `<div class="steps">${state.sentences.map((_,i)=>`<span class="${i<state.index||state.drafts[i]?.blob?'done':''}"></span>`).join('')}</div>`;}
function waves(){return `<div class="wave ${state.recording?'recording':''}" aria-hidden="true">${Array.from({length:48},(_,i)=>`<span style="--i:${i};height:${6+Math.round(20*Math.abs(Math.sin(i*.47))+13*Math.abs(Math.sin(i*.9)))}px"></span>`).join('')}</div>`;}
async function setView(view){
  if(!(view in allViews))view='speak';
  if(state.recording){toast('Stop your recording before changing pages.',true);return;}
  state.view=view;
  document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
  $('currentSection').textContent=allViews[view];
  $('view').innerHTML='<div class="empty">Loading…</div>';
  try{
    if(view==='speak'||view==='spontaneous'){
      const kind=view==='speak'?'scripted':'spontaneous';
      if(state.mode!==kind||!state.sentences.length){await loadQueue(kind);}renderRecord();
    } else if(view==='listen') await loadReview('recordings');
    else if(view==='sentencereview')await loadReview('sentences');
    else if(view==='transcriptionreview')await loadReview('transcriptions');
    else if(view==='transcribe')await renderTranscribe();
    else if(view==='write')renderWrite();
    else if(view==='download')renderDownload();
    else if(view==='about')renderAbout();
  }catch(e){errorPanel(e);}
}
function errorPanel(e){$('view').innerHTML=`<div class="empty"><span class="empty-icon">!</span><h3>Unable to load this area</h3><p>${escapeHTML(e.message)}</p><button id="retryView" class="btn">Try again</button></div>`;$('retryView').onclick=()=>setView(state.view);}
async function loadQueue(kind){
  stopMedia();for(const old of state.drafts)if(old?.url)URL.revokeObjectURL(old.url);
  const payload=await api(kind==='scripted'?'/sentences?limit=5':'/prompts');
  state.sentences=kind==='scripted'?payload.sentences:payload.prompts;
  state.mode=kind;state.drafts=Array(state.sentences.length).fill(null);state.index=0;
}
function renderRecord(){
  const scripted=state.mode==='scripted',complete=state.index>=state.sentences.length;
  $('view').innerHTML=`${header(scripted?'Give your voice to':'Share a story in',scripted?'Read short sentences in your own voice. Each clip you contribute helps make speech technology more inclusive.':'Answer an open-ended question in your own words. You can record up to 90 seconds per response.',scripted?'the world.':'your own words.')}
  <div class="metric-row"><div class="metric"><strong>${fmtCount(stats.recordings)}</strong><span>Audio contributions</span></div><div class="metric"><strong>${fmtCount(stats.contributors)}</strong><span>Contributors</span></div><div class="metric"><strong>${fmtDuration(stats.approved_duration_ms)}</strong><span>Validated hours</span></div></div>
  ${complete?`<div class="workspace"><div class="workspace-top"><strong>Review your batch</strong><span class="chip">READY TO SUBMIT</span></div><div class="workspace-body"><p class="fine-print">Listen to the clips you recorded before donating them. All submissions enter the community review queue.</p><div class="queue-list">${state.sentences.map((s,i)=>`<div class="queue-item"><span class="number">${i+1}</span><div>${escapeHTML(s.text)}<small>${state.drafts[i]?.blob?'Recorded':'Skipped'}</small></div>${state.drafts[i]?.blob?`<audio controls preload="none" src="${state.drafts[i].url}"></audio>`:''}</div>`).join('')}</div><label class="checkbox-line"><input type="checkbox" id="cc0Consent"> <span>I recorded my own voice, no other person is identifiable without permission, and I voluntarily dedicate the selected recordings to the public domain under <a href="https://creativecommons.org/publicdomain/zero/1.0/" target="_blank" rel="noopener">CC0 1.0</a>. This cannot be undone for copies already downloaded.</span></label><div class="actions"><button class="btn secondary" id="redoBatch">Start over</button><button class="btn primary" id="sendBatch">Submit ${state.drafts.filter(x=>x?.blob).length} clip(s)</button></div><div class="feedback" role="alert" id="uploadFeedback"></div></div></div>`:
  `<div class="workspace"><div class="workspace-top"><strong>${scripted?'Read the sentence aloud':'Answer the question aloud'}</strong><span class="chip">ENGLISH · ${scripted?'SCRIPTED':'SPONTANEOUS'}</span></div><div class="workspace-body"><div class="counter">PROMPT ${state.index+1} OF ${state.sentences.length}</div><blockquote class="prompt-quote ${scripted?'':'smaller'}">“${escapeHTML(state.sentences[state.index].text)}”</blockquote>${waves()}<button id="recToggle" class="record-btn ${state.recording?'recording':''}" aria-label="${state.recording?'Stop recording':'Start recording'}">${state.recording?'■':'<svg width="29" height="29" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-4 0h8"/></svg>'}</button><div class="record-note" id="recordNote">${state.recording?'Recording — tap to stop (90 seconds maximum)':'Tap the microphone to start recording'}</div><div id="recPreview" class="actions"></div></div><div class="step-footer"><button id="skipPrompt">Skip prompt →</button>${markers()}<span class="form-caption">${state.index+1}/${state.sentences.length}</span></div></div>`}
  ${info()}`;
  if(complete){$('redoBatch').onclick=()=>loadQueue(state.mode).then(renderRecord).catch(errorPanel);$('sendBatch').onclick=submitBatch;}
  else {$('recToggle').onclick=toggleRecording;$('skipPrompt').onclick=()=>{state.index++;renderRecord();};if(state.drafts[state.index])showClipPreview();}
}
function stopMedia(){if(state.stream){for(const track of state.stream.getTracks())track.stop();state.stream=null;}state.recording=false;}
async function toggleRecording(){
  if(state.recording){state.recorder?.stop();return;}
  if(!guard())return;
  if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){toast('A supported browser on HTTPS or localhost is required for microphone capture.',true);return;}
  const mime=['audio/webm;codecs=opus','audio/webm','audio/ogg;codecs=opus','audio/mp4'].find(type=>MediaRecorder.isTypeSupported(type));
  if(!mime){toast('This browser does not support a compatible recording format.',true);return;}
  try{
    state.stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:false});
    const pieces=[],recorder=new MediaRecorder(state.stream,{mimeType:mime,audioBitsPerSecond:48000});
    state.recorder=recorder;state.start=Date.now();state.recording=true;
    recorder.ondataavailable=e=>{if(e.data.size>0)pieces.push(e.data);};
    const index=state.index;
    recorder.onstop=()=>{
      const duration=Date.now()-state.start;
      const type=recorder.mimeType.split(';')[0];
      stopMedia();if(state.view!=='speak'&&state.view!=='spontaneous')return;
      const blob=new Blob(pieces,{type});
      if(duration<500||blob.size<128){toast('Recording is too short. Try again.',true);renderRecord();return;}
      if(blob.size>4*1024*1024){toast('Recording is too large (4 MB max). Try a shorter clip.',true);renderRecord();return;}
      if(state.drafts[index]?.url)URL.revokeObjectURL(state.drafts[index].url);
      state.drafts[index]={blob,url:URL.createObjectURL(blob),duration};
      renderRecord();
    };
    recorder.start();renderRecord();
    setTimeout(()=>{if(recorder.state==='recording')recorder.stop();},90_000);
  }catch(err){stopMedia();toast('Microphone access was denied or unavailable: '+err.message,true);}
}
function showClipPreview(){
  const draft=state.drafts[state.index];if(!draft)return;
  $('recPreview').innerHTML=`<audio controls preload="none" src="${draft.url}"></audio><button id="nextPrompt" class="btn primary">Save & next →</button><button id="discardClip" class="btn secondary">Re-record</button>`;
  $('nextPrompt').onclick=()=>{state.index++;renderRecord();};
  $('discardClip').onclick=()=>{URL.revokeObjectURL(draft.url);state.drafts[state.index]=null;renderRecord();};
}
async function submitBatch(){
  if(!guard())return;
  if(!$('cc0Consent').checked){toast('Explicit CC0 consent is required before submitting.',true);return;}
  const clips=state.drafts.map((x,i)=>({x,i})).filter(({x})=>x?.blob);
  if(!clips.length){toast('Record at least one clip before submitting.',true);return;}
  $('sendBatch').disabled=true;let done=0;
  for(const {x,i} of clips){
    try{
      await api('/recordings',{method:'POST',body:x.blob,headers:{'content-type':x.blob.type,'x-voice-kind':state.mode,'x-voice-target':state.sentences[i].id,'x-voice-consent':'cc0','x-voice-duration-ms':String(x.duration)}});
      done++;URL.revokeObjectURL(x.url);state.drafts[i]=null;
    } catch(e){$('uploadFeedback').textContent=`${done} uploaded; could not upload the remaining clips: ${e.message}. You may retry.`;$('sendBatch').disabled=false;toast(e.message,true);return;}
  }
  toast(`${done} recording(s) saved. Thank you for contributing!`);
  try{stats=await api('/stats');await loadQueue(state.mode);renderRecord();}catch(e){errorPanel(e);}
}
async function loadReview(type){
  const paths={recordings:'/recordings/next?kind='+state.reviewKind,sentences:'/sentences/review',transcriptions:'/transcriptions/review'};
  const toggle=type==='recordings'?`<div class="actions" style="justify-content:flex-start"><button class="btn ${state.reviewKind==='scripted'?'primary':'secondary'}" data-kind="scripted">Scripted audio</button><button class="btn ${state.reviewKind==='spontaneous'?'primary':'secondary'}" data-kind="spontaneous">Spontaneous audio</button></div>`:'';
  const attachToggle=()=>document.querySelectorAll('[data-kind]').forEach(button=>button.onclick=()=>{state.reviewKind=button.dataset.kind;loadReview('recordings').catch(errorPanel);});
  if(!state.user){$('view').innerHTML=`${header('Help check',type==='recordings'?'Listen to clips submitted by other people and decide whether they match the sentence.':'Support dataset quality by reviewing contributions.','quality together.')}${restricted()}`;return;}
  const exclude=[...state.skipped[type]].join(',');
  const result=await api(paths[type]+(exclude?(paths[type].includes('?')?'&':'?')+'exclude='+encodeURIComponent(exclude):''));state.currentReview=result.item;
  if(!result.item){$('view').innerHTML=`${header(type==='sentences'?'Review submitted':'Listen and review',type==='sentences'?'Help select high-quality sentences for future recordings.':'Give another contributor’s voice an independent quality check.','contributions.')}${toggle}${empty('All caught up!','No eligible items are waiting for your review. Check back as more people contribute.')}`;attachToggle();return;}
  const item=result.item;
  $('view').innerHTML=`${header(type==='sentences'?'Review sentences':type==='transcriptions'?'Review transcriptions':'Listen to others',type==='sentences'?'Approve useful, original, readable sentences.':'Listen carefully and vote only if you can make a clear judgment.','with care.')}
  ${toggle}<div class="workspace"><div class="workspace-top"><strong>${type==='sentences'?'Is this clear, original and appropriate?':type==='transcriptions'?'Does the transcript accurately match the audio?':'Does the voice clearly match the sentence?'}</strong><span class="chip">COMMUNITY VALIDATION</span></div><div class="workspace-body"><div class="counter">INDEPENDENT REVIEW</div><blockquote class="prompt-quote smaller">“${escapeHTML(item.text)}”</blockquote>${item.audio_url?`<audio controls class="audio-player" preload="none" src="${escapeHTML(item.audio_url)}"></audio>`:''}<div class="review-meta">${type==='sentences'?'Text contribution':'Audio contribution'} · English · CC0 1.0</div><div class="vote-buttons"><button class="btn primary" data-vote="yes">✓ Yes</button><button class="btn danger" data-vote="no">✕ No</button><button class="btn secondary" id="skipReview">Skip →</button></div>${type==='recordings'?`<div class="report-row"><button id="flagReview">Flag inappropriate audio</button></div>`:''}</div></div>${info()}`;
  attachToggle();
  document.querySelectorAll('[data-vote]').forEach(b=>b.onclick=async()=>{
    b.disabled=true;
    try{await api(type==='recordings'?'/recordings/review':type==='sentences'?'/sentences/review':'/transcriptions/review',{method:'POST',body:{id:item.id,vote:b.dataset.vote}});toast('Review recorded. Thank you!');await loadReview(type);}catch(e){toast(e.message,true);b.disabled=false;}
  });
  $('skipReview').onclick=()=>{state.skipped[type].add(item.id);loadReview(type).catch(errorPanel);};
  if(type==='recordings')$('flagReview').onclick=async()=>{const reason=prompt('Why are you reporting this audio?\nChoose: personal information, hate or harassment, unsafe or inappropriate audio, copyright concern, other');if(!reason)return;try{await api('/recordings/report',{method:'POST',body:{id:item.id,reason}});toast('Recording flagged for moderation.');await loadReview(type);}catch(e){toast(e.message,true);}};
}
function restricted(){return `<div class="workspace"><div class="empty"><span class="empty-icon">♙</span><h3>Join the contributor community</h3><p>Create a free account or sign in to contribute recordings, reviews and transcripts.</p><button id="authRequired" class="btn primary">Log in / Sign up</button></div></div>`;}
function empty(title,msg){return `<div class="workspace"><div class="empty"><span class="empty-icon">✦</span><h3>${escapeHTML(title)}</h3><p>${escapeHTML(msg)}</p><button class="btn secondary" id="refreshEmpty">Refresh</button></div></div>`;}
function renderWrite(){
  $('view').innerHTML=`${header('Words worth','Language needs words that reflect everyday life. Submit original English sentences for community review.','speaking.')}
  <div class="workspace"><div class="workspace-top"><strong>Contribute a sentence</strong><span class="chip">ENGLISH</span></div><div class="workspace-body"><form class="form-stack" id="sentenceForm"><label>Your original sentence<textarea name="sentence" minlength="20" maxlength="240" placeholder="Write a clear, natural sentence (20–240 characters)." required></textarea></label><div class="form-caption">Avoid names, personal information, quotations, song lyrics and copyrighted material. End your sentence with punctuation.</div><label class="checkbox-line"><input type="checkbox" name="consent" required> <span>I created this text and dedicate it to the public domain under CC0 1.0.</span></label><button class="btn primary" type="submit">Submit for review</button><div class="feedback" id="writeFeedback" role="alert"></div></form></div></div>${info()}`;
  $('sentenceForm').onsubmit=async e=>{e.preventDefault();if(!guard())return;const f=e.currentTarget;try{await api('/sentences',{method:'POST',body:{text:f.elements.sentence.value,consent:f.elements.consent.checked}});$('writeFeedback').classList.add('success');$('writeFeedback').textContent='Sentence submitted for independent review.';f.reset();}catch(err){$('writeFeedback').textContent=err.message;}};
}
async function renderTranscribe(){
  const title=header('Turn stories into','Listen to approved spontaneous-speech recordings and transcribe exactly what was said.','text.');
  if(!state.user){$('view').innerHTML=title+restricted();return;}
  const {item}=await api('/transcriptions/next');if(!item){$('view').innerHTML=title+empty('No clips to transcribe','New approved spontaneous recordings will appear here.');return;}
  $('view').innerHTML=`${title}<div class="workspace"><div class="workspace-top"><strong>Listen and transcribe</strong><span class="chip">OPEN SPEECH</span></div><div class="workspace-body"><p class="fine-print">The contributor was asked: “${escapeHTML(item.prompt_text)}”</p><audio controls class="audio-player" src="${escapeHTML(item.audio_url)}"></audio><form class="form-stack" id="transcribeForm"><label>Exact words you hear<textarea required maxlength="2000" minlength="5" id="transcriptText" placeholder="Type what you hear, including natural wording…"></textarea></label><label class="checkbox-line"><input type="checkbox" id="transcriptConsent" required> <span>I produced this transcript and dedicate it under CC0 1.0.</span></label><button class="btn primary" type="submit">Submit transcript</button><div class="feedback" id="transcribeFeedback" role="alert"></div></form></div></div>`;
  $('transcribeForm').onsubmit=async e=>{e.preventDefault();try{await api('/transcriptions',{method:'POST',body:{recording_id:item.id,text:$('transcriptText').value,consent:$('transcriptConsent').checked}});toast('Transcript submitted for review.');await renderTranscribe();}catch(err){$('transcribeFeedback').textContent=err.message;}};
}
function renderDownload(){
  $('view').innerHTML=`${header('Open data for','Only independently validated contributions are released. Download small CC0 sample archives with CSV metadata.','open discovery.')}
  <div class="dataset-grid"><div class="dataset-card"><span class="tag">CC0 · ENGLISH</span><h3>Scripted Speech</h3><p>Read-aloud sentences with two independent positive validations and no negative votes at acceptance.</p><a href="/api/datasets/export?kind=scripted" class="btn primary" download>↓ Download ZIP sample</a></div><div class="dataset-card"><span class="tag">CC0 · ENGLISH</span><h3>Spontaneous Speech</h3><p>Freely spoken answers, plus separately validated transcriptions when available.</p><a href="/api/datasets/export?kind=spontaneous" class="btn primary" download>↓ Download ZIP sample</a></div></div>
  <div class="terms-note" style="margin-top:22px"><strong>Dataset release policy:</strong> Each sample archive contains at most ten validated clips. Metadata and the CC0 dedication are included. No account email or display name is exported. Flagged, rejected or pending recordings are excluded. Production-scale full dataset packaging and takedown operations require additional infrastructure and policy review.</div>${info()}`;
}
function renderAbout(){
  $('view').innerHTML=`${header('Every voice','Magnexis Voice is an independently developed community speech dataset project inspired by open participatory data collection.','matters.')}
  <div class="workspace"><div class="workspace-top"><strong>Our contribution workflow</strong><span class="chip">INDEPENDENT PROJECT</span></div><div class="workspace-body"><div class="form-stack"><h3>1. Speak</h3><p class="fine-print">Read one of our original English sentences or answer an open-ended prompt. Record locally and review before submitting.</p><h3>2. Listen</h3><p class="fine-print">Different users independently validate clips. Self-validation and duplicate votes are blocked. Reported recordings are quarantined from downloads.</p><h3>3. Write and transcribe</h3><p class="fine-print">Submit original text or transcribe approved spontaneous responses. Both require independent review before inclusion.</p><h3>4. Share openly</h3><p class="fine-print">Only approved contributions enter the downloadable, CC0 1.0 public-domain sample datasets. Contributions are voluntary and public-domain dedication cannot be revoked for copies already distributed.</p><hr class="separator"><h3>Privacy and responsible participation</h3><p class="fine-print">Do not record another person without permission or reveal private information. Do not contribute copyrighted words or audio unless you own the necessary rights. Recordings may reveal accents and personal characteristics. We currently support English and account-based contributions. Magnexis SSO and email verification have not been enabled.</p></div></div></div>`;
}
function openAuth(){$('authDialog').showModal();}
let registering=false;
function setAuthMode(mode){registering=mode==='register';$('loginTab').classList.toggle('selected',!registering);$('registerTab').classList.toggle('selected',registering);$('nameLabel').hidden=!registering;$('termsLabel').hidden=!registering;$('authName').required=registering;$('authTerms').required=registering;$('authSubmit').textContent=registering?'Create account':'Log in';$('authPassword').autocomplete=registering?'new-password':'current-password';$('authFeedback').textContent='';}
function updateAuth(){const logged=!!state.user;$('userGreeting').textContent=logged?`Hello, ${state.user.display_name}`:'';$('authBtn').textContent=logged?'Log out':'Log in / Sign up';}
async function init(){
  document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
  $('menuToggle').onclick=()=>{const open=$('mainNav').classList.toggle('open');$('menuToggle').setAttribute('aria-expanded',String(open));};
  $('authBtn').onclick=async()=>{if(!state.user){openAuth();return;}try{await api('/auth/logout',{method:'POST',body:{}});state.user=null;updateAuth();toast('Signed out');setView(state.view);}catch(e){toast(e.message,true);}};
  $('closeDialog').onclick=()=>$('authDialog').close();
  $('loginTab').onclick=()=>setAuthMode('login');$('registerTab').onclick=()=>setAuthMode('register');
  $('authForm').onsubmit=async e=>{e.preventDefault();try{const b={email:$('authEmail').value,password:$('authPassword').value};if(registering){b.display_name=$('authName').value;b.terms=$('authTerms').checked;}const result=await api(registering?'/auth/register':'/auth/login',{method:'POST',body:b});state.user=result.user;updateAuth();$('authDialog').close();$('authForm').reset();toast('Welcome to Magnexis Voice!');setView(state.view);}catch(err){$('authFeedback').textContent=err.message;}};
  document.body.addEventListener('click',e=>{if(e.target.id==='authRequired')openAuth();if(e.target.id==='refreshEmpty')setView(state.view);});
  try{const r=await Promise.all([api('/auth/me'),api('/stats')]);state.user=r[0].user;stats=r[1];}catch(e){toast('API is unavailable; recordings require the backend.',true);}updateAuth();await setView('speak');
}
init();
