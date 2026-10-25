const { app, BrowserWindow, session, shell, dialog } = require('electron');
const DEV = process.env.NODE_ENV === 'development';
const baseURL = process.env.MAGNEXIS_VOICE_URL || 'http://localhost:8888';
const target = new URL(baseURL);
if ((!DEV && target.protocol !== 'https:') && target.hostname !== 'localhost' && target.hostname !== '127.0.0.1') throw Error('A deployed Magnexis Voice URL must use HTTPS');
const trustedOrigin = target.origin;
let window;
function isTrusted(url) { try{return new URL(url).origin === trustedOrigin;}catch{return false;} }
app.whenReady().then(()=>{
  session.defaultSession.setPermissionCheckHandler((contents,permission,requestingOrigin)=>permission==='media' && isTrusted(requestingOrigin));
  session.defaultSession.setPermissionRequestHandler((contents,permission,callback,details)=>{
    callback(permission === 'media' && isTrusted(details.requestingUrl || contents.getURL()));
  });
  window = new BrowserWindow({width:1350,height:890,minWidth:750,minHeight:550,title:'Magnexis Voice v1.25',autoHideMenuBar:true,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true,webviewTag:false}});
  window.webContents.setWindowOpenHandler(({url})=>{if(url.startsWith('https://creativecommons.org/')) shell.openExternal(url);return {action:'deny'};});
  window.webContents.on('will-navigate',(event,url)=>{if(!isTrusted(url))event.preventDefault();});
  window.loadURL(baseURL).catch(err=>dialog.showErrorBox('Magnexis Voice connection error',`${err.message}\n\nLaunch the local server or set MAGNEXIS_VOICE_URL to the deployed HTTPS service.`));
});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});
app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)app.relaunch();});
