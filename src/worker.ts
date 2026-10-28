import {search,type Mode} from './search/index.js';
import type {Family,Recipe,Voxels} from './runtime/index.js';
let stopped=false;self.onmessage=async(e:MessageEvent<{action:string;family:Family;mode:Mode;budget:number;targets?:Voxels[];starter?:Recipe}>)=>{if(e.data.action==='stop'){stopped=true;return;}stopped=false;for(const state of search(e.data.family,e.data.mode,e.data.budget,123,e.data.targets,e.data.starter)){if(stopped){postMessage({stopped:true});return;}postMessage(state);await new Promise(r=>setTimeout(r,0));}postMessage({done:true});};
