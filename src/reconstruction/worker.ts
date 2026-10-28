import {chestViews} from './chest-demo.js';
import {demoViews} from './demo.js';
import {prepareView} from './background.js';
import {reconstruct} from './core.js';
import {projectionMesh} from './texture.js';
self.onmessage=e=>{const {id,action,input,views,options}=e.data;try{
 if(action==='demo'){self.postMessage({id,result:demoViews(192,e.data.viewMode==='six')});return;}
 if(action==='chest-demo'){self.postMessage({id,result:chestViews()});return;}
 if(action==='prepare'){self.postMessage({id,result:prepareView(input)});return;}
 const result=reconstruct(views,options,fraction=>self.postMessage({id,progress:fraction*.7,label:'Carving silhouette intersections'}));
 const mesh=projectionMesh(result,fraction=>self.postMessage({id,progress:.7+fraction*.3,label:options.smoothing?.enabled?'Fitting protected surface and source colors':'Projecting surface colors'}));
 self.postMessage({id,result:{reconstruction:result,mesh}});
}catch(error){self.postMessage({id,error:String(error)});}};
