const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('workshop',{desktop:true,capabilities:()=>ipcRenderer.invoke('reference:capabilities'),generateImage:prompt=>ipcRenderer.invoke('reference:image',prompt),save:(name,bytes)=>ipcRenderer.invoke('export:save',{name,bytes})});
