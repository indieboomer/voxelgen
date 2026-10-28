const {app,BrowserWindow,protocol,ipcMain,dialog,session,safeStorage}=require('electron');
const path=require('node:path');const fs=require('node:fs/promises');
const {capabilities,configure,generateImage}=require('./image-service.cjs');
protocol.registerSchemesAsPrivileged([{scheme:'workshop',privileges:{standard:true,secure:true,supportFetchAPI:true,corsEnabled:true,stream:true}}]);
const assets=path.resolve(__dirname,'../dist');let win;
app.setName('Voxel Generator Workshop');
if(process.argv.includes('--qa')&&process.env.VOXELGEN_QA_PROFILE){require('node:fs').mkdirSync(process.env.VOXELGEN_QA_PROFILE,{recursive:true});app.setPath('userData',path.resolve(process.env.VOXELGEN_QA_PROFILE));}
let imageController;
app.whenReady().then(async()=>{
 const settingsPath=path.join(app.getPath('userData'),'ai-connection.json');
 try{const saved=JSON.parse(await fs.readFile(settingsPath,'utf8'));configure({model:saved.model});if(saved.key){const decrypted=await safeStorage.decryptStringAsync(Buffer.from(saved.key,'base64'));configure({apiKey:decrypted.result});}}catch{ /* First run or no saved key. Environment remains available. */ }

 protocol.handle('workshop',async request=>{
  const url=new URL(request.url);if(url.host!=='app')return new Response('Not found',{status:404});
  const target=path.resolve(assets,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
  if(!target.startsWith(assets+path.sep))return new Response('Forbidden',{status:403});
  try{const bytes=await fs.readFile(target);const type={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.json':'application/json','.zip':'application/zip','.rs':'text/plain'}[path.extname(target)]||'application/octet-stream';return new Response(bytes,{headers:{'Content-Type':type,'Content-Security-Policy':"default-src 'self'; script-src 'self'; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'self'"}});}catch{return new Response('Not found',{status:404});}
 });
 const trusted=event=>{if(event.senderFrame?.url.split('/').slice(0,3).join('/')!=='workshop://app')throw Error('Untrusted window');};
 ipcMain.handle('reference:capabilities',event=>{trusted(event);return capabilities();});
 ipcMain.handle('reference:configure',async(event,settings)=>{trusted(event);const result=configure(settings);let saved={};try{saved=JSON.parse(await fs.readFile(settingsPath,'utf8'));}catch{}let storage='session';if(settings.apiKey)delete saved.key;if(settings.apiKey&&await safeStorage.isAsyncEncryptionAvailable()){const key=await safeStorage.encryptStringAsync(settings.apiKey.trim());saved.key=key.toString('base64');}saved.model=result.model;await fs.mkdir(path.dirname(settingsPath),{recursive:true});await fs.writeFile(settingsPath,JSON.stringify(saved));if(saved.key)storage='encrypted on this Windows account';return {...result,storage};});
 ipcMain.handle('reference:cancel',event=>{trusted(event);imageController?.abort();});
 ipcMain.handle('reference:image',async(event,prompt)=>{trusted(event);if(imageController)throw Error('An image request is already running.');imageController=new AbortController();let result;try{result=await generateImage(prompt,{signal:imageController.signal});}finally{imageController=undefined;}const folder=path.join(app.getPath('userData'),'references');await fs.mkdir(folder,{recursive:true});const name=Date.now().toString();await fs.writeFile(path.join(folder,name+'.png'),Buffer.from(result.image.split(',')[1],'base64'));await fs.writeFile(path.join(folder,name+'.json'),JSON.stringify(result.provenance,null,2));return result;});
 ipcMain.handle('export:save',async(event,{name,bytes})=>{trusted(event);if(typeof name!=='string'||!Array.isArray(bytes)||bytes.length>64*1024*1024)throw Error('Invalid export');const result=await dialog.showSaveDialog(win,{defaultPath:path.basename(name)});if(result.canceled||!result.filePath)return false;await fs.writeFile(result.filePath,Buffer.from(bytes));return true;});
 session.defaultSession.setPermissionRequestHandler((_w,_permission,callback)=>callback(false));
 win=new BrowserWindow({width:1500,height:1050,minWidth:850,minHeight:640,title:'Voxel Generator Workshop',backgroundColor:'#0c1317',show:false,webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
 win.removeMenu();win.webContents.setWindowOpenHandler(()=>({action:'deny'}));win.webContents.on('will-navigate',(event,url)=>{if(!url.startsWith('workshop://app/'))event.preventDefault();});
 win.once('ready-to-show',()=>{if(!process.argv.includes('--smoke')&&!process.argv.includes('--qa'))win.show();});await win.loadURL('workshop://app/');
 if(process.argv.includes('--smoke'))setTimeout(()=>app.quit(),1500);
});
app.on('window-all-closed',()=>app.quit());
