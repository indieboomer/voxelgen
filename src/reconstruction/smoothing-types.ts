export type Vec3=[number,number,number];
export type RegionBox={min:Vec3;max:Vec3};
export type SurfaceStroke={center:Vec3;radius:number;mode:'smooth'|'protect'};
export type SmoothingSettings={enabled:boolean;scope:'auto'|'selected';strength:number;maxShift:number;featureAngle:number;preserveThin:boolean;region:RegionBox;protectedRegions:RegionBox[];strokes:SurfaceStroke[]};
export const defaultSmoothing=():SmoothingSettings=>({enabled:false,scope:'auto',strength:1,maxShift:.5,featureAngle:35,preserveThin:true,region:{min:[0,.6,0],max:[1,1,1]},protectedRegions:[],strokes:[]});
export type SmoothingStats={method:'silhouette-guided dual contouring';applied:boolean;vertices:number;planes:number;curves:number;creases:number;corners:number;protected:number;thinProtected:number;fallbackEdges:number;repairedVertices:number;maxShiftVoxels:number;maxSilhouetteErrorVoxels:number;fallbackReason?:string};
export function smoothingSettings(raw?:Partial<SmoothingSettings>):SmoothingSettings{
 const s={...defaultSmoothing(),...raw};const box=(b:RegionBox)=>b&&Array.isArray(b.min)&&Array.isArray(b.max)&&b.min.length===3&&b.max.length===3&&b.min.every((x,i)=>Number.isFinite(x)&&x>=0&&x<=1&&Number.isFinite(b.max[i])&&b.max[i]>=x&&b.max[i]<=1);
 if(!['auto','selected'].includes(s.scope)||!Number.isFinite(s.strength)||s.strength<0||s.strength>1||!Number.isFinite(s.maxShift)||s.maxShift<0||s.maxShift>.5||!Number.isFinite(s.featureAngle)||s.featureAngle<15||s.featureAngle>80||!box(s.region)||!Array.isArray(s.protectedRegions)||s.protectedRegions.length>32||!s.protectedRegions.every(box)||!Array.isArray(s.strokes)||s.strokes.length>2000||!s.strokes.every(p=>p&&['smooth','protect'].includes(p.mode)&&p.center.length===3&&p.center.every(x=>Number.isFinite(x)&&x>=-.1&&x<=1.1)&&Number.isFinite(p.radius)&&p.radius>0&&p.radius<=.5))throw Error('Invalid surface smoothing settings.');
 return s;
}
