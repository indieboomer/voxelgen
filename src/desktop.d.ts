export {};
declare global {interface Window {workshop?:{desktop:boolean;capabilities:()=>Promise<{aiImage:boolean;model:string}>;generateImage:(prompt:string)=>Promise<{image:string;provenance:Record<string,unknown>}>;save:(name:string,bytes:number[])=>Promise<boolean>};}}
