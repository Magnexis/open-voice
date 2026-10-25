import {copyFile,mkdir} from 'node:fs/promises';
await mkdir('public/assets',{recursive:true});
for(const [a,b] of [['docs/visual-smoke-desktop.png','public/assets/voice-ui-desktop.png'],['docs/visual-smoke-mobile.png','public/assets/voice-ui-mobile.png'],['docs/visual-smoke-desktop.png','public/assets/social-preview.png']])await copyFile(a,b);
console.log('Magnexis Voice image assets prepared.');
